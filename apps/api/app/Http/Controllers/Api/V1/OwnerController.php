<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CashAccount;
use App\Models\CashClosing;
use App\Models\CashTransaction;
use App\Models\Category;
use App\Models\DiningTable;
use App\Models\EmployeeProfile;
use App\Models\EmployeeReport;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Ingredient;
use App\Models\IngredientCategory;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\ProductOptionValue;
use App\Models\Rating;
use App\Models\Recipe;
use App\Models\RecipeItem;
use App\Models\StockAdjustment;
use App\Models\StockPurchase;
use App\Models\StockPurchaseItem;
use App\Models\SystemSetting;
use App\Models\TableSession;
use App\Models\TrafficEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OwnerController extends Controller
{
    /**
     * GET /api/v1/owner/dashboard
     * Real data overview: today's revenue, paid order count, AOV, cash balance (labeled not profit),
     * hourly revenue chart (08:00-22:00), top products, low stock alerts, active tables, and latest ratings.
     */
    public function dashboard(Request $request)
    {
        $date = $request->input('date', now()->toDateString());

        $todayOrders = Order::whereDate('created_at', $date)->get();
        $paidToday = $todayOrders->where('payment_status', 'PAID');

        $allPaidOrders = Order::where('payment_status', 'PAID')->get();
        $todayRevenue = (int) $paidToday->sum('total_amount');
        $todayPaidCount = $paidToday->count();
        $todayPendingCount = $todayOrders->where('payment_status', '!=', 'PAID')->where('status', '!=', 'CANCELLED')->count();
        $todayCancelledCount = $todayOrders->where('status', 'CANCELLED')->count();
        $todayAov = $todayPaidCount > 0 ? (int) round($todayRevenue / $todayPaidCount) : 0;

        $totalCashBalance = (int) CashAccount::where('is_active', true)->sum('current_balance');

        // Hourly revenue & order distribution (08:00 to 22:00) from actual recorded orders
        $hourly = [];
        for ($h = 8; $h <= 22; $h++) {
            $hourKey = sprintf('%02d:00', $h);
            $hourly[$hourKey] = [
                'hour' => sprintf('%02d.00', $h),
                'short_hour' => sprintf('%02d', $h),
                'revenue' => 0,
                'orders_count' => 0,
            ];
        }

        foreach ($paidToday as $ord) {
            $h = (int) $ord->created_at->format('G');
            if ($h >= 8 && $h <= 22) {
                $key = sprintf('%02d:00', $h);
                $hourly[$key]['revenue'] += (int) $ord->total_amount;
                $hourly[$key]['orders_count'] += 1;
            }
        }

        // Top products from actual paid orders
        $topProducts = OrderItem::select(
            'product_name_snapshot as name',
            DB::raw('SUM(quantity) as total_qty'),
            DB::raw('SUM(line_total) as total_revenue')
        )
            ->whereHas('order', fn ($q) => $q->where('payment_status', 'PAID'))
            ->groupBy('product_name_snapshot')
            ->orderByDesc('total_qty')
            ->limit(6)
            ->get();

        // Low stock / out of stock ingredients
        $ingredients = Ingredient::with('category')->where('is_active', true)->get();
        $lowStockIngredients = $ingredients->filter(fn ($i) => in_array($i->stock_status, ['MENIPIS', 'HABIS']))->values();

        // Tables status
        $tables = DiningTable::with('activeSession')->orderBy('code')->get();

        // Recent orders
        $recentOrders = Order::with(['items', 'diningTable', 'latestPayment'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        // Latest employee reports & ratings
        $pendingReportsCount = EmployeeReport::where('status', 'submitted')->count();
        $avgRating = round((float) Rating::avg('stars'), 1);
        $totalRatings = Rating::count();

        return response()->json([
            'kpis' => [
                'date' => $date,
                'today_revenue' => $todayRevenue,
                'today_paid_orders' => $todayPaidCount,
                'today_pending_orders' => $todayPendingCount,
                'today_cancelled_orders' => $todayCancelledCount,
                'today_aov' => $todayAov,
                'total_cash_balance' => $totalCashBalance,
                'all_time_revenue' => (int) $allPaidOrders->sum('total_amount'),
                'all_time_paid_orders' => $allPaidOrders->count(),
                'pending_reports_count' => $pendingReportsCount,
                'avg_rating' => $avgRating,
                'total_ratings' => $totalRatings,
            ],
            'hourly_sales' => array_values($hourly),
            'top_products' => $topProducts,
            'low_stock_ingredients' => $lowStockIngredients,
            'tables' => $tables,
            'recent_orders' => $recentOrders,
        ]);
    }

    /**
     * GET /api/v1/owner/products & CRUD products, categories, options
     */
    public function listMenu()
    {
        $categories = Category::orderBy('sort_order')->get();
        $products = Product::with(['category', 'options.values', 'recipe.items.ingredient'])
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'categories' => $categories,
            'products' => $products,
        ]);
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']) . '-' . Str::random(4),
            'description' => $validated['description'] ?? null,
            'sort_order' => $validated['sort_order'] ?? ((int) Category::max('sort_order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        AuditLog::record('CATEGORY_CREATED', $request->user()?->name ?? 'Owner', 'owner', 'Category', $category->id, "Menambahkan kategori menu: {$category->name}");

        return response()->json(['message' => 'Kategori berhasil dibuat.', 'category' => $category], 201);
    }

    public function storeProduct(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|integer|exists:categories,id',
            'name' => 'required|string|max:140',
            'sku' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'price' => 'required|integer|min:0',
            'image_url' => 'nullable|string|max:500',
            'unit_label' => 'nullable|string|max:40',
            'is_available' => 'nullable|boolean',
            'track_inventory' => 'nullable|boolean',
            'options' => 'nullable|array',
            'options.*.name' => 'required_with:options|string|max:100',
            'options.*.selection_type' => 'nullable|in:single,multiple',
            'options.*.is_required' => 'nullable|boolean',
            'options.*.values' => 'nullable|array',
            'options.*.values.*.name' => 'required|string|max:100',
            'options.*.values.*.price_delta' => 'nullable|integer',
            'options.*.values.*.is_default' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $sku = !empty($validated['sku'])
                ? $validated['sku']
                : sprintf('MNU-%03d', (int) Product::max('id') + 1);

            $product = Product::create([
                'category_id' => $validated['category_id'],
                'sku' => $sku,
                'name' => $validated['name'],
                'slug' => Str::slug($validated['name']) . '-' . strtolower(Str::random(4)),
                'description' => $validated['description'] ?? null,
                'price' => $validated['price'],
                'image_url' => $validated['image_url'] ?? 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
                'unit_label' => $validated['unit_label'] ?? 'porsi',
                'is_available' => $validated['is_available'] ?? true,
                'track_inventory' => $validated['track_inventory'] ?? true,
                'sort_order' => (int) Product::max('sort_order') + 1,
            ]);

            if (!empty($validated['options'])) {
                foreach ($validated['options'] as $idx => $optInput) {
                    $opt = ProductOption::create([
                        'product_id' => $product->id,
                        'name' => $optInput['name'],
                        'selection_type' => $optInput['selection_type'] ?? 'single',
                        'is_required' => $optInput['is_required'] ?? false,
                        'sort_order' => $idx + 1,
                    ]);

                    foreach ($optInput['values'] ?? [] as $vIdx => $valInput) {
                        ProductOptionValue::create([
                            'product_option_id' => $opt->id,
                            'name' => $valInput['name'],
                            'price_delta' => (int) ($valInput['price_delta'] ?? 0),
                            'is_default' => (bool) ($valInput['is_default'] ?? ($vIdx === 0)),
                            'is_available' => true,
                            'sort_order' => $vIdx + 1,
                        ]);
                    }
                }
            }

            AuditLog::record(
                'PRODUCT_CREATED',
                $request->user()?->name ?? 'Owner',
                'owner',
                'Product',
                $product->id,
                "Menambahkan produk baru: {$product->name} (Rp " . number_format($product->price, 0, ',', '.') . ")"
            );

            return response()->json([
                'message' => 'Produk berhasil ditambahkan.',
                'product' => $product->load(['category', 'options.values', 'recipe.items.ingredient']),
            ], 201);
        });
    }

    public function updateProduct(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $before = $product->toArray();

        $validated = $request->validate([
            'category_id' => 'sometimes|integer|exists:categories,id',
            'name' => 'sometimes|string|max:140',
            'description' => 'nullable|string|max:500',
            'price' => 'sometimes|integer|min:0',
            'image_url' => 'nullable|string|max:500',
            'unit_label' => 'nullable|string|max:40',
            'is_available' => 'sometimes|boolean',
            'track_inventory' => 'sometimes|boolean',
            'options' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($request, $product, $validated, $before) {
            $product->update(collect($validated)->except('options')->toArray());

            if (array_key_exists('options', $validated) && is_array($validated['options'])) {
                $product->options()->delete();
                foreach ($validated['options'] as $idx => $optInput) {
                    $opt = ProductOption::create([
                        'product_id' => $product->id,
                        'name' => $optInput['name'],
                        'selection_type' => $optInput['selection_type'] ?? 'single',
                        'is_required' => $optInput['is_required'] ?? false,
                        'sort_order' => $idx + 1,
                    ]);
                    foreach ($optInput['values'] ?? [] as $vIdx => $valInput) {
                        ProductOptionValue::create([
                            'product_option_id' => $opt->id,
                            'name' => $valInput['name'],
                            'price_delta' => (int) ($valInput['price_delta'] ?? 0),
                            'is_default' => (bool) ($valInput['is_default'] ?? ($vIdx === 0)),
                            'is_available' => true,
                            'sort_order' => $vIdx + 1,
                        ]);
                    }
                }
            }

            AuditLog::record(
                'PRODUCT_UPDATED',
                $request->user()?->name ?? 'Owner',
                'owner',
                'Product',
                $product->id,
                "Memperbarui produk {$product->name} (Harga: Rp " . number_format($product->price, 0, ',', '.') . ")",
                $before,
                $product->fresh()->toArray()
            );

            return response()->json([
                'message' => 'Data produk berhasil diperbarui.',
                'product' => $product->fresh(['category', 'options.values', 'recipe.items.ingredient']),
            ]);
        });
    }

    public function deleteProduct(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $name = $product->name;
        $product->delete();

        AuditLog::record('PRODUCT_DELETED', $request->user()?->name ?? 'Owner', 'owner', 'Product', $id, "Menghapus produk {$name}");
        return response()->json(['message' => "Produk {$name} berhasil dihapus."]);
    }

    /**
     * 9 Dining Tables & QR Token Management (AC-01, AC-02, AC-03, AC-32)
     */
    public function listTables()
    {
        $tables = DiningTable::with(['activeSession.orders' => function ($q) {
            $q->orderByDesc('created_at');
        }])->orderBy('code')->get();

        return response()->json(['tables' => $tables]);
    }

    public function updateTable(Request $request, $id)
    {
        $table = DiningTable::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|string|max:80',
            'area' => 'sometimes|string|max:100',
            'capacity' => 'sometimes|integer|min:1|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $table->update($validated);

        AuditLog::record(
            'TABLE_UPDATED',
            $request->user()?->name ?? 'Owner',
            'owner',
            'DiningTable',
            $table->id,
            "Memperbarui konfigurasi {$table->code} ({$table->name}) - Aktif: " . ($table->is_active ? 'Ya' : 'Tidak')
        );

        return response()->json([
            'message' => "Meja {$table->name} berhasil diperbarui.",
            'table' => $table->fresh(['activeSession']),
        ]);
    }

    public function regenerateTableQr(Request $request, $id)
    {
        $table = DiningTable::findOrFail($id);
        $oldToken = $table->qr_token;
        $num = preg_replace('/[^0-9]/', '', $table->code);
        $newToken = sprintf('wtn_tbl%s_%s', $num, Str::lower(Str::random(18)));

        $table->update([
            'qr_token' => $newToken,
            'qr_generated_at' => now(),
            'is_active' => true,
        ]);

        // Close any active session associated with old QR if requested
        if ($request->boolean('close_session', false)) {
            TableSession::where('dining_table_id', $table->id)
                ->where('status', 'ACTIVE')
                ->update([
                    'status' => 'CLOSED',
                    'closed_at' => now(),
                ]);
        }

        AuditLog::record(
            'TABLE_QR_REGENERATED',
            $request->user()?->name ?? 'Owner',
            'owner',
            'DiningTable',
            $table->id,
            "Mengganti & mencabut QR token lama untuk {$table->code} ({$table->name})",
            ['qr_token' => $oldToken],
            ['qr_token' => $newToken]
        );

        return response()->json([
            'message' => "Token QR untuk {$table->name} berhasil diperbarui. QR lama otomatis tidak berlaku.",
            'table' => $table->fresh(['activeSession']),
        ]);
    }

    /**
     * Inventory Management: Ingredients, Recipes, Movements, Purchases, Stock Opname
     */
    public function listInventory()
    {
        $ingredients = Ingredient::with('category')->orderBy('code')->get();
        $categories = IngredientCategory::orderBy('name')->get();
        $recipes = Recipe::with(['product.category', 'items.ingredient'])->get();
        $movements = InventoryMovement::with('ingredient')->orderByDesc('created_at')->limit(100)->get();
        $purchases = StockPurchase::with(['items.ingredient', 'cashAccount'])->orderByDesc('purchase_date')->orderByDesc('id')->limit(50)->get();
        $adjustments = StockAdjustment::with('ingredient')->orderByDesc('created_at')->limit(50)->get();

        return response()->json([
            'ingredients' => $ingredients,
            'ingredient_categories' => $categories,
            'recipes' => $recipes,
            'movements' => $movements,
            'purchases' => $purchases,
            'adjustments' => $adjustments,
        ]);
    }

    public function storeIngredient(Request $request)
    {
        $validated = $request->validate([
            'ingredient_category_id' => 'nullable|integer|exists:ingredient_categories,id',
            'name' => 'required|string|max:120',
            'notes' => 'nullable|string|max:255',
            'base_unit' => 'required|string|max:30',
            'display_unit' => 'required|string|max:30',
            'display_conversion_factor' => 'required|numeric|min:0.0001',
            'current_stock' => 'required|numeric|min:0',
            'minimum_stock' => 'required|numeric|min:0',
            'last_purchase_price_per_display_unit' => 'required|integer|min:0',
        ]);

        $code = sprintf('ING-%03d', (int) Ingredient::max('id') + 1);
        $factor = (float) $validated['display_conversion_factor'];
        $avgCostPerBase = $factor > 0 ? ((int) $validated['last_purchase_price_per_display_unit'] / $factor) : 0;

        $ingredient = Ingredient::create([
            'ingredient_category_id' => $validated['ingredient_category_id'] ?? null,
            'code' => $code,
            'name' => $validated['name'],
            'notes' => $validated['notes'] ?? null,
            'base_unit' => $validated['base_unit'],
            'display_unit' => $validated['display_unit'],
            'display_Conversion_factor' => $factor,
            'current_stock' => $validated['current_stock'],
            'minimum_stock' => $validated['minimum_stock'],
            'last_purchase_price_per_display_unit' => $validated['last_purchase_price_per_display_unit'],
            'average_cost_per_base_unit' => $avgCostPerBase,
            'is_active' => true,
        ]);

        AuditLog::record(
            'INGREDIENT_CREATED',
            $request->user()?->name ?? 'Owner',
            'owner',
            'Ingredient',
            $ingredient->id,
            "Menambahkan bahan baku baru: {$ingredient->name} ({$ingredient->current_stock} {$ingredient->base_unit})"
        );

        return response()->json([
            'message' => 'Bahan baku berhasil ditambahkan.',
            'ingredient' => $ingredient->load('category'),
        ], 201);
    }

    public function updateIngredient(Request $request, $id)
    {
        $ingredient = Ingredient::findOrFail($id);
        $before = $ingredient->toArray();

        $validated = $request->validate([
            'ingredient_category_id' => 'nullable|integer|exists:ingredient_categories,id',
            'name' => 'sometimes|string|max:120',
            'notes' => 'nullable|string|max:255',
            'base_unit' => 'sometimes|string|max:30',
            'display_unit' => 'sometimes|string|max:30',
            'display_conversion_factor' => 'sometimes|numeric|min:0.0001',
            'minimum_stock' => 'sometimes|numeric|min:0',
            'last_purchase_price_per_display_unit' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['display_conversion_factor'])) {
            $validated['display_Conversion_factor'] = $validated['display_conversion_factor'];
            unset($validated['display_conversion_factor']);
        }

        $factor = (float) ($validated['display_Conversion_factor'] ?? $ingredient->attributes['display_Conversion_factor'] ?? 1);
        $price = (int) ($validated['last_purchase_price_per_display_unit'] ?? $ingredient->last_purchase_price_per_display_unit);
        if ($factor > 0) {
            $validated['average_cost_per_base_unit'] = $price / $factor;
        }

        $ingredient->update($validated);

        AuditLog::record(
            'INGREDIENT_UPDATED',
            $request->user()?->name ?? 'Owner',
            'owner',
            'Ingredient',
            $ingredient->id,
            "Memperbarui master bahan baku {$ingredient->name}",
            $before,
            $ingredient->fresh()->toArray()
        );

        return response()->json([
            'message' => 'Data bahan baku berhasil diperbarui.',
            'ingredient' => $ingredient->fresh('category'),
        ]);
    }

    /**
     * Save or update a Product Recipe (AC-16)
     */
    public function saveRecipe(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'is_validated' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array',
            'items.*.ingredient_id' => 'required|integer|exists:ingredients,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $existing = Recipe::where('product_id', $validated['product_id'])->first();
            $version = $existing ? ($existing->version + 1) : 1;

            $recipe = Recipe::updateOrCreate(
                ['product_id' => $validated['product_id']],
                [
                    'version' => $version,
                    'is_validated' => $validated['is_validated'] ?? true,
                    'notes' => $validated['notes'] ?? null,
                    'updated_by_actor' => $request->user()?->name ?? 'Owner',
                ]
            );

            $recipe->items()->delete();

            foreach ($validated['items'] as $itemInput) {
                $ing = Ingredient::findOrFail($itemInput['ingredient_id']);
                RecipeItem::create([
                    'recipe_id' => $recipe->id,
                    'ingredient_id' => $ing->id,
                    'quantity' => $itemInput['quantity'],
                    'unit' => $ing->base_unit,
                ]);
            }

            $product = Product::find($validated['product_id']);
            AuditLog::record(
                'RECIPE_UPDATED',
                $request->user()?->name ?? 'Owner',
                'owner',
                'Recipe',
                $recipe->id,
                "Memperbarui resep produk {$product?->name} (Versi {$version}, " . count($validated['items']) . " bahan)"
            );

            return response()->json([
                'message' => "Resep untuk {$product?->name} berhasil disimpan (Versi {$version}).",
                'recipe' => $recipe->load(['product', 'items.ingredient']),
            ]);
        });
    }

    /**
     * Record a Stock Purchase / Restock (AC-21)
     * Adds stock via inventory movement and records cash outflow (NOT immediate full COGS).
     */
    public function storeStockPurchase(Request $request)
    {
        $validated = $request->validate([
            'supplier_name' => 'nullable|string|max:140',
            'purchase_date' => 'nullable|date',
            'payment_method' => 'required|in:CASH,QRIS_BANK',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.ingredient_id' => 'required|integer|exists:ingredients,id',
            'items.*.display_quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|integer|min:0',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $actor = $request->user()?->name ?? 'Owner';
            $accountCode = $validated['payment_method'] === 'QRIS_BANK' ? 'QRIS_BANK' : 'CASH_DRAWER';
            $cashAccount = CashAccount::where('code', $accountCode)->lockForUpdate()->firstOrFail();

            $totalAmount = 0;
            $preparedItems = [];

            foreach ($validated['items'] as $itemInput) {
                $ing = Ingredient::where('id', $itemInput['ingredient_id'])->lockForUpdate()->firstOrFail();
                $factor = (float) ($ing->getRawOriginal('display_Conversion_factor') ?? $ing->getRawOriginal('display_conversion_factor') ?? 1);
                if ($factor <= 0) $factor = 1;

                $displayQty = (float) $itemInput['display_quantity'];
                $baseQty = $displayQty * $factor;
                $unitPrice = (int) $itemInput['unit_price'];
                $subtotal = (int) round($displayQty * $unitPrice);
                $totalAmount += $subtotal;

                $preparedItems[] = [
                    'ingredient' => $ing,
                    'display_quantity' => $displayQty,
                    'base_quantity' => $baseQty,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                    'factor' => $factor,
                ];
            }

            $purchase = StockPurchase::create([
                'purchase_code' => 'PO-' . strtoupper(Str::random(6)),
                'supplier_name' => $validated['supplier_name'] ?? 'Supplier Umum',
                'purchase_date' => $validated['purchase_date'] ?? now()->toDateString(),
                'total_amount' => $totalAmount,
                'cash_account_id' => $cashAccount->id,
                'payment_method' => $validated['payment_method'],
                'notes' => $validated['notes'] ?? null,
                'actor_name' => $actor,
            ]);

            foreach ($preparedItems as $pItem) {
                /** @var Ingredient $ing */
                $ing = $pItem['ingredient'];
                $before = (float) $ing->current_stock;
                $after = $before + $pItem['base_quantity'];
                $newCostPerBase = $pItem['unit_price'] / $pItem['factor'];

                StockPurchaseItem::create([
                    'stock_purchase_id' => $purchase->id,
                    'ingredient_id' => $ing->id,
                    'quantity_in_base_unit' => $pItem['base_quantity'],
                    'display_quantity' => $pItem['display_quantity'],
                    'display_unit' => $ing->display_unit,
                    'unit_price' => $pItem['unit_price'],
                    'subtotal' => $pItem['subtotal'],
                ]);

                $ing->update([
                    'current_stock' => $after,
                    'last_purchase_price_per_display_unit' => $pItem['unit_price'],
                    'average_cost_per_base_unit' => $newCostPerBase,
                ]);

                InventoryMovement::create([
                    'ingredient_id' => $ing->id,
                    'movement_type' => 'PURCHASE_RESTOCK',
                    'direction' => 'IN',
                    'quantity' => $pItem['base_quantity'],
                    'stock_before' => $before,
                    'stock_after' => $after,
                    'unit_cost_snapshot' => (int) round($newCostPerBase),
                    'total_cost_snapshot' => $pItem['subtotal'],
                    'reference_type' => 'StockPurchase',
                    'reference_id' => $purchase->id,
                    'notes' => "Restock pembelian {$purchase->purchase_code} ({$pItem['display_quantity']} {$ing->display_unit})",
                    'actor_name' => $actor,
                ]);
            }

            $balBefore = (int) $cashAccount->current_balance;
            $balAfter = $balBefore - $totalAmount;
            $cashAccount->update(['current_balance' => $balAfter]);

            CashTransaction::create([
                'cash_account_id' => $cashAccount->id,
                'transaction_code' => 'TRX-PO-' . strtoupper(Str::random(6)),
                'direction' => 'OUT',
                'category' => 'STOCK_PURCHASE',
                'amount' => $totalAmount,
                'balance_before' => $balBefore,
                'balance_after' => $balAfter,
                'reference_type' => 'StockPurchase',
                'reference_id' => $purchase->id,
                'description' => "Pembelian persediaan {$purchase->purchase_code} ({$purchase->supplier_name})",
                'actor_name' => $actor,
                'occurred_at' => now(),
            ]);

            AuditLog::record(
                'STOCK_PURCHASE_CREATED',
                $actor,
                'owner',
                'StockPurchase',
                $purchase->id,
                "Mencatat pembelian bahan baku {$purchase->purchase_code} sebesar Rp " . number_format($totalAmount, 0, ',', '.')
            );

            return response()->json([
                'message' => 'Pembelian bahan baku berhasil dicatat dan stok telah ditambahkan.',
                'purchase' => $purchase->load(['items.ingredient', 'cashAccount']),
            ], 201);
        });
    }

    /**
     * Record Stock Opname / Physical Stock Reconciliation
     */
    public function storeStockOpname(Request $request)
    {
        $validated = $request->validate([
            'ingredient_id' => 'required|integer|exists:ingredients,id',
            'physical_stock_in_base_unit' => 'required|numeric|min:0',
            'type' => 'nullable|in:STOCK_OPNAME,WASTAGE,CORRECTION',
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $actor = $request->user()?->name ?? 'Owner';
            $ing = Ingredient::where('id', $validated['ingredient_id'])->lockForUpdate()->firstOrFail();

            $systemStock = (float) $ing->current_stock;
            $physicalStock = (float) $validated['physical_stock_in_base_unit'];
            $diff = $physicalStock - $systemStock;

            $adjustment = StockAdjustment::create([
                'adjustment_code' => 'OPN-' . strtoupper(Str::random(6)),
                'ingredient_id' => $ing->id,
                'type' => $validated['type'] ?? 'STOCK_OPNAME',
                'system_stock' => $systemStock,
                'physical_stock' => $physicalStock,
                'difference' => $diff,
                'reason' => $validated['reason'],
                'notes' => $validated['notes'] ?? null,
                'actor_name' => $actor,
            ]);

            $ing->update(['current_stock' => $physicalStock]);

            if (abs($diff) > 0.0001) {
                InventoryMovement::create([
                    'ingredient_id' => $ing->id,
                    'movement_type' => 'OPNAME_ADJUSTMENT',
                    'direction' => $diff >= 0 ? 'IN' : 'OUT',
                    'quantity' => abs($diff),
                    'stock_before' => $systemStock,
                    'stock_after' => $physicalStock,
                    'unit_cost_snapshot' => (int) round((float) $ing->average_cost_per_base_unit),
                    'total_cost_snapshot' => (int) round(abs($diff) * (float) $ing->average_cost_per_base_unit),
                    'reference_type' => 'StockAdjustment',
                    'reference_id' => $adjustment->id,
                    'notes' => "Stock Opname ({$validated['reason']}): Sistem {$systemStock} -> Fisik {$physicalStock} {$ing->base_unit}",
                    'actor_name' => $actor,
                ]);
            }

            AuditLog::record(
                'STOCK_OPNAME_RECORDED',
                $actor,
                'owner',
                'StockAdjustment',
                $adjustment->id,
                "Stock opname {$ing->name}: Sistem {$systemStock} {$ing->base_unit}, Fisik {$physicalStock} {$ing->base_unit} (Selisih: {$diff} {$ing->base_unit}) - Alasan: {$validated['reason']}"
            );

            return response()->json([
                'message' => "Stock opname untuk {$ing->name} berhasil disimpan.",
                'adjustment' => $adjustment->load('ingredient'),
                'ingredient' => $ing->fresh('category'),
            ], 201);
        });
    }

    /**
     * GET /api/v1/owner/finance/cash-flow
     * Enforces AC-23: Explicitly distinguishes Sales Revenue, Refunds/Discounts,
     * Ingredient Consumption (COGS), Operating Expenses, Operating Profit,
     * Stock Purchases (PO), and Cash/Bank Account Balances (without double counting).
     */
    public function financeOverview(Request $request)
    {
        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $paidOrders = Order::where('payment_status', 'PAID')
            ->whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate])
            ->get();

        $refundedOrders = Order::where('payment_status', 'REFUNDED')
            ->whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate])
            ->get();

        $grossSales = (int) $paidOrders->sum('total_amount');
        $cashSales = (int) $paidOrders->where('payment_method', 'CASH')->sum('total_amount');
        $qrisSales = (int) $paidOrders->where('payment_method', 'QRIS')->sum('total_amount');
        $totalDiscounts = (int) $paidOrders->sum('discount_amount');
        $totalRefunds = (int) $refundedOrders->sum('total_amount');

        // COGS is strictly from consumed recipe ingredients on paid orders (NOT raw stock purchases)
        $consumedCogs = (int) $paidOrders->sum('cogs_amount');

        // Operating expenses (excluding stock purchases)
        $expenses = Expense::with(['category', 'cashAccount'])
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->get();
        $totalOperatingExpenses = (int) $expenses->sum('amount');

        // Operating profit = Paid Sales - Consumed Recipe COGS - Operating Expenses
        $operatingProfit = $grossSales - $consumedCogs - $totalOperatingExpenses;
        $operatingMarginPct = $grossSales > 0 ? round(($operatingProfit / $grossSales) * 100, 1) : 0.0;

        // Stock Purchases (Inventory additions / Cash Outflow — kept separate from COGS!)
        $stockPurchases = StockPurchase::with('items.ingredient')
            ->whereBetween('purchase_date', [$startDate, $endDate])
            ->orderByDesc('purchase_date')
            ->get();
        $totalStockPurchasesOutflow = (int) $stockPurchases->sum('total_amount');

        $cashAccounts = CashAccount::where('is_active', true)->get();
        $totalCashAndBankBalance = (int) $cashAccounts->sum('current_balance');

        $cashTransactions = CashTransaction::with('cashAccount')
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $closings = CashClosing::with('employeeProfile')
            ->orderByDesc('closing_date')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        $expenseCategories = ExpenseCategory::withSum(['expenses' => function ($q) use ($startDate, $endDate) {
            $q->whereBetween('expense_date', [$startDate, $endDate]);
        }], 'amount')->get();

        return response()->json([
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'profit_and_loss' => [
                'gross_sales_revenue' => $grossSales,
                'cash_sales_revenue' => $cashSales,
                'qris_sales_revenue' => $qrisSales,
                'paid_transactions_count' => $paidOrders->count(),
                'discounts_amount' => $totalDiscounts,
                'refunds_amount' => $totalRefunds,
                'recipe_cogs_amount' => $consumedCogs,
                'operating_expenses_amount' => $totalOperatingExpenses,
                'operating_profit_amount' => $operatingProfit,
                'operating_margin_percentage' => $operatingMarginPct,
            ],
            'cash_position_and_inventory_outflow' => [
                'stock_purchases_outflow_amount' => $totalStockPurchasesOutflow,
                'total_cash_and_bank_balance' => $totalCashAndBankBalance,
                'cash_accounts' => $cashAccounts,
                'accounting_note' => 'Saldo kas bukan sinonim laba. Pembelian persediaan bahan baku dicatat sebagai arus kas keluar dan penambah nilai stok gudang, tidak dihitung ganda dengan HPP resep terjual.',
            ],
            'expenses' => $expenses,
            'expense_categories' => $expenseCategories,
            'cash_transactions' => $cashTransactions,
            'closings' => $closings,
        ]);
    }

    public function lockCashClosing(Request $request, $id)
    {
        $closing = CashClosing::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|in:LOCKED,NEEDS_REVISION',
            'owner_notes' => 'nullable|string|max:500',
        ]);

        $closing->update([
            'status' => $validated['status'],
            'owner_notes' => $validated['owner_notes'] ?? null,
            'locked_at' => $validated['status'] === 'LOCKED' ? now() : null,
            'locked_by' => $request->user()?->name ?? 'Nenek Sari (Owner)',
        ]);

        AuditLog::record(
            'CASH_CLOSING_REVIEWED',
            $request->user()?->name ?? 'Owner',
            'owner',
            'CashClosing',
            $closing->id,
            "Meninjau penutupan kas {$closing->closing_code}: Status {$validated['status']}"
        );

        return response()->json([
            'message' => 'Status penutupan kas berhasil diperbarui.',
            'closing' => $closing,
        ]);
    }

    /**
     * Employee Daily Reports Review (AC-26)
     */
    public function listEmployeeReports(Request $request)
    {
        $query = EmployeeReport::with(['employeeProfile', 'attachments'])
            ->orderByDesc('report_date')
            ->orderByDesc('id');

        if ($request->filled('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        return response()->json([
            'reports' => $query->limit(50)->get(),
        ]);
    }

    public function reviewEmployeeReport(Request $request, $id)
    {
        $report = EmployeeReport::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|in:reviewed,needs_revision',
            'owner_feedback' => 'nullable|string|max:1000',
        ]);

        $report->update([
            'status' => $validated['status'],
            'owner_feedback' => $validated['owner_feedback'] ?? null,
            'reviewed_by' => $request->user()?->name ?? 'Nenek Sari (Owner)',
            'reviewed_at' => now(),
        ]);

        AuditLog::record(
            'DAILY_REPORT_REVIEWED',
            $request->user()?->name ?? 'Owner',
            'owner',
            'EmployeeReport',
            $report->id,
            "Meninjau laporan harian {$report->report_code} ({$report->employee_name}): {$validated['status']}"
        );

        return response()->json([
            'message' => 'Tinjauan laporan harian karyawan berhasil disimpan.',
            'report' => $report->fresh(['employeeProfile', 'attachments']),
        ]);
    }

    /**
     * Customer Ratings Overview (AC-29)
     */
    public function listRatings(Request $request)
    {
        $ratings = Rating::with(['order.items', 'diningTable'])
            ->orderByDesc('created_at')
            ->get();

        $total = $ratings->count();
        $avg = $total > 0 ? round((float) $ratings->avg('stars'), 1) : 0.0;

        $distribution = [];
        for ($s = 5; $s >= 1; $s--) {
            $cnt = $ratings->where('stars', $s)->count();
            $distribution[$s] = [
                'stars' => $s,
                'count' => $cnt,
                'percentage' => $total > 0 ? round(($cnt / $total) * 100, 1) : 0.0,
            ];
        }

        return response()->json([
            'summary' => [
                'average_stars' => $avg,
                'total_ratings' => $total,
                'distribution' => array_values($distribution),
                'has_sufficient_data' => $total >= 5,
            ],
            'ratings' => $ratings,
        ]);
    }

    /**
     * Traffic & Business Performance Analytics (AC-30, AC-31)
     * Uses ONLY actual database records and discloses if historical data is insufficient.
     */
    public function trafficAnalytics(Request $request)
    {
        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $orders = Order::whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate])->get();
        $paidOrders = $orders->where('payment_status', 'PAID');
        $completedOrders = $orders->where('status', 'COMPLETED');

        $events = TrafficEvent::whereBetween(DB::raw('DATE(occurred_at)'), [$startDate, $endDate])->get();

        // Hourly breakdown (08:00 to 22:00)
        $hourly = [];
        for ($h = 8; $h <= 22; $h++) {
            $key = sprintf('%02d:00', $h);
            $hourly[$key] = [
                'hour' => sprintf('%02d.00', $h),
                'qr_visits' => 0,
                'orders_created' => 0,
                'orders_paid' => 0,
                'orders_completed' => 0,
                'revenue' => 0,
            ];
        }

        foreach ($events->where('event_type', 'QR_MENU_VISIT') as $ev) {
            $h = (int) $ev->occurred_at->format('G');
            if ($h >= 8 && $h <= 22) {
                $hourly[sprintf('%02d:00', $h)]['qr_visits']++;
            }
        }

        foreach ($orders as $ord) {
            $h = (int) $ord->created_at->format('G');
            if ($h >= 8 && $h <= 22) {
                $key = sprintf('%02d:00', $h);
                $hourly[$key]['orders_created']++;
                if ($ord->payment_status === 'PAID') {
                    $hourly[$key]['orders_paid']++;
                    $hourly[$key]['revenue'] += (int) $ord->total_amount;
                }
                if ($ord->status === 'COMPLETED') {
                    $hourly[$key]['orders_completed']++;
                }
            }
        }

        // Determine Peak and Quiet hours strictly from actual orders
        $activeHours = collect($hourly)->filter(fn ($row) => $row['orders_created'] > 0);
        $peakHour = $activeHours->sortByDesc('orders_created')->first();
        $quietHour = $activeHours->sortBy('orders_created')->first();

        // Daily trend
        $dailyTrend = $paidOrders->groupBy(fn ($o) => $o->created_at->toDateString())
            ->map(function ($dayOrders, $dateStr) {
                return [
                    'date' => $dateStr,
                    'orders_count' => $dayOrders->count(),
                    'revenue' => (int) $dayOrders->sum('total_amount'),
                    'aov' => $dayOrders->count() > 0 ? (int) round($dayOrders->sum('total_amount') / $dayOrders->count()) : 0,
                ];
            })
            ->values();

        // Top products
        $productPerformance = OrderItem::select(
            'product_name_snapshot as name',
            'product_sku_snapshot as sku',
            DB::raw('SUM(quantity) as total_qty'),
            DB::raw('SUM(line_total) as total_revenue')
        )
            ->whereHas('order', function ($q) use ($startDate, $endDate) {
                $q->where('payment_status', 'PAID')
                  ->whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate]);
            })
            ->groupBy('product_name_snapshot', 'product_sku_snapshot')
            ->orderByDesc('total_qty')
            ->get();

        // Table utilization & average session duration
        $tableUtilization = DiningTable::orderBy('code')->get()->map(function ($tbl) use ($startDate, $endDate) {
            $tblOrders = Order::where('dining_table_id', $tbl->id)
                ->where('payment_status', 'PAID')
                ->whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate])
                ->get();
            $sessions = TableSession::where('dining_table_id', $tbl->id)
                ->whereNotNull('duration_minutes')
                ->get();

            return [
                'table_code' => $tbl->code,
                'table_name' => $tbl->name,
                'area' => $tbl->area,
                'paid_orders_count' => $tblOrders->count(),
                'revenue' => (int) $tblOrders->sum('total_amount'),
                'avg_session_minutes' => $sessions->count() > 0 ? (int) round($sessions->avg('duration_minutes')) : null,
            ];
        });

        $sampleSize = $orders->count();
        $hasSufficientHistory = $sampleSize >= 15;

        return response()->json([
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'sample_size_orders' => $sampleSize,
                'has_sufficient_history' => $hasSufficientHistory,
                'disclosure_message' => $hasSufficientHistory
                    ? "Dihitung dari {$sampleSize} transaksi aktual pada periode {$startDate} s/d {$endDate}."
                    : "Data belum cukup untuk menyimpulkan pola jangka panjang (baru tercatat {$sampleSize} transaksi pada periode {$startDate} s/d {$endDate}). Seluruh angka di bawah adalah data aktual tanpa angka simulasi.",
            ],
            'funnel' => [
                'qr_menu_visits' => $events->where('event_type', 'QR_MENU_VISIT')->count(),
                'orders_created' => $orders->count(),
                'orders_paid' => $paidOrders->count(),
                'orders_completed' => $completedOrders->count(),
                'orders_cancelled' => $orders->where('status', 'CANCELLED')->count(),
                'total_revenue' => (int) $paidOrders->sum('total_amount'),
                'average_order_value' => $paidOrders->count() > 0 ? (int) round($paidOrders->sum('total_amount') / $paidOrders->count()) : 0,
            ],
            'peak_hour' => $peakHour,
            'quiet_hour' => $quietHour,
            'hourly_distribution' => array_values($hourly),
            'daily_trend' => $dailyTrend,
            'product_performance' => $productPerformance,
            'table_utilization' => $tableUtilization,
        ]);
    }

    /**
     * Settings & Official QRIS Upload + Employee Profiles Management
     */
    public function getSettings()
    {
        $settings = SystemSetting::all()->pluck('value', 'key');
        $employees = EmployeeProfile::orderBy('id')->get();

        return response()->json([
            'settings' => $settings,
            'employees' => $employees,
            'has_official_qris_image' => !empty(SystemSetting::getValue('qris_image_path')),
        ]);
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'business_name' => 'sometimes|string|max:120',
            'business_tagline' => 'nullable|string|max:190',
            'business_address' => 'nullable|string|max:255',
            'business_phone' => 'nullable|string|max:50',
            'wifi_ssid' => 'nullable|string|max:80',
            'wifi_password' => 'nullable|string|max:80',
            'tax_enabled' => 'sometimes|boolean',
            'tax_pb1_percentage' => 'sometimes|integer|min:0|max:25',
            'qris_merchant_name' => 'nullable|string|max:140',
            'qris_nmid' => 'nullable|string|max:80',
            'qris_bank_info' => 'nullable|string|max:190',
            'qris_image' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:4096',
        ]);

        foreach (['business_name', 'business_tagline', 'business_address', 'business_phone', 'wifi_ssid', 'wifi_password', 'qris_merchant_name', 'qris_nmid', 'qris_bank_info'] as $strKey) {
            if (array_key_exists($strKey, $validated)) {
                SystemSetting::setValue($strKey, $validated[$strKey], 'string');
            }
        }

        if (array_key_exists('tax_enabled', $validated)) {
            SystemSetting::setValue('tax_enabled', (bool) $validated['tax_enabled'], 'boolean', 'tax');
        }
        if (array_key_exists('tax_pb1_percentage', $validated)) {
            SystemSetting::setValue('tax_pb1_percentage', (int) $validated['tax_pb1_percentage'], 'integer', 'tax');
        }

        if ($request->hasFile('qris_image')) {
            $path = $request->file('qris_image')->store('private/qris', 'local');
            SystemSetting::setValue('qris_image_path', $path, 'file', 'payment');
        }

        AuditLog::record(
            'SETTINGS_UPDATED',
            $request->user()?->name ?? 'Owner',
            'owner',
            'SystemSetting',
            'global',
            'Memperbarui pengaturan usaha / konfigurasi pembayaran QRIS'
        );

        return response()->json([
            'message' => 'Pengaturan usaha berhasil disimpan.',
            'settings' => SystemSetting::all()->pluck('value', 'key'),
            'has_official_qris_image' => !empty(SystemSetting::getValue('qris_image_path')),
        ]);
    }

    public function storeEmployeeProfile(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'role_title' => 'required|string|max:100',
            'default_shift' => 'required|string|max:100',
            'pin' => 'required|string|min:4|max:8',
        ]);

        $code = sprintf('EMP-%02d', (int) EmployeeProfile::max('id') + 1);
        $emp = EmployeeProfile::create([
            'name' => $validated['name'],
            'code' => $code,
            'role_title' => $validated['role_title'],
            'default_shift' => $validated['default_shift'],
            'pin_hash' => Hash::make($validated['pin']),
            'is_active' => true,
        ]);

        AuditLog::record('EMPLOYEE_PROFILE_CREATED', $request->user()?->name ?? 'Owner', 'owner', 'EmployeeProfile', $emp->id, "Menambahkan profil identitas karyawan shift: {$emp->name} ({$emp->code})");

        return response()->json([
            'message' => 'Profil identitas karyawan berhasil ditambahkan.',
            'employee' => $emp,
        ], 201);
    }

    /**
     * Audit Logs & Exports (AC-34, AC-35)
     */
    public function auditLogs(Request $request)
    {
        $query = AuditLog::orderByDesc('created_at')->orderByDesc('id');
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        return response()->json([
            'logs' => $query->limit(150)->get(),
        ]);
    }

    public function exportReport(Request $request)
    {
        $type = $request->input('type', 'sales'); // sales, expenses, inventory
        $format = strtolower($request->input('format', 'csv')); // csv
        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $generatedAt = now()->format('Y-m-d H:i:s');
        $lines = [];
        $lines[] = "WARKOP TERAS NENEK - EKSPOR LAPORAN " . strtoupper($type);
        $lines[] = "Periode,{$startDate} s/d {$endDate}";
        $lines[] = "Waktu Pembuatan,{$generatedAt} WIB";
        $lines[] = "";

        if ($type === 'expenses') {
            $lines[] = "Kode,Tanggal,Kategori,Metode,Nominal (Rp),Deskripsi,Petugas";
            $rows = Expense::with('category')->whereBetween('expense_date', [$startDate, $endDate])->orderByDesc('expense_date')->get();
            foreach ($rows as $r) {
                $desc = str_replace('"', '""', $r->description);
                $cat = $r->category?->name ?? '-';
                $lines[] = "{$r->expense_code},{$r->expense_date->toDateString()},\"{$cat}\",{$r->payment_method},{$r->amount},\"{$desc}\",\"{$r->actor_name}\"";
            }
        } elseif ($type === 'inventory') {
            $lines[] = "Kode,Bahan Baku,Kategori,Stok Saat Ini,Satuan Dasar,Batas Minimum,Status,Harga Beli Terakhir";
            $rows = Ingredient::with('category')->orderBy('code')->get();
            foreach ($rows as $r) {
                $cat = $r->category?->name ?? '-';
                $lines[] = "{$r->code},\"{$r->name}\",\"{$cat}\",{$r->current_stock},{$r->base_unit},{$r->minimum_stock},{$r->stock_status},{$r->last_purchase_price_per_display_unit}";
            }
        } else {
            $lines[] = "No Order,Kode Publik,Waktu,Sumber,Meja,Pelanggan,Status Order,Metode Bayar,Status Bayar,Subtotal,Diskon,PB1,Total (Rp),HPP Resep (Rp)";
            $rows = Order::whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate])->orderByDesc('created_at')->get();
            foreach ($rows as $r) {
                $cust = str_replace('"', '""', $r->customer_name ?? '-');
                $lines[] = "{$r->order_number},{$r->public_code},{$r->created_at},{$r->source},\"{$r->table_name_snapshot}\",\"{$cust}\",{$r->status},{$r->payment_method},{$r->payment_status},{$r->subtotal_amount},{$r->discount_amount},{$r->tax_amount},{$r->total_amount},{$r->cogs_amount}";
            }
        }

        $csvContent = implode("\n", $lines);
        $filename = "wtn-laporan-{$type}-{$startDate}-to-{$endDate}.csv";

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
