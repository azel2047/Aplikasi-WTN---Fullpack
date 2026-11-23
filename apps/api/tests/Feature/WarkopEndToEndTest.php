<?php

namespace Tests\Feature;

use App\Models\DiningTable;
use App\Models\EmployeeProfile;
use App\Models\EmployeeReport;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Ingredient;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Product;
use App\Models\Rating;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WarkopEndToEndTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_9_initial_tables_and_qr_token_resolution_ac01_ac02_ac03_ac04_ac32(): void
    {
        // AC-01 & AC-02: Exactly 9 active tables with unique opaque QR tokens
        $tables = DiningTable::where('is_active', true)->get();
        $this->assertCount(9, $tables);
        $this->assertEquals(9, $tables->pluck('qr_token')->unique()->count());

        // AC-04: Valid QR token opens menu without login
        $table4 = DiningTable::where('code', 'TBL-04')->firstOrFail();
        $res = $this->getJson("/api/v1/public/tables/{$table4->qr_token}/menu");
        $res->assertStatus(200)
            ->assertJsonPath('table.code', 'TBL-04')
            ->assertJsonPath('table.name', 'Meja 4');

        // AC-03: Invalid or revoked QR token cannot open menu or create order
        $invalidRes = $this->getJson('/api/v1/public/tables/invalid_token_xyz/menu');
        $invalidRes->assertStatus(404);

        $product = Product::firstOrFail();
        $badOrder = $this->postJson('/api/v1/public/orders', [
            'table_token' => 'invalid_token_xyz',
            'payment_method' => 'CASH',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ]);
        $badOrder->assertStatus(422);

        // AC-03 & AC-32: Regenerating QR token invalidates old token immediately
        $owner = User::where('role', 'owner')->firstOrFail();
        $oldToken = $table4->qr_token;

        $regenRes = $this->actingAs($owner)->postJson("/api/v1/owner/tables/{$table4->id}/regenerate-qr");
        $regenRes->assertStatus(200);
        $newToken = $regenRes->json('table.qr_token');
        $this->assertNotEquals($oldToken, $newToken);

        $this->getJson("/api/v1/public/tables/{$oldToken}/menu")->assertStatus(404);
        $this->getJson("/api/v1/public/tables/{$newToken}/menu")->assertStatus(200);
    }

    public function test_complete_customer_qris_order_cashier_verification_stock_deduction_and_rating_e2e(): void
    {
        Storage::fake('local');

        $table4 = DiningTable::where('code', 'TBL-04')->firstOrFail();
        $kopiSusu = Product::where('slug', 'kopi-susu-gula-aren')->firstOrFail();
        $wedangJahe = Product::where('slug', 'wedang-jahe-sereh')->firstOrFail(); // Product without recipe (AC-17)

        $robustaBefore = (float) Ingredient::where('code', 'ING-001')->value('current_stock');
        $susuBefore = (float) Ingredient::where('code', 'ING-002')->value('current_stock');
        $arenBefore = (float) Ingredient::where('code', 'ING-003')->value('current_stock');

        // 1. Customer creates order with per-item notes (AC-05, AC-06, AC-08)
        $createRes = $this->postJson('/api/v1/public/orders', [
            'table_token' => $table4->qr_token,
            'customer_name' => 'Bapak Hendra',
            'payment_method' => 'QRIS',
            'idempotency_key' => 'e2e-idem-key-001',
            'items' => [
                [
                    'product_id' => $kopiSusu->id,
                    'quantity' => 2,
                    'item_note' => 'Es sedikit, gula aren 50%',
                ],
                [
                    'product_id' => $wedangJahe->id,
                    'quantity' => 1,
                    'item_note' => 'Jahenya dibanyakin',
                ],
            ],
        ]);

        $createRes->assertStatus(201);
        $publicCode = $createRes->json('order.public_code');
        $orderId = $createRes->json('order.id');

        // Idempotency retry returns same order without duplicate
        $retryRes = $this->postJson('/api/v1/public/orders', [
            'table_token' => $table4->qr_token,
            'payment_method' => 'QRIS',
            'idempotency_key' => 'e2e-idem-key-001',
            'items' => [
                ['product_id' => $kopiSusu->id, 'quantity' => 2],
            ],
        ]);
        $this->assertEquals($orderId, $retryRes->json('order.id'));

        // Stock must NOT be deducted yet while PENDING_PAYMENT / UNPAID
        $this->assertEquals($robustaBefore, (float) Ingredient::where('code', 'ING-001')->value('current_stock'));

        // 2. Customer uploads QRIS payment proof (AC-13: must NOT become PAID automatically)
        $file = UploadedFile::fake()->create('bukti-qris.jpg', 120, 'image/jpeg');
        $proofRes = $this->postJson("/api/v1/public/orders/{$publicCode}/payment-proof", [
            'proof_file' => $file,
            'proof_reference' => 'BCA QRIS Ref 998877',
        ]);
        $proofRes->assertStatus(200)
            ->assertJsonPath('order.payment_status', 'PROOF_UPLOADED')
            ->assertJsonPath('order.status', 'PENDING_PAYMENT');

        // 3. Cashier logs in with shared account & shift profile (AC-07, AC-09, AC-33)
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'kasir@warkopterasnenek.id',
            'password' => 'kasir123',
            'shift_name' => 'Shift Pagi',
        ]);
        $loginRes->assertStatus(200);
        $cashierToken = $loginRes->json('token');

        // Employee cannot access Owner endpoints (AC-33)
        $this->withToken($cashierToken)
            ->getJson('/api/v1/owner/dashboard')
            ->assertStatus(403);

        // Cashier inspects order in unified queue and sees intact item notes (AC-07, AC-09)
        $detailRes = $this->withToken($cashierToken)->getJson("/api/v1/cashier/orders/{$orderId}");
        $detailRes->assertStatus(200)
            ->assertJsonPath('order.items.0.item_note', 'Es sedikit, gula aren 50%');

        // AC-14: Cashier can reject an invalid payment proof with mandatory reason
        $rejectRes = $this->withToken($cashierToken)->postJson("/api/v1/cashier/orders/{$orderId}/payments", [
            'action' => 'REJECT_PROOF',
            'rejection_reason' => 'Foto bukti buram, mohon unggah ulang',
        ]);
        $rejectRes->assertStatus(200)
            ->assertJsonPath('order.payment_status', 'REJECTED');

        // 4. Cashier verifies QRIS payment manually (AC-14, AC-18)
        $verifyRes = $this->withToken($cashierToken)->postJson("/api/v1/cashier/orders/{$orderId}/payments", [
            'action' => 'VERIFY_PAID',
            'method' => 'QRIS',
        ]);
        $verifyRes->assertStatus(200)
            ->assertJsonPath('order.payment_status', 'PAID')
            ->assertJsonPath('order.status', 'CONFIRMED')
            ->assertJsonPath('order.stock_deducted', true);

        // Verify atomic stock deduction for 2x Kopi Susu Gula Aren (2 * 15g = 30g robusta, 2 * 120ml = 240ml susu, 2 * 25ml = 50ml aren)
        // And Wedang Jahe (no recipe) did not error or deduct anything (AC-17, AC-18)
        $this->assertEquals($robustaBefore - 30, (float) Ingredient::where('code', 'ING-001')->value('current_stock'));
        $this->assertEquals($susuBefore - 240, (float) Ingredient::where('code', 'ING-002')->value('current_stock'));
        $this->assertEquals($arenBefore - 50, (float) Ingredient::where('code', 'ING-003')->value('current_stock'));

        // 5. Cashier transitions status PREPARING -> READY -> COMPLETED (AC-10, AC-11)
        $this->withToken($cashierToken)
            ->patchJson("/api/v1/cashier/orders/{$orderId}/status", ['status' => 'PREPARING'])
            ->assertStatus(200)
            ->assertJsonPath('order.status', 'PREPARING');

        // Stock must NOT be deducted a second time! (AC-18)
        $this->assertEquals($robustaBefore - 30, (float) Ingredient::where('code', 'ING-001')->value('current_stock'));

        $this->withToken($cashierToken)
            ->patchJson("/api/v1/cashier/orders/{$orderId}/status", ['status' => 'READY'])
            ->assertStatus(200);

        $this->withToken($cashierToken)
            ->patchJson("/api/v1/cashier/orders/{$orderId}/status", ['status' => 'COMPLETED'])
            ->assertStatus(200)
            ->assertJsonPath('order.status', 'COMPLETED');

        // 6. Customer submits 5-star rating after completion (AC-27, AC-28)
        $ratingRes = $this->postJson("/api/v1/public/orders/{$publicCode}/rating", [
            'stars' => 5,
            'tags' => ['Kopi Pas Mantap'],
            'comment' => 'Kopi susu aren terenak di Jogja!',
        ]);
        $ratingRes->assertStatus(201)
            ->assertJsonPath('rating.stars', 5);

        // Duplicate rating for the same order must be rejected (AC-28)
        $dupRating = $this->postJson("/api/v1/public/orders/{$publicCode}/rating", [
            'stars' => 4,
            'comment' => 'Coba kirim kedua kali',
        ]);
        $dupRating->assertStatus(422);

        // 7. Owner logs in and checks dashboard, finance, ratings, analytics (AC-23, AC-29, AC-30, AC-31, AC-34)
        $ownerLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@warkopterasnenek.id',
            'password' => 'owner123',
        ]);
        $ownerLogin->assertStatus(200);
        $ownerToken = $ownerLogin->json('token');

        Auth::forgetGuards();

        $this->withToken($ownerToken)->getJson('/api/v1/owner/dashboard')->assertStatus(200);
        $this->withToken($ownerToken)->getJson('/api/v1/owner/finance/cash-flow')->assertStatus(200);
        $this->withToken($ownerToken)->getJson('/api/v1/owner/ratings')->assertStatus(200);
        $this->withToken($ownerToken)->getJson('/api/v1/owner/analytics/traffic')->assertStatus(200);
        $this->withToken($ownerToken)->getJson('/api/v1/owner/audit-logs')->assertStatus(200);
    }

    public function test_cash_payment_change_calculation_and_negative_stock_prevention_ac12_ac19(): void
    {
        $owner = User::where('role', 'owner')->firstOrFail();
        $rotiBakar = Product::where('slug', 'roti-bakar-cokelat-keju')->firstOrFail();

        // Create Manual POS Order
        $posRes = $this->actingAs($owner)->postJson('/api/v1/cashier/pos/orders', [
            'order_type' => 'TAKEAWAY',
            'customer_name' => 'Pak RT',
            'payment_method' => 'CASH',
            'items' => [
                ['product_id' => $rotiBakar->id, 'quantity' => 2, 'item_note' => 'Keju banyak'],
            ],
        ]);
        $posRes->assertStatus(201);
        $orderId = $posRes->json('order.id');
        $totalDue = $posRes->json('order.total_amount'); // 2 * 15000 = 30000 + 10% PB1 = 33000

        // AC-12: Insufficient cash tender must be rejected
        $insufficientRes = $this->actingAs($owner)->postJson("/api/v1/cashier/orders/{$orderId}/payments", [
            'action' => 'VERIFY_PAID',
            'method' => 'CASH',
            'amount_received' => 20000,
        ]);
        $insufficientRes->assertStatus(422);

        // AC-12: Sufficient cash tender calculates exact change
        $paidRes = $this->actingAs($owner)->postJson("/api/v1/cashier/orders/{$orderId}/payments", [
            'action' => 'VERIFY_PAID',
            'method' => 'CASH',
            'amount_received' => 50000,
        ]);
        $paidRes->assertStatus(200)
            ->assertJsonPath('order.payment_status', 'PAID')
            ->assertJsonPath('order.latest_payment.change_amount', 50000 - $totalDue);

        // AC-19: Ordering more than remaining ingredient stock must be prevented
        $excessOrder = $this->actingAs($owner)->postJson('/api/v1/cashier/pos/orders', [
            'order_type' => 'TAKEAWAY',
            'payment_method' => 'CASH',
            'items' => [
                ['product_id' => $rotiBakar->id, 'quantity' => 15],
            ],
        ]);
        $excessOrder->assertStatus(422);
    }

    public function test_inventory_purchases_stock_opname_finance_expenses_daily_reports_and_exports_ac15_to_ac35(): void
    {
        $owner = User::where('role', 'owner')->firstOrFail();

        // AC-15: Owner can create & update ingredient master
        $ingRes = $this->actingAs($owner)->postJson('/api/v1/owner/ingredients', [
            'name' => 'Keju Cheddar Blok',
            'base_unit' => 'gram',
            'display_unit' => 'kg',
            'display_conversion_factor' => 1000,
            'current_stock' => 2000,
            'minimum_stock' => 500,
            'last_purchase_price_per_display_unit' => 95000,
        ]);
        $ingRes->assertStatus(201);
        $newIngId = $ingRes->json('ingredient.id');

        // AC-21: Stock purchase increases stock via inventory movement and records cash outflow
        $purchaseRes = $this->actingAs($owner)->postJson('/api/v1/owner/inventory/purchases', [
            'supplier_name' => 'Toko Bahan Kue Makmur',
            'payment_method' => 'CASH',
            'items' => [
                [
                    'ingredient_id' => $newIngId,
                    'display_quantity' => 2, // 2 kg = 2000 gram
                    'unit_price' => 95000,
                ],
            ],
        ]);
        $purchaseRes->assertStatus(201);
        $this->assertEquals(4000, (float) Ingredient::find($newIngId)->current_stock);

        // Stock Opname records difference and movement (AC-20)
        $opnameRes = $this->actingAs($owner)->postJson('/api/v1/owner/inventory/stock-opname', [
            'ingredient_id' => $newIngId,
            'physical_stock_in_base_unit' => 3850,
            'reason' => 'Susut parutan keju mingguan',
        ]);
        $opnameRes->assertStatus(201);
        $this->assertEquals(3850, (float) Ingredient::find($newIngId)->current_stock);

        // AC-22: Record operating expense per category
        $expCat = ExpenseCategory::firstOrFail();
        $expRes = $this->actingAs($owner)->postJson('/api/v1/owner/expenses', [
            'expense_category_id' => $expCat->id,
            'amount' => 35000,
            'payment_method' => 'CASH',
            'description' => 'Beli sabun cuci piring & tisu meja',
        ]);
        $expRes->assertStatus(201);

        // AC-23: Finance dashboard separates gross sales, recipe COGS, operating expenses, stock purchases, and cash balance
        $finRes = $this->actingAs($owner)->getJson('/api/v1/owner/finance/cash-flow');
        $finRes->assertStatus(200)
            ->assertJsonStructure([
                'profit_and_loss' => [
                    'gross_sales_revenue',
                    'recipe_cogs_amount',
                    'operating_expenses_amount',
                    'operating_profit_amount',
                ],
                'cash_position_and_inventory_outflow' => [
                    'stock_purchases_outflow_amount',
                    'total_cash_and_bank_balance',
                ],
            ]);

        // AC-24, AC-25, AC-26: Daily employee report submission (once per date/shift) and owner review
        $rptRes = $this->actingAs($owner)->postJson('/api/v1/cashier/daily-reports', [
            'shift_name' => 'Shift Pagi (07.00 - 15.00)',
            'crowd_condition' => 'ramai',
            'stock_condition' => 'aman',
            'operational_issues' => 'Semua alat berjalan lancar',
        ]);
        $rptRes->assertStatus(201);
        $rptId = $rptRes->json('report.id');

        // Duplicate submission for the same date & shift must be rejected (AC-24)
        $dupRpt = $this->actingAs($owner)->postJson('/api/v1/cashier/daily-reports', [
            'shift_name' => 'Shift Pagi (07.00 - 15.00)',
            'crowd_condition' => 'normal',
            'stock_condition' => 'aman',
        ]);
        $dupRpt->assertStatus(422);

        // Owner reviews daily report (AC-26)
        $reviewRes = $this->actingAs($owner)->patchJson("/api/v1/owner/employee-reports/{$rptId}/review", [
            'status' => 'reviewed',
            'owner_feedback' => 'Terima kasih, laporan pagi sudah lengkap.',
        ]);
        $reviewRes->assertStatus(200)
            ->assertJsonPath('report.status', 'reviewed');

        // AC-35: Export report CSV
        $exportRes = $this->actingAs($owner)->get('/api/v1/owner/exports?type=sales&format=csv');
        $exportRes->assertStatus(200);
        $this->assertStringContainsString('WARKOP TERAS NENEK', $exportRes->getContent());
    }
}
