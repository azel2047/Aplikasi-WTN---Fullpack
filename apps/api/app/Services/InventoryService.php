<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Ingredient;
use App\Models\InventoryMovement;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Recipe;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    /**
     * Deduct ingredients atomically for a confirmed/paid order.
     * Enforces:
     * - AC-17: Products without validated recipes do not deduct stock automatically.
     * - AC-18: Stock deduction happens at most once per order (idempotent).
     * - AC-19: Normal transactions must not make stock negative.
     * - AC-20: Inventory movements store source and actor.
     */
    public function deductStockForOrder(Order $order, string $actorName, bool $allowOverride = false): Order
    {
        return DB::transaction(function () use ($order, $actorName, $allowOverride) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->stock_deducted) {
                return $lockedOrder;
            }

            $lockedOrder->load(['items.product.recipe.items.ingredient']);

            // Aggregate total required quantity per ingredient across all items in the order
            $requirements = []; // ingredient_id => ['qty' => float, 'items' => []]
            $itemCogsMap = [];  // order_item_id => int unit_cogs

            foreach ($lockedOrder->items as $orderItem) {
                $product = $orderItem->product;
                if (!$product || !$product->track_inventory) {
                    $itemCogsMap[$orderItem->id] = 0;
                    continue;
                }

                $recipe = Recipe::with('items.ingredient')
                    ->where('product_id', $product->id)
                    ->where('is_validated', true)
                    ->first();

                if (!$recipe || $recipe->items->isEmpty()) {
                    // AC-17: Product without validated recipe does not automatically deduct stock
                    $itemCogsMap[$orderItem->id] = 0;
                    continue;
                }

                $unitCogs = 0;
                foreach ($recipe->items as $rItem) {
                    $ingId = $rItem->ingredient_id;
                    $neededForOne = (float) $rItem->quantity;
                    $neededTotal = $neededForOne * (int) $orderItem->quantity;

                    if (!isset($requirements[$ingId])) {
                        $requirements[$ingId] = 0.0;
                    }
                    $requirements[$ingId] += $neededTotal;

                    if ($rItem->ingredient) {
                        $unitCogs += $neededForOne * (float) $rItem->ingredient->average_cost_per_base_unit;
                    }
                }
                $itemCogsMap[$orderItem->id] = (int) round($unitCogs);
            }

            if (empty($requirements)) {
                $lockedOrder->update([
                    'stock_deducted' => true,
                    'stock_deducted_at' => now(),
                    'cogs_amount' => 0,
                ]);
                return $lockedOrder;
            }

            // Lock all required ingredients in deterministic ID order to prevent deadlocks
            ksort($requirements);
            $lockedIngredients = [];
            $insufficientMessages = [];

            foreach ($requirements as $ingId => $neededQty) {
                $ingredient = Ingredient::where('id', $ingId)->lockForUpdate()->firstOrFail();
                $lockedIngredients[$ingId] = $ingredient;

                if ((float) $ingredient->current_stock < $neededQty && !$allowOverride) {
                    $insufficientMessages[] = sprintf(
                        'Stok bahan "%s" tidak mencukupi (tersedia: %s %s, dibutuhkan: %s %s).',
                        $ingredient->name,
                        number_format((float) $ingredient->current_stock, 0, ',', '.'),
                        $ingredient->base_unit,
                        number_format($neededQty, 0, ',', '.'),
                        $ingredient->base_unit
                    );
                }
            }

            if (!empty($insufficientMessages)) {
                throw ValidationException::withMessages([
                    'stock' => $insufficientMessages,
                ]);
            }

            $totalOrderCogs = 0;

            foreach ($requirements as $ingId => $neededQty) {
                /** @var Ingredient $ingredient */
                $ingredient = $lockedIngredients[$ingId];
                $before = (float) $ingredient->current_stock;
                $after = max(0.0, $before - $neededQty);
                $unitCost = (float) $ingredient->average_cost_per_base_unit;
                $totalCost = (int) round($neededQty * $unitCost);
                $totalOrderCogs += $totalCost;

                $ingredient->update([
                    'current_stock' => $after,
                ]);

                InventoryMovement::create([
                    'ingredient_id' => $ingredient->id,
                    'movement_type' => 'ORDER_DEDUCTION',
                    'direction' => 'OUT',
                    'quantity' => $neededQty,
                    'stock_before' => $before,
                    'stock_after' => $after,
                    'unit_cost_snapshot' => (int) round($unitCost),
                    'total_cost_snapshot' => $totalCost,
                    'reference_type' => 'Order',
                    'reference_id' => $lockedOrder->id,
                    'notes' => "Pemakaian resep untuk Order {$lockedOrder->order_number}",
                    'actor_name' => $actorName,
                ]);

                // Create low-stock notification if threshold reached
                if ($after <= (float) $ingredient->minimum_stock) {
                    Notification::create([
                        'target_role' => 'owner',
                        'type' => 'LOW_STOCK',
                        'title' => $after <= 0 ? "Bahan Habis: {$ingredient->name}" : "Stok Menipis: {$ingredient->name}",
                        'message' => "Sisa stok {$ingredient->name} saat ini {$ingredient->display_current_stock} {$ingredient->display_unit}.",
                        'reference_code' => $ingredient->code,
                    ]);
                }
            }

            foreach ($lockedOrder->items as $orderItem) {
                if (isset($itemCogsMap[$orderItem->id])) {
                    $orderItem->update(['unit_cogs_snapshot' => $itemCogsMap[$orderItem->id]]);
                }
            }

            $lockedOrder->update([
                'stock_deducted' => true,
                'stock_deducted_at' => now(),
                'cogs_amount' => $totalOrderCogs,
            ]);

            return $lockedOrder;
        });
    }

    /**
     * Restore stock via recorded reversal movement if a confirmed order is cancelled/refunded before consumption.
     */
    public function restoreStockForCancelledOrder(Order $order, string $actorName, string $reason): Order
    {
        return DB::transaction(function () use ($order, $actorName, $reason) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if (!$lockedOrder->stock_deducted || $lockedOrder->stock_restored) {
                return $lockedOrder;
            }

            $movements = InventoryMovement::where('reference_type', 'Order')
                ->where('reference_id', $lockedOrder->id)
                ->where('movement_type', 'ORDER_DEDUCTION')
                ->get();

            foreach ($movements as $mov) {
                $ingredient = Ingredient::where('id', $mov->ingredient_id)->lockForUpdate()->first();
                if (!$ingredient) {
                    continue;
                }
                $before = (float) $ingredient->current_stock;
                $qty = (float) $mov->quantity;
                $after = $before + $qty;

                $ingredient->update(['current_stock' => $after]);

                InventoryMovement::create([
                    'ingredient_id' => $ingredient->id,
                    'movement_type' => 'ORDER_RESTORE',
                    'direction' => 'IN',
                    'quantity' => $qty,
                    'stock_before' => $before,
                    'stock_after' => $after,
                    'unit_cost_snapshot' => $mov->unit_cost_snapshot,
                    'total_cost_snapshot' => $mov->total_cost_snapshot,
                    'reference_type' => 'Order',
                    'reference_id' => $lockedOrder->id,
                    'notes' => "Pengembalian stok pembatalan Order {$lockedOrder->order_number}: {$reason}",
                    'actor_name' => $actorName,
                ]);
            }

            $lockedOrder->update([
                'stock_restored' => true,
                'cogs_amount' => 0,
            ]);

            AuditLog::record(
                'STOCK_RESTORE_ON_CANCEL',
                $actorName,
                'employee',
                'Order',
                $lockedOrder->id,
                "Mengembalikan stok bahan baku untuk Order {$lockedOrder->order_number} karena pembatalan: {$reason}"
            );

            return $lockedOrder;
        });
    }
}
