<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add role and pin_hash to users
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('employee'); // 'owner' or 'employee'
            $table->string('pin_hash')->nullable();
            $table->boolean('is_active')->default(true);
        });

        // 1. Employee Profiles & Shift Sessions (Shared Employee Login Attribution)
        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique(); // e.g., EMP-01
            $table->string('role_title')->default('Kasir & Barista');
            $table->string('default_shift')->default('Shift Pagi');
            $table->string('pin_hash'); // 4-6 digit PIN for sensitive actions
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('employee_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('employee_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->string('shift_name'); // Shift Pagi, Shift Sore
            $table->string('terminal_name')->default('Terminal Meja Depan');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Dining Tables & Table Sessions (Exactly 9 initial tables)
        Schema::create('dining_tables', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // TBL-01 .. TBL-09
            $table->string('name'); // Meja 1 .. Meja 9
            $table->string('area')->default('Teras Utama');
            $table->integer('capacity')->default(4);
            $table->string('qr_token', 64)->unique(); // Opaque random token
            $table->boolean('is_active')->default(true);
            $table->timestamp('qr_generated_at')->nullable();
            $table->timestamp('last_scanned_at')->nullable();
            $table->timestamps();
        });

        Schema::create('table_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dining_table_id')->constrained('dining_tables')->cascadeOnDelete();
            $table->string('session_token', 64)->unique();
            $table->string('status')->default('ACTIVE'); // ACTIVE, CLOSED
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->timestamps();
        });

        // 3. Menu: Categories, Products, Product Options, Product Option Values
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('sku')->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->bigInteger('price'); // Integer Rupiah
            $table->string('image_url')->nullable();
            $table->string('unit_label')->default('porsi');
            $table->boolean('is_available')->default(true);
            $table->boolean('track_inventory')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('product_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('name'); // e.g., Suhu Minuman, Tingkat Manis, Tambahan Topping
            $table->string('selection_type')->default('single'); // single, multiple
            $table->boolean('is_required')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('product_option_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_option_id')->constrained('product_options')->cascadeOnDelete();
            $table->string('name'); // e.g., Dingin (Es Kristal), 50%, Extra Shot Espresso
            $table->bigInteger('price_delta')->default(0); // Integer Rupiah
            $table->boolean('is_default')->default(false);
            $table->boolean('is_available')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 4. Orders, Order Items, Order Item Options, Order Status Histories
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('public_code', 32)->unique(); // Unguessable e.g. ORD-0042-8F3K
            $table->string('order_number', 16)->index(); // Display e.g. #0042
            $table->string('idempotency_key', 64)->nullable()->unique();
            $table->string('source')->default('QR'); // QR, POS
            $table->string('order_type')->default('DINE_IN'); // DINE_IN, TAKEAWAY
            $table->foreignId('dining_table_id')->nullable()->constrained('dining_tables')->nullOnDelete();
            $table->foreignId('table_session_id')->nullable()->constrained('table_sessions')->nullOnDelete();
            $table->string('table_name_snapshot')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('status')->default('PENDING_PAYMENT')->index();
            // PENDING_PAYMENT, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
            $table->string('payment_method')->default('CASH'); // CASH, QRIS
            $table->string('payment_status')->default('UNPAID')->index();
            // UNPAID, PROOF_UPLOADED, VERIFYING, PAID, REJECTED, REFUNDED
            $table->bigInteger('subtotal_amount')->default(0);
            $table->bigInteger('discount_amount')->default(0);
            $table->bigInteger('tax_amount')->default(0); // PB1 10% or configurable
            $table->bigInteger('total_amount')->default(0);
            $table->bigInteger('cogs_amount')->default(0); // Calculated recipe COGS when stock deducted
            $table->boolean('stock_deducted')->default(false);
            $table->timestamp('stock_deducted_at')->nullable();
            $table->boolean('stock_restored')->default(false);
            $table->text('cancel_reason')->nullable();
            $table->string('created_by_actor')->nullable();
            $table->foreignId('handled_by_employee_id')->nullable()->constrained('employee_profiles')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('preparing_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->boolean('waiter_called')->default(false);
            $table->timestamp('waiter_called_at')->nullable();
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name_snapshot');
            $table->string('product_sku_snapshot')->nullable();
            $table->bigInteger('unit_price_snapshot');
            $table->bigInteger('options_price_snapshot')->default(0);
            $table->integer('quantity');
            $table->bigInteger('line_total');
            $table->bigInteger('unit_cogs_snapshot')->default(0);
            $table->string('item_note', 250)->nullable(); // Max 250 chars per item
            $table->timestamps();
        });

        Schema::create('order_item_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('product_option_id')->nullable()->constrained('product_options')->nullOnDelete();
            $table->foreignId('product_option_value_id')->nullable()->constrained('product_option_values')->nullOnDelete();
            $table->string('option_name_snapshot');
            $table->string('option_value_snapshot');
            $table->bigInteger('price_delta_snapshot')->default(0);
            $table->timestamps();
        });

        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('previous_status')->nullable();
            $table->string('next_status');
            $table->string('actor_name');
            $table->string('actor_role')->default('system'); // customer, employee, owner, system
            $table->text('reason')->nullable();
            $table->timestamps();
        });

        // 5. Payments & Cash Accounts & Cash Transactions
        Schema::create('cash_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // CASH_DRAWER, QRIS_BANK
            $table->string('name'); // Kas Tunai Laci, Rekening QRIS & Giro BCA
            $table->string('type')->default('CASH'); // CASH, BANK
            $table->bigInteger('opening_balance')->default(0);
            $table->bigInteger('current_balance')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('payment_code')->unique();
            $table->string('idempotency_key', 64)->nullable()->unique();
            $table->string('method'); // CASH, QRIS
            $table->string('status')->default('UNPAID');
            // UNPAID, PROOF_UPLOADED, VERIFYING, PAID, REJECTED, REFUNDED
            $table->bigInteger('amount_due');
            $table->bigInteger('amount_received')->default(0);
            $table->bigInteger('change_amount')->default(0);
            $table->string('proof_file_path')->nullable(); // Private storage path
            $table->string('proof_reference')->nullable(); // Optional reference / bank note
            $table->timestamp('proof_uploaded_at')->nullable();
            $table->foreignId('verified_by_employee_id')->nullable()->constrained('employee_profiles')->nullOnDelete();
            $table->string('verified_by_name')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('refund_reason')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->foreignId('cash_account_id')->nullable()->constrained('cash_accounts')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_account_id')->constrained('cash_accounts')->cascadeOnDelete();
            $table->string('transaction_code')->unique();
            $table->string('direction'); // IN, OUT
            $table->string('category'); // SALES, REFUND, STOCK_PURCHASE, OPERATING_EXPENSE, OPENING_BALANCE, ADJUSTMENT
            $table->bigInteger('amount');
            $table->bigInteger('balance_before');
            $table->bigInteger('balance_after');
            $table->string('reference_type')->nullable(); // Order, Payment, Expense, StockPurchase, CashClosing
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('description')->nullable();
            $table->string('actor_name');
            $table->timestamp('occurred_at');
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
        });

        // 6. Ingredient Inventory, Recipes, Movements, Purchases, Opname
        Schema::create('ingredient_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_category_id')->nullable()->constrained('ingredient_categories')->nullOnDelete();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('notes')->nullable();
            $table->string('base_unit'); // gram, ml, pcs, butir, lembar
            $table->string('display_unit')->default('gram'); // kg, L, pcs, butir
            $table->decimal('display_Conversion_factor', 12, 4)->default(1); // e.g., 1000 for kg->gram or L->ml
            $table->decimal('current_stock', 14, 2)->default(0); // In base_unit
            $table->decimal('minimum_stock', 14, 2)->default(0); // In base_unit
            $table->bigInteger('last_purchase_price_per_display_unit')->default(0); // Rupiah per display unit
            $table->decimal('average_cost_per_base_unit', 14, 4)->default(0); // Rupiah per base unit
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('recipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->unique()->constrained('products')->cascadeOnDelete();
            $table->integer('version')->default(1);
            $table->boolean('is_validated')->default(true);
            $table->text('notes')->nullable();
            $table->string('updated_by_actor')->nullable();
            $table->timestamps();
        });

        Schema::create('recipe_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipe_id')->constrained('recipes')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('ingredients')->cascadeOnDelete();
            $table->decimal('quantity', 12, 2); // Quantity in ingredient base_unit per 1 product unit
            $table->string('unit'); // matches base_unit
            $table->timestamps();
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->constrained('ingredients')->cascadeOnDelete();
            $table->string('movement_type'); // ORDER_DEDUCTION, PURCHASE_RESTOCK, OPNAME_ADJUSTMENT, ORDER_RESTORE, MANUAL_CORRECTION
            $table->string('direction'); // IN, OUT
            $table->decimal('quantity', 14, 2); // In base_unit
            $table->decimal('stock_before', 14, 2);
            $table->decimal('stock_after', 14, 2);
            $table->bigInteger('unit_cost_snapshot')->default(0);
            $table->bigInteger('total_cost_snapshot')->default(0);
            $table->string('reference_type')->nullable(); // Order, StockPurchase, StockAdjustment
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->string('actor_name');
            $table->timestamps();
        });

        Schema::create('stock_purchases', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_code')->unique();
            $table->string('supplier_name')->nullable();
            $table->date('purchase_date');
            $table->bigInteger('total_amount');
            $table->foreignId('cash_account_id')->nullable()->constrained('cash_accounts')->nullOnDelete();
            $table->string('payment_method')->default('CASH');
            $table->string('receipt_file_path')->nullable();
            $table->text('notes')->nullable();
            $table->string('actor_name');
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
        });

        Schema::create('stock_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_purchase_id')->constrained('stock_purchases')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('ingredients')->cascadeOnDelete();
            $table->decimal('quantity_in_base_unit', 14, 2);
            $table->decimal('display_quantity', 12, 2);
            $table->string('display_unit');
            $table->bigInteger('unit_price'); // Per display unit
            $table->bigInteger('subtotal');
            $table->timestamps();
        });

        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->string('adjustment_code')->unique();
            $table->foreignId('ingredient_id')->constrained('ingredients')->cascadeOnDelete();
            $table->string('type')->default('STOCK_OPNAME'); // STOCK_OPNAME, WASTAGE, CORRECTION
            $table->decimal('system_stock', 14, 2);
            $table->decimal('physical_stock', 14, 2);
            $table->decimal('difference', 14, 2);
            $table->string('reason');
            $table->text('notes')->nullable();
            $table->string('actor_name');
            $table->timestamps();
        });

        // 7. Expenses & Cash Closings
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Listrik, Gas, Air, Kebersihan, Es Kristal, Lainnya
            $table->string('slug')->unique();
            $table->boolean('is_recurring')->default(false);
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('expense_code')->unique();
            $table->foreignId('expense_category_id')->constrained('expense_categories')->cascadeOnDelete();
            $table->foreignId('cash_account_id')->nullable()->constrained('cash_accounts')->nullOnDelete();
            $table->date('expense_date');
            $table->bigInteger('amount');
            $table->string('payment_method')->default('CASH'); // CASH, QRIS_BANK
            $table->string('description');
            $table->string('attachment_path')->nullable();
            $table->string('actor_name');
            $table->foreignId('employee_profile_id')->nullable()->constrained('employee_profiles')->nullOnDelete();
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
        });

        Schema::create('cash_closings', function (Blueprint $table) {
            $table->id();
            $table->string('closing_code')->unique();
            $table->date('closing_date');
            $table->string('shift_name'); // Shift Pagi, Shift Sore, Full Day
            $table->foreignId('employee_profile_id')->nullable()->constrained('employee_profiles')->nullOnDelete();
            $table->string('actor_name');
            $table->bigInteger('opening_cash_balance');
            $table->bigInteger('cash_sales_amount');
            $table->bigInteger('qris_sales_amount');
            $table->bigInteger('cash_expenses_amount');
            $table->bigInteger('cash_purchases_amount')->default(0);
            $table->bigInteger('cash_refunds_amount')->default(0);
            $table->bigInteger('expected_closing_cash');
            $table->bigInteger('actual_Physical_cash');
            $table->bigInteger('variance_amount'); // actual - expected
            $table->text('variance_reason')->nullable();
            $table->string('status')->default('SUBMITTED'); // SUBMITTED, LOCKED, NEEDS_REVISION
            $table->text('owner_notes')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->string('locked_by')->nullable();
            $table->timestamps();
        });

        // 8. Employee Daily Reports
        Schema::create('employee_reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_code')->unique();
            $table->date('report_date');
            $table->string('shift_name');
            $table->foreignId('employee_profile_id')->nullable()->constrained('employee_profiles')->nullOnDelete();
            $table->string('employee_name');
            // System-generated locked metrics
            $table->integer('total_orders_count')->default(0);
            $table->integer('completed_orders_count')->default(0);
            $table->integer('cancelled_orders_count')->default(0);
            $table->bigInteger('gross_revenue_amount')->default(0);
            $table->bigInteger('cash_revenue_amount')->default(0);
            $table->bigInteger('qris_revenue_amount')->default(0);
            $table->bigInteger('refund_amount')->default(0);
            $table->bigInteger('expenses_amount')->default(0);
            // Field reports
            $table->string('crowd_condition')->default('normal'); // ramai, normal, sepi
            $table->string('crowd_peak_note')->nullable();
            $table->string('stock_condition')->default('aman'); // aman, menipis, habis
            $table->text('stock_concerns')->nullable();
            $table->text('operational_issues')->nullable();
            $table->text('additional_notes')->nullable();
            $table->string('status')->default('submitted'); // draft, submitted, reviewed, needs_revision
            $table->text('owner_feedback')->nullable();
            $table->string('reviewed_by')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
        });

        Schema::create('employee_report_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_report_id')->constrained('employee_reports')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('file_name');
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        // 9. Customer Ratings (One overall 1-5 rating per completed order)
        Schema::create('ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained('orders')->cascadeOnDelete();
            $table->foreignId('dining_table_id')->nullable()->constrained('dining_tables')->nullOnDelete();
            $table->unsignedTinyInteger('stars'); // 1..5
            $table->json('tags')->nullable(); // e.g., ["Kopi Pas Mantap", "Pelayanan Ramah & Cepat"]
            $table->text('comment')->nullable();
            $table->string('customer_display_name')->nullable();
            $table->boolean('is_public_wall')->default(true);
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
        });

        // 10. Traffic Events, Notifications, System Settings, Audit Logs
        Schema::create('traffic_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type')->index(); // QR_MENU_VISIT, ORDER_CREATED, PAYMENT_CONFIRMED, ORDER_COMPLETED, ORDER_CANCELLED
            $table->foreignId('dining_table_id')->nullable()->constrained('dining_tables')->nullOnDelete();
            $table->foreignId('table_session_id')->nullable()->constrained('table_sessions')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->bigInteger('amount')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('target_role')->default('cashier'); // cashier, owner
            $table->string('type'); // NEW_ORDER, PAYMENT_PROOF, WAITER_CALL, LOW_STOCK, DAILY_REPORT
            $table->string('title');
            $table->text('message');
            $table->string('reference_code')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });

        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, integer, boolean, json, file
            $table->string('group')->default('general'); // general, payment, tax, operational
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action')->index();
            $table->string('actor_name');
            $table->string('actor_role'); // employee, owner, system
            $table->string('shift_info')->nullable();
            $table->string('entity_type');
            $table->string('entity_id')->nullable();
            $table->text('summary');
            $table->json('before_state')->nullable();
            $table->json('after_state')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('traffic_events');
        Schema::dropIfExists('ratings');
        Schema::dropIfExists('employee_report_attachments');
        Schema::dropIfExists('employee_reports');
        Schema::dropIfExists('cash_closings');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('stock_purchase_items');
        Schema::dropIfExists('stock_purchases');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('recipe_items');
        Schema::dropIfExists('recipes');
        Schema::dropIfExists('ingredients');
        Schema::dropIfExists('ingredient_categories');
        Schema::dropIfExists('cash_transactions');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('cash_accounts');
        Schema::dropIfExists('order_status_histories');
        Schema::dropIfExists('order_item_options');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('product_option_values');
        Schema::dropIfExists('product_options');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('table_sessions');
        Schema::dropIfExists('dining_tables');
        Schema::dropIfExists('employee_sessions');
        Schema::dropIfExists('employee_profiles');
    }
};
