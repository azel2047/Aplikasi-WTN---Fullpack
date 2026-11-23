<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\CashAccount;
use App\Models\CashClosing;
use App\Models\CashTransaction;
use App\Models\Category;
use App\Models\DiningTable;
use App\Models\EmployeeProfile;
use App\Models\EmployeeReport;
use App\Models\EmployeeSession;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Ingredient;
use App\Models\IngredientCategory;
use App\Models\InventoryMovement;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemOption;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\ProductOptionValue;
use App\Models\Rating;
use App\Models\Recipe;
use App\Models\RecipeItem;
use App\Models\StockPurchase;
use App\Models\StockPurchaseItem;
use App\Models\SystemSetting;
use App\Models\TableSession;
use App\Models\TrafficEvent;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. System Settings
        SystemSetting::setValue('business_name', 'Warkop Teras Nenek', 'string', 'general', 'Nama resmi usaha');
        SystemSetting::setValue('business_tagline', 'Kopi Tubruk, Susu Aren & Masakan Hangat Teras', 'string', 'general', 'Slogan usaha');
        SystemSetting::setValue('business_address', 'Jl. Teras Rindang No. 14, Yogyakarta', 'string', 'general', 'Alamat outlet');
        SystemSetting::setValue('business_phone', '0812-3456-7890', 'string', 'general', 'Nomor kontak usaha');
        SystemSetting::setValue('wifi_ssid', 'WarkopTeras_5G', 'string', 'operational', 'SSID WiFi Pelanggan');
        SystemSetting::setValue('wifi_password', 'ngopidulu123', 'string', 'operational', 'Sandi WiFi Pelanggan');
        SystemSetting::setValue('tax_pb1_percentage', 10, 'integer', 'tax', 'Persentase Pajak Restoran PB1 (%)');
        SystemSetting::setValue('tax_enabled', true, 'boolean', 'tax', 'Aktifkan perhitungan PB1 pada order');
        SystemSetting::setValue('qris_merchant_name', 'WARKOP TERAS NENEK (DEMO - BELUM DIKONFIGURASI RESMI)', 'string', 'payment', 'Nama Merchant QRIS');
        SystemSetting::setValue('qris_nmid', 'ID1026000000000 (DEMO)', 'string', 'payment', 'NMID QRIS Statis');
        SystemSetting::setValue('qris_bank_info', 'QRIS Statis Merchant (Konfigurasi melalui Pengaturan Owner)', 'string', 'payment', 'Informasi kanal QRIS');
        SystemSetting::setValue('qris_image_path', null, 'file', 'payment', 'Path gambar QRIS statis resmi');
        SystemSetting::setValue('demo_mode_notice', true, 'boolean', 'general', 'Penanda bahwa database berisi data seeder demo');

        // 2. Users (1 Owner account, 1 Shared Employee account)
        $owner = User::create([
            'name' => 'Nenek Sari (Owner)',
            'email' => 'owner@warkopterasnenek.id',
            'password' => Hash::make('owner123'),
            'role' => 'owner',
            'pin_hash' => Hash::make('9999'),
            'is_active' => true,
        ]);

        $sharedEmployeeUser = User::create([
            'name' => 'Akun Bersama Karyawan',
            'email' => 'kasir@warkopterasnenek.id',
            'password' => Hash::make('kasir123'),
            'role' => 'employee',
            'pin_hash' => Hash::make('1234'),
            'is_active' => true,
        ]);

        // 3. Employee Profiles for shift identity selection
        $empRina = EmployeeProfile::create([
            'name' => 'Rina Wulandari',
            'code' => 'EMP-01',
            'role_title' => 'Kasir & Barista Pagi',
            'default_shift' => 'Shift Pagi',
            'pin_hash' => Hash::make('1234'),
            'is_active' => true,
        ]);

        $empBudi = EmployeeProfile::create([
            'name' => 'Budi Santoso',
            'code' => 'EMP-02',
            'role_title' => 'Barista & Kasir Sore',
            'default_shift' => 'Shift Sore',
            'pin_hash' => Hash::make('2345'),
            'is_active' => true,
        ]);

        $empRiko = EmployeeProfile::create([
            'name' => 'Riko Pratama',
            'code' => 'EMP-03',
            'role_title' => 'Dapur & Barista',
            'default_shift' => 'Shift Sore',
            'pin_hash' => Hash::make('3456'),
            'is_active' => true,
        ]);

        EmployeeSession::create([
            'user_id' => $sharedEmployeeUser->id,
            'employee_profile_id' => $empRina->id,
            'shift_name' => 'Shift Pagi (07.00 - 15.00)',
            'terminal_name' => 'Terminal Meja Depan',
            'started_at' => now()->subHours(4),
            'is_active' => true,
        ]);

        // 4. Exactly 9 Dining Tables with unique opaque QR tokens
        // We use deterministic yet opaque 24-char random-looking tokens for easy demo links + ability to regenerate
        $fixedTokens = [
            1 => 'wtn_tbl01_9f8a7b6c5d4e3f2a1b',
            2 => 'wtn_tbl02_2c3d4e5f6a7b8c9d0e',
            3 => 'wtn_tbl03_7e6f5a4b3c2d1e0f9a',
            4 => 'wtn_tbl04_4a5b6c7d8e9f0a1b2c',
            5 => 'wtn_tbl05_5d6e7f8a9b0c1d2e3f',
            6 => 'wtn_tbl06_6f7a8b9c0d1e2f3a4b',
            7 => 'wtn_tbl07_7a8b9c0d1e2f3a4b5c',
            8 => 'wtn_tbl08_8b9c0d1e2f3a4b5c6d',
            9 => 'wtn_tbl09_9c0d1e2f3a4b5c6d7e',
        ];

        $tables = [];
        for ($i = 1; $i <= 9; $i++) {
            $code = sprintf('TBL-%02d', $i);
            $area = $i <= 4 ? 'Teras Depan' : ($i <= 7 ? 'Ruang Tengah' : 'Sudut Taman');
            $tables[$i] = DiningTable::create([
                'code' => $code,
                'name' => "Meja {$i}",
                'area' => $area,
                'capacity' => $i === 6 || $i === 9 ? 6 : 4,
                'qr_token' => $fixedTokens[$i],
                'is_active' => true,
                'qr_generated_at' => now()->subDays(14),
                'last_scanned_at' => in_array($i, [2, 4, 7]) ? now()->subMinutes($i * 4) : now()->subHours(2),
            ]);
        }

        // 5. Ingredient Categories & Ingredients
        $catKopi = IngredientCategory::create(['name' => 'Kopi', 'slug' => 'kopi']);
        $catSusu = IngredientCategory::create(['name' => 'Susu & Krimer', 'slug' => 'susu-krimer']);
        $catPemanis = IngredientCategory::create(['name' => 'Pemanis', 'slug' => 'pemanis']);
        $catTeh = IngredientCategory::create(['name' => 'Teh & Minuman', 'slug' => 'teh-minuman']);
        $catMakanan = IngredientCategory::create(['name' => 'Mie & Makanan', 'slug' => 'mie-makanan']);

        $ingRobusta = Ingredient::create([
            'ingredient_category_id' => $catKopi->id,
            'code' => 'ING-001',
            'name' => 'Biji Kopi Robusta',
            'notes' => 'Gilingan Halus/Medium Temanggung',
            'base_unit' => 'gram',
            'display_unit' => 'kg',
            'display_Conversion_factor' => 1000,
            'current_stock' => 6200, // 6.2 kg
            'minimum_stock' => 2000, // 2 kg
            'last_purchase_price_per_display_unit' => 140000, // Rp 140.000/kg
            'average_cost_per_base_unit' => 140, // Rp 140/gram
            'is_active' => true,
        ]);

        $ingSusu = Ingredient::create([
            'ingredient_category_id' => $catSusu->id,
            'code' => 'ING-002',
            'name' => 'Susu Cair Full Cream',
            'notes' => 'Pasteurisasi Segar',
            'base_unit' => 'ml',
            'display_unit' => 'L',
            'display_Conversion_factor' => 1000,
            'current_stock' => 2400, // 2.4 L (Menipis < 3 L)
            'minimum_stock' => 3000, // 3 L
            'last_purchase_price_per_display_unit' => 18000, // Rp 18.000/L
            'average_cost_per_base_unit' => 18, // Rp 18/ml
            'is_active' => true,
        ]);

        $ingGulaAren = Ingredient::create([
            'ingredient_category_id' => $catPemanis->id,
            'code' => 'ING-003',
            'name' => 'Gula Aren Cair Organik',
            'notes' => 'Cair Organik Murni',
            'base_unit' => 'ml',
            'display_unit' => 'kg',
            'display_Conversion_factor' => 1000,
            'current_stock' => 850, // 0.85 kg (Menipis < 1 kg)
            'minimum_stock' => 1000,
            'last_purchase_price_per_display_unit' => 24000,
            'average_cost_per_base_unit' => 24,
            'is_active' => true,
        ]);

        $ingTeh = Ingredient::create([
            'ingredient_category_id' => $catTeh->id,
            'code' => 'ING-004',
            'name' => 'Teh Bubuk Melati Solo',
            'notes' => 'Racikan Pekat Wangi Melati',
            'base_unit' => 'gram',
            'display_unit' => 'kg',
            'display_Conversion_factor' => 1000,
            'current_stock' => 2100, // 2.1 kg
            'minimum_stock' => 1000,
            'last_purchase_price_per_display_unit' => 65000,
            'average_cost_per_base_unit' => 65,
            'is_active' => true,
        ]);

        $ingKentalManis = Ingredient::create([
            'ingredient_category_id' => $catSusu->id,
            'code' => 'ING-005',
            'name' => 'Susu Kental Manis',
            'notes' => 'Kaleng Krimer Kental',
            'base_unit' => 'ml',
            'display_unit' => 'L',
            'display_Conversion_factor' => 1000,
            'current_stock' => 3500,
            'minimum_stock' => 1000,
            'last_purchase_price_per_display_unit' => 25000,
            'average_cost_per_base_unit' => 25,
            'is_active' => true,
        ]);

        $ingIndomieGoreng = Ingredient::create([
            'ingredient_category_id' => $catMakanan->id,
            'code' => 'ING-006',
            'name' => 'Mie Instan Goreng',
            'notes' => 'Kemasan Standar 85g',
            'base_unit' => 'pcs',
            'display_unit' => 'pcs',
            'display_Conversion_factor' => 1,
            'current_stock' => 16, // Menipis (< 20 pcs)
            'minimum_stock' => 20,
            'last_purchase_price_per_display_unit' => 3100,
            'average_cost_per_base_unit' => 3100,
            'is_active' => true,
        ]);

        $ingIndomieSoto = Ingredient::create([
            'ingredient_category_id' => $catMakanan->id,
            'code' => 'ING-007',
            'name' => 'Mie Instan Kuah Soto',
            'notes' => 'Kemasan Standar Kuah',
            'base_unit' => 'pcs',
            'display_unit' => 'pcs',
            'display_Conversion_factor' => 1,
            'current_stock' => 35,
            'minimum_stock' => 15,
            'last_purchase_price_per_display_unit' => 3000,
            'average_cost_per_base_unit' => 3000,
            'is_active' => true,
        ]);

        $ingTelur = Ingredient::create([
            'ingredient_category_id' => $catMakanan->id,
            'code' => 'ING-008',
            'name' => 'Telur Ayam Negeri',
            'notes' => 'Grade A Segar',
            'base_unit' => 'butir',
            'display_unit' => 'butir',
            'display_Conversion_factor' => 1,
            'current_stock' => 54,
            'minimum_stock' => 30,
            'last_purchase_price_per_display_unit' => 2000,
            'average_cost_per_base_unit' => 2000,
            'is_active' => true,
        ]);

        $ingPisang = Ingredient::create([
            'ingredient_category_id' => $catMakanan->id,
            'code' => 'ING-009',
            'name' => 'Pisang Kepok Kuning',
            'notes' => 'Siap Goreng',
            'base_unit' => 'buah',
            'display_unit' => 'buah',
            'display_Conversion_factor' => 1,
            'current_stock' => 65,
            'minimum_stock' => 20,
            'last_purchase_price_per_display_unit' => 1000,
            'average_cost_per_base_unit' => 1000,
            'is_active' => true,
        ]);

        $ingRotiTawar = Ingredient::create([
            'ingredient_category_id' => $catMakanan->id,
            'code' => 'ING-010',
            'name' => 'Roti Tawar Tebal Bandung',
            'notes' => 'Khusus Roti Bakar',
            'base_unit' => 'lembar',
            'display_unit' => 'lembar',
            'display_Conversion_factor' => 1,
            'current_stock' => 24,
            'minimum_stock' => 10,
            'last_purchase_price_per_display_unit' => 1500,
            'average_cost_per_base_unit' => 1500,
            'is_active' => true,
        ]);

        // 6. Menu Categories, Products, Options & Recipes
        $menuKopi = Category::create(['name' => 'Kopi Nusantara', 'slug' => 'kopi', 'sort_order' => 1, 'is_active' => true]);
        $menuNonKopi = Category::create(['name' => 'Teh & Non-Kopi', 'slug' => 'teh-non-kopi', 'sort_order' => 2, 'is_active' => true]);
        $menuMakanan = Category::create(['name' => 'Makanan Berat', 'slug' => 'makanan-berat', 'sort_order' => 3, 'is_active' => true]);
        $menuCamilan = Category::create(['name' => 'Camilan Teras', 'slug' => 'camilan', 'sort_order' => 4, 'is_active' => true]);

        // Product 1: Kopi Hitam Tubruk
        $pKopiHitam = Product::create([
            'category_id' => $menuKopi->id,
            'sku' => 'MNU-001',
            'name' => 'Kopi Hitam Tubruk',
            'slug' => 'kopi-hitam-tubruk',
            'description' => 'Kopi tubruk robusta pilihan, seduh panas tradisi warkop dengan aroma pekat.',
            'price' => 6000,
            'image_url' => 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
            'unit_label' => 'cangkir',
            'is_available' => true,
            'track_inventory' => true,
            'sort_order' => 1,
        ]);
        $optGulaKopi = ProductOption::create(['product_id' => $pKopiHitam->id, 'name' => 'Takaran Gula', 'selection_type' => 'single', 'is_required' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optGulaKopi->id, 'name' => 'Manis Normal', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optGulaKopi->id, 'name' => 'Gula Sedikit (50%)', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 2]);
        ProductOptionValue::create(['product_option_id' => $optGulaKopi->id, 'name' => 'Tanpa Gula (Pahit)', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 3]);

        $recKopiHitam = Recipe::create(['product_id' => $pKopiHitam->id, 'version' => 1, 'is_validated' => true, 'notes' => '15g kopi robusta seduh panas', 'updated_by_actor' => 'Nenek Sari']);
        RecipeItem::create(['recipe_id' => $recKopiHitam->id, 'ingredient_id' => $ingRobusta->id, 'quantity' => 15, 'unit' => 'gram']);

        // Product 2: Kopi Susu Gula Aren
        $pKopiSusu = Product::create([
            'category_id' => $menuKopi->id,
            'sku' => 'MNU-002',
            'name' => 'Kopi Susu Gula Aren',
            'slug' => 'kopi-susu-gula-aren',
            'description' => 'Racikan khas Teras Nenek: kopi robusta pekat, susu full cream segar, dan gula aren organik.',
            'price' => 12000,
            'image_url' => 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
            'unit_label' => 'gelas',
            'is_available' => true,
            'track_inventory' => true,
            'sort_order' => 2,
        ]);
        $optSuhu = ProductOption::create(['product_id' => $pKopiSusu->id, 'name' => 'Suhu Minuman', 'selection_type' => 'single', 'is_required' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optSuhu->id, 'name' => 'Dingin (Es Kristal)', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optSuhu->id, 'name' => 'Hangat', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 2]);

        $optManis = ProductOption::create(['product_id' => $pKopiSusu->id, 'name' => 'Tingkat Manis Aren', 'selection_type' => 'single', 'is_required' => true, 'sort_order' => 2]);
        ProductOptionValue::create(['product_option_id' => $optManis->id, 'name' => 'Normal', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optManis->id, 'name' => '50% (Less Sweet)', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 2]);
        ProductOptionValue::create(['product_option_id' => $optManis->id, 'name' => 'Extra Aren', 'price_delta' => 2000, 'is_default' => false, 'sort_order' => 3]);

        $optToppingKopi = ProductOption::create(['product_id' => $pKopiSusu->id, 'name' => 'Tambahan', 'selection_type' => 'multiple', 'is_required' => false, 'sort_order' => 3]);
        ProductOptionValue::create(['product_option_id' => $optToppingKopi->id, 'name' => 'Extra Shot Kopi', 'price_delta' => 3000, 'is_default' => false, 'sort_order' => 1]);

        $recKopiSusu = Recipe::create(['product_id' => $pKopiSusu->id, 'version' => 1, 'is_validated' => true, 'notes' => '15g kopi, 120ml susu cair, 25ml gula aren', 'updated_by_actor' => 'Nenek Sari']);
        RecipeItem::create(['recipe_id' => $recKopiSusu->id, 'ingredient_id' => $ingRobusta->id, 'quantity' => 15, 'unit' => 'gram']);
        RecipeItem::create(['recipe_id' => $recKopiSusu->id, 'ingredient_id' => $ingSusu->id, 'quantity' => 120, 'unit' => 'ml']);
        RecipeItem::create(['recipe_id' => $recKopiSusu->id, 'ingredient_id' => $ingGulaAren->id, 'quantity' => 25, 'unit' => 'ml']);

        // Product 3: Teh Tarik Rempah
        $pTehTarik = Product::create([
            'category_id' => $menuNonKopi->id,
            'sku' => 'MNU-003',
            'name' => 'Teh Tarik',
            'slug' => 'teh-tarik',
            'description' => 'Teh melati Solo pekat ditarik dengan susu kental manis hingga berbusa lembut.',
            'price' => 10000,
            'image_url' => 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
            'unit_label' => 'gelas',
            'is_available' => true,
            'track_inventory' => true,
            'sort_order' => 1,
        ]);
        $optSuhuTeh = ProductOption::create(['product_id' => $pTehTarik->id, 'name' => 'Penyajian', 'selection_type' => 'single', 'is_required' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optSuhuTeh->id, 'name' => 'Dingin (Es)', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optSuhuTeh->id, 'name' => 'Hangat', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 2]);

        $recTehTarik = Recipe::create(['product_id' => $pTehTarik->id, 'version' => 1, 'is_validated' => true, 'notes' => '10g teh bubuk, 40ml kental manis', 'updated_by_actor' => 'Nenek Sari']);
        RecipeItem::create(['recipe_id' => $recTehTarik->id, 'ingredient_id' => $ingTeh->id, 'quantity' => 10, 'unit' => 'gram']);
        RecipeItem::create(['recipe_id' => $recTehTarik->id, 'ingredient_id' => $ingKentalManis->id, 'quantity' => 40, 'unit' => 'ml']);

        // Product 4: Es Teh Kampul Jeruk (Product intentionally without recipe to verify AC-17: products without validated recipe do not deduct stock)
        $pEsTeh = Product::create([
            'category_id' => $menuNonKopi->id,
            'sku' => 'MNU-004',
            'name' => 'Wedang Jahe Sereh',
            'slug' => 'wedang-jahe-sereh',
            'description' => 'Seduhan jahe emprit bakar dan sereh segar penghangat badan (Menu Non-Resep).',
            'price' => 8000,
            'image_url' => 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
            'unit_label' => 'gelas',
            'is_available' => true,
            'track_inventory' => false,
            'sort_order' => 2,
        ]);

        // Product 5: Indomie Goreng Telur
        $pIndomieGoreng = Product::create([
            'category_id' => $menuMakanan->id,
            'sku' => 'MNU-005',
            'name' => 'Indomie Goreng Telur',
            'slug' => 'indomie-goreng-telur',
            'description' => 'Indomie goreng lengkap dengan telur mata sapi/dadar, sawi hijau, dan bawang goreng renyah.',
            'price' => 13000,
            'image_url' => 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=600&q=80',
            'unit_label' => 'porsi',
            'is_available' => true,
            'track_inventory' => true,
            'sort_order' => 1,
        ]);
        $optTelur = ProductOption::create(['product_id' => $pIndomieGoreng->id, 'name' => 'Olahan Telur', 'selection_type' => 'single', 'is_required' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optTelur->id, 'name' => 'Mata Sapi Setengah Matang', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optTelur->id, 'name' => 'Mata Sapi Matang', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 2]);
        ProductOptionValue::create(['product_option_id' => $optTelur->id, 'name' => 'Telur Dadar', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 3]);

        $optPedas = ProductOption::create(['product_id' => $pIndomieGoreng->id, 'name' => 'Level Rawit', 'selection_type' => 'single', 'is_required' => false, 'sort_order' => 2]);
        ProductOptionValue::create(['product_option_id' => $optPedas->id, 'name' => 'Tidak Pedas', 'price_delta' => 0, 'is_default' => true, 'sort_order' => 1]);
        ProductOptionValue::create(['product_option_id' => $optPedas->id, 'name' => 'Sedang (3 Rawit)', 'price_delta' => 0, 'is_default' => false, 'sort_order' => 2]);
        ProductOptionValue::create(['product_option_id' => $optPedas->id, 'name' => 'Pedas Nampol (7 Rawit)', 'price_delta' => 1000, 'is_default' => false, 'sort_order' => 3]);

        $recIndomieGoreng = Recipe::create(['product_id' => $pIndomieGoreng->id, 'version' => 1, 'is_validated' => true, 'notes' => '1 bungkus mie goreng + 1 butir telur', 'updated_by_actor' => 'Nenek Sari']);
        RecipeItem::create(['recipe_id' => $recIndomieGoreng->id, 'ingredient_id' => $ingIndomieGoreng->id, 'quantity' => 1, 'unit' => 'pcs']);
        RecipeItem::create(['recipe_id' => $recIndomieGoreng->id, 'ingredient_id' => $ingTelur->id, 'quantity' => 1, 'unit' => 'butir']);

        // Product 6: Indomie Rebus Soto Telur
        $pIndomieRebus = Product::create([
            'category_id' => $menuMakanan->id,
            'sku' => 'MNU-006',
            'name' => 'Indomie Kuah Soto Telur',
            'slug' => 'indomie-kuah-soto-telur',
            'description' => 'Indomie rebus kuah soto hangat dengan telur rebus, sayur sawi, dan irisan jeruk nipis.',
            'price' => 13000,
            'image_url' => 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
            'unit_label' => 'porsi',
            'is_available' => true,
            'track_inventory' => true,
            'sort_order' => 2,
        ]);
        $recIndomieRebus = Recipe::create(['product_id' => $pIndomieRebus->id, 'version' => 1, 'is_validated' => true, 'notes' => '1 bungkus mie soto + 1 butir telur', 'updated_by_actor' => 'Nenek Sari']);
        RecipeItem::create(['recipe_id' => $recIndomieRebus->id, 'ingredient_id' => $ingIndomieSoto->id, 'quantity' => 1, 'unit' => 'pcs']);
        RecipeItem::create(['recipe_id' => $recIndomieRebus->id, 'ingredient_id' => $ingTelur->id, 'quantity' => 1, 'unit' => 'butir']);

        // Product 7: Pisang Goreng Gula Aren (5 pcs)
        $pPisang = Product::create([
            'category_id' => $menuCamilan->id,
            'sku' => 'MNU-007',
            'name' => 'Pisang Goreng Gula Aren (5 pcs)',
            'slug' => 'pisang-goreng-gula-aren',
            'description' => 'Pisang kepok manis digoreng tepung krispi hangat dengan taburan gula aren.',
            'price' => 10000,
            'image_url' => 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
            'unit_label' => 'porsi',
            'is_available' => true,
            'track_inventory' => true,
            'sort_order' => 1,
        ]);
        $recPisang = Recipe::create(['product_id' => $pPisang->id, 'version' => 1, 'is_validated' => true, 'notes' => '3 buah pisang kepok belah + 15ml gula aren', 'updated_by_actor' => 'Nenek Sari']);
        RecipeItem::create(['recipe_id' => $recPisang->id, 'ingredient_id' => $ingPisang->id, 'quantity' => 3, 'unit' => 'buah']);
        RecipeItem::create(['recipe_id' => $recPisang->id, 'ingredient_id' => $ingGulaAren->id, 'quantity' => 15, 'unit' => 'ml']);

        // Product 8: Roti Bakar Cokelat Keju
        $pRotiBakar = Product::create([
            'category_id' => $menuCamilan->id,
            'sku' => 'MNU-008',
            'name' => 'Roti Bakar Cokelat Keju',
            'slug' => 'roti-bakar-cokelat-keju',
            'description' => 'Roti tawar tebal Bandung dibakar mentega dengan isian meses cokelat lumer dan keju parut.',
            'price' => 15000,
            'image_url' => 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
            'unit_label' => 'porsi',
            'is_available' => true,
            'track_inventory' => true,
            'sort_order' => 2,
        ]);
        $recRotiBakar = Recipe::create(['product_id' => $pRotiBakar->id, 'version' => 1, 'is_validated' => true, 'notes' => '2 lembar roti tawar + 20ml kental manis', 'updated_by_actor' => 'Nenek Sari']);
        RecipeItem::create(['recipe_id' => $recRotiBakar->id, 'ingredient_id' => $ingRotiTawar->id, 'quantity' => 2, 'unit' => 'lembar']);
        RecipeItem::create(['recipe_id' => $recRotiBakar->id, 'ingredient_id' => $ingKentalManis->id, 'quantity' => 20, 'unit' => 'ml']);

        // 7. Cash Accounts (Cash Drawer & QRIS Bank)
        $accCash = CashAccount::create([
            'code' => 'CASH_DRAWER',
            'name' => 'Kas Tunai Laci Kasir',
            'type' => 'CASH',
            'opening_balance' => 500000,
            'current_balance' => 500000,
            'is_active' => true,
        ]);

        $accQris = CashAccount::create([
            'code' => 'QRIS_BANK',
            'name' => 'Rekening QRIS & Giro Bank',
            'type' => 'BANK',
            'opening_balance' => 1500000,
            'current_balance' => 1500000,
            'is_active' => true,
        ]);

        // 8. Expense Categories
        $expGas = ExpenseCategory::create(['name' => 'Gas & Bahan Bakar Dapur', 'slug' => 'gas-dapur', 'is_recurring' => true]);
        $expListrik = ExpenseCategory::create(['name' => 'Listrik & Air', 'slug' => 'listrik-air', 'is_recurring' => true]);
        $expEs = ExpenseCategory::create(['name' => 'Es Batu Kristal', 'slug' => 'es-kristal', 'is_recurring' => true]);
        $expKebersihan = ExpenseCategory::create(['name' => 'Kebersihan & Perlengkapan', 'slug' => 'kebersihan', 'is_recurring' => false]);
        $expLain = ExpenseCategory::create(['name' => 'Operasional Lainnya', 'slug' => 'lainnya', 'is_recurring' => false]);

        // 9. Demo Operational Data (Clearly flagged with is_demo = true)
        // A. Stock Purchase (Restock) - Recorded as cash outflow & inventory addition, NOT immediate COGS
        $purchase = StockPurchase::create([
            'purchase_code' => 'PO-DEMO-001',
            'supplier_name' => 'Grosir Sembako & Kopi Pak Slamet',
            'purchase_date' => now()->subDays(1)->toDateString(),
            'total_amount' => 176000,
            'cash_account_id' => $accCash->id,
            'payment_method' => 'CASH',
            'notes' => '[DATA DEMO] Restock kopi robusta 1kg dan susu full cream 2L',
            'actor_name' => 'Rina Wulandari',
            'is_demo' => true,
        ]);

        StockPurchaseItem::create([
            'stock_purchase_id' => $purchase->id,
            'ingredient_id' => $ingRobusta->id,
            'quantity_in_base_unit' => 1000,
            'display_quantity' => 1,
            'display_unit' => 'kg',
            'unit_price' => 140000,
            'subtotal' => 140000,
        ]);

        StockPurchaseItem::create([
            'stock_purchase_id' => $purchase->id,
            'ingredient_id' => $ingSusu->id,
            'quantity_in_base_unit' => 2000,
            'display_quantity' => 2,
            'display_unit' => 'L',
            'unit_price' => 18000,
            'subtotal' => 36000,
        ]);

        $balBefore = $accCash->current_balance;
        $accCash->update(['current_balance' => $balBefore - 176000]);
        CashTransaction::create([
            'cash_account_id' => $accCash->id,
            'transaction_code' => 'TRX-PO-001',
            'direction' => 'OUT',
            'category' => 'STOCK_PURCHASE',
            'amount' => 176000,
            'balance_before' => $balBefore,
            'balance_after' => $accCash->current_balance,
            'reference_type' => 'StockPurchase',
            'reference_id' => $purchase->id,
            'description' => '[DATA DEMO] Pembelian persediaan PO-DEMO-001',
            'actor_name' => 'Rina Wulandari',
            'occurred_at' => now()->subDays(1),
            'is_demo' => true,
        ]);

        // B. Operating Expense
        $expense = Expense::create([
            'expense_code' => 'EXP-DEMO-001',
            'expense_category_id' => $expGas->id,
            'cash_account_id' => $accCash->id,
            'expense_date' => now()->toDateString(),
            'amount' => 22000,
            'payment_method' => 'CASH',
            'description' => '[DATA DEMO] Isi ulang tabung gas LPG 3kg dapur warkop',
            'actor_name' => 'Rina Wulandari',
            'employee_profile_id' => $empRina->id,
            'is_demo' => true,
        ]);

        $balBefore = $accCash->current_balance;
        $accCash->update(['current_balance' => $balBefore - 22000]);
        CashTransaction::create([
            'cash_account_id' => $accCash->id,
            'transaction_code' => 'TRX-EXP-001',
            'direction' => 'OUT',
            'category' => 'OPERATING_EXPENSE',
            'amount' => 22000,
            'balance_before' => $balBefore,
            'balance_after' => $accCash->current_balance,
            'reference_type' => 'Expense',
            'reference_id' => $expense->id,
            'description' => '[DATA DEMO] Pengeluaran operasional: Isi ulang gas LPG 3kg',
            'actor_name' => 'Rina Wulandari',
            'occurred_at' => now()->subHours(3),
            'is_demo' => true,
        ]);

        // C. Seed 3 Demo Orders in different states so Cashier Queue, Customer Tracking, and Owner Analytics work immediately
        // Order 1: Completed & Paid Cash (with Rating)
        $session1 = TableSession::create([
            'dining_table_id' => $tables[2]->id,
            'session_token' => 'sess_demo_tbl02_' . Str::random(12),
            'status' => 'CLOSED',
            'opened_at' => now()->subHours(2),
            'closed_at' => now()->subHours(1),
            'last_activity_at' => now()->subHours(1),
            'duration_minutes' => 55,
        ]);

        $order1 = Order::create([
            'public_code' => 'ORD-0040-DEMO1',
            'order_number' => '#0040',
            'idempotency_key' => 'idem_demo_0040',
            'source' => 'QR',
            'order_type' => 'DINE_IN',
            'dining_table_id' => $tables[2]->id,
            'table_session_id' => $session1->id,
            'table_name_snapshot' => 'Meja 2',
            'customer_name' => 'Mas Dimas',
            'status' => 'COMPLETED',
            'payment_method' => 'CASH',
            'payment_status' => 'PAID',
            'subtotal_amount' => 35000,
            'discount_amount' => 0,
            'tax_amount' => 3500,
            'total_amount' => 38500,
            'cogs_amount' => 11420,
            'stock_deducted' => true,
            'stock_deducted_at' => now()->subMinutes(110),
            'created_by_actor' => 'Mas Dimas (QR Meja 2)',
            'handled_by_employee_id' => $empRina->id,
            'confirmed_at' => now()->subMinutes(110),
            'preparing_at' => now()->subMinutes(105),
            'ready_at' => now()->subMinutes(95),
            'completed_at' => now()->subMinutes(65),
            'is_demo' => true,
        ]);

        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $pKopiSusu->id,
            'product_name_snapshot' => 'Kopi Susu Gula Aren',
            'product_sku_snapshot' => 'MNU-002',
            'unit_price_snapshot' => 12000,
            'options_price_snapshot' => 0,
            'quantity' => 1,
            'line_total' => 12000,
            'unit_cogs_snapshot' => 4860,
            'item_note' => 'Es sedikit, aduk rata',
        ]);

        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $pIndomieGoreng->id,
            'product_name_snapshot' => 'Indomie Goreng Telur',
            'product_sku_snapshot' => 'MNU-005',
            'unit_price_snapshot' => 13000,
            'options_price_snapshot' => 0,
            'quantity' => 1,
            'line_total' => 13000,
            'unit_cogs_snapshot' => 5100,
            'item_note' => 'Telur setengah matang, cabe rawit 3',
        ]);

        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $pPisang->id,
            'product_name_snapshot' => 'Pisang Goreng Gula Aren (5 pcs)',
            'product_sku_snapshot' => 'MNU-007',
            'unit_price_snapshot' => 10000,
            'options_price_snapshot' => 0,
            'quantity' => 1,
            'line_total' => 10000,
            'unit_cogs_snapshot' => 3360,
            'item_note' => 'Goreng agak garing',
        ]);

        Payment::create([
            'order_id' => $order1->id,
            'payment_code' => 'PAY-0040',
            'method' => 'CASH',
            'status' => 'PAID',
            'amount_due' => 38500,
            'amount_received' => 50000,
            'change_amount' => 11500,
            'verified_by_employee_id' => $empRina->id,
            'verified_by_name' => 'Rina Wulandari',
            'verified_at' => now()->subMinutes(110),
            'cash_account_id' => $accCash->id,
        ]);

        $balBefore = $accCash->current_balance;
        $accCash->update(['current_balance' => $balBefore + 38500]);
        CashTransaction::create([
            'cash_account_id' => $accCash->id,
            'transaction_code' => 'TRX-ORD-0040',
            'direction' => 'IN',
            'category' => 'SALES',
            'amount' => 38500,
            'balance_before' => $balBefore,
            'balance_after' => $accCash->current_balance,
            'reference_type' => 'Order',
            'reference_id' => $order1->id,
            'description' => 'Pembayaran Tunai Order #0040 (Meja 2)',
            'actor_name' => 'Rina Wulandari',
            'occurred_at' => now()->subMinutes(110),
            'is_demo' => true,
        ]);

        Rating::create([
            'order_id' => $order1->id,
            'dining_table_id' => $tables[2]->id,
            'stars' => 5,
            'tags' => ['Kopi Pas Mantap', 'Pelayanan Ramah & Cepat', 'Indomie Juara'],
            'comment' => 'Kopi susu gula arennya mantap banget, indomie setengah matangnya pas!',
            'customer_display_name' => 'Mas Dimas (Meja 2)',
            'is_public_wall' => true,
            'is_demo' => true,
        ]);

        // Order 2: Active Preparing Order (Paid QRIS) at Meja 7
        $session7 = TableSession::create([
            'dining_table_id' => $tables[7]->id,
            'session_token' => 'sess_demo_tbl07_' . Str::random(12),
            'status' => 'ACTIVE',
            'opened_at' => now()->subMinutes(25),
            'last_activity_at' => now()->subMinutes(10),
        ]);

        $order2 = Order::create([
            'public_code' => 'ORD-0041-DEMO2',
            'order_number' => '#0041',
            'idempotency_key' => 'idem_demo_0041',
            'source' => 'QR',
            'order_type' => 'DINE_IN',
            'dining_table_id' => $tables[7]->id,
            'table_session_id' => $session7->id,
            'table_name_snapshot' => 'Meja 7',
            'customer_name' => 'Mbak Nadia',
            'status' => 'PREPARING',
            'payment_method' => 'QRIS',
            'payment_status' => 'PAID',
            'subtotal_amount' => 22000,
            'discount_amount' => 0,
            'tax_amount' => 2200,
            'total_amount' => 24200,
            'cogs_amount' => 6510,
            'stock_deducted' => true,
            'stock_deducted_at' => now()->subMinutes(15),
            'created_by_actor' => 'Mbak Nadia (QR Meja 7)',
            'handled_by_employee_id' => $empRina->id,
            'confirmed_at' => now()->subMinutes(15),
            'preparing_at' => now()->subMinutes(12),
            'is_demo' => true,
        ]);

        OrderItem::create([
            'order_id' => $order2->id,
            'product_id' => $pKopiSusu->id,
            'product_name_snapshot' => 'Kopi Susu Gula Aren',
            'product_sku_snapshot' => 'MNU-002',
            'unit_price_snapshot' => 12000,
            'options_price_snapshot' => 0,
            'quantity' => 1,
            'line_total' => 12000,
            'unit_cogs_snapshot' => 4860,
            'item_note' => 'Gula 50%, es normal',
        ]);

        OrderItem::create([
            'order_id' => $order2->id,
            'product_id' => $pTehTarik->id,
            'product_name_snapshot' => 'Teh Tarik',
            'product_sku_snapshot' => 'MNU-003',
            'unit_price_snapshot' => 10000,
            'options_price_snapshot' => 0,
            'quantity' => 1,
            'line_total' => 10000,
            'unit_cogs_snapshot' => 1650,
            'item_note' => 'Disajikan hangat',
        ]);

        Payment::create([
            'order_id' => $order2->id,
            'payment_code' => 'PAY-0041',
            'method' => 'QRIS',
            'status' => 'PAID',
            'amount_due' => 24200,
            'amount_received' => 24200,
            'change_amount' => 0,
            'proof_reference' => 'QRIS-REF-882910',
            'proof_uploaded_at' => now()->subMinutes(18),
            'verified_by_employee_id' => $empRina->id,
            'verified_by_name' => 'Rina Wulandari',
            'verified_at' => now()->subMinutes(15),
            'cash_account_id' => $accQris->id,
        ]);

        $balBeforeQris = $accQris->current_balance;
        $accQris->update(['current_balance' => $balBeforeQris + 24200]);
        CashTransaction::create([
            'cash_account_id' => $accQris->id,
            'transaction_code' => 'TRX-ORD-0041',
            'direction' => 'IN',
            'category' => 'SALES',
            'amount' => 24200,
            'balance_before' => $balBeforeQris,
            'balance_after' => $accQris->current_balance,
            'reference_type' => 'Order',
            'reference_id' => $order2->id,
            'description' => 'Pembayaran QRIS Terverifikasi Order #0041 (Meja 7)',
            'actor_name' => 'Rina Wulandari',
            'occurred_at' => now()->subMinutes(15),
            'is_demo' => true,
        ]);

        // Order 3: Pending Payment QRIS with Proof Uploaded at Meja 4 (Matches Stitch screen!)
        $session4 = TableSession::create([
            'dining_table_id' => $tables[4]->id,
            'session_token' => 'sess_demo_tbl04_' . Str::random(12),
            'status' => 'ACTIVE',
            'opened_at' => now()->subMinutes(8),
            'last_activity_at' => now()->subMinutes(3),
        ]);

        $order3 = Order::create([
            'public_code' => 'ORD-0042-DEMO4',
            'order_number' => '#0042',
            'idempotency_key' => 'idem_demo_0042',
            'source' => 'QR',
            'order_type' => 'DINE_IN',
            'dining_table_id' => $tables[4]->id,
            'table_session_id' => $session4->id,
            'table_name_snapshot' => 'Meja 4',
            'customer_name' => 'Kak Raka',
            'status' => 'PENDING_PAYMENT',
            'payment_method' => 'QRIS',
            'payment_status' => 'PROOF_UPLOADED',
            'subtotal_amount' => 47000,
            'discount_amount' => 0,
            'tax_amount' => 4700,
            'total_amount' => 51700,
            'cogs_amount' => 0,
            'stock_deducted' => false,
            'created_by_actor' => 'Kak Raka (QR Meja 4)',
            'is_demo' => true,
        ]);

        OrderItem::create([
            'order_id' => $order3->id,
            'product_id' => $pKopiSusu->id,
            'product_name_snapshot' => 'Kopi Susu Gula Aren',
            'product_sku_snapshot' => 'MNU-002',
            'unit_price_snapshot' => 12000,
            'options_price_snapshot' => 0,
            'quantity' => 2,
            'line_total' => 24000,
            'item_note' => 'Es sedikit, gula 50%',
        ]);

        OrderItem::create([
            'order_id' => $order3->id,
            'product_id' => $pIndomieGoreng->id,
            'product_name_snapshot' => 'Indomie Goreng Telur',
            'product_sku_snapshot' => 'MNU-005',
            'unit_price_snapshot' => 13000,
            'options_price_snapshot' => 0,
            'quantity' => 1,
            'line_total' => 13000,
            'item_note' => 'Tanpa bawang, sambal dipisah',
        ]);

        OrderItem::create([
            'order_id' => $order3->id,
            'product_id' => $pTehTarik->id,
            'product_name_snapshot' => 'Teh Tarik',
            'product_sku_snapshot' => 'MNU-003',
            'unit_price_snapshot' => 10000,
            'options_price_snapshot' => 0,
            'quantity' => 1,
            'line_total' => 10000,
            'item_note' => 'Hangat cangkir keramik',
        ]);

        Payment::create([
            'order_id' => $order3->id,
            'payment_code' => 'PAY-0042',
            'method' => 'QRIS',
            'status' => 'PROOF_UPLOADED',
            'amount_due' => 51700,
            'amount_received' => 0,
            'change_amount' => 0,
            'proof_reference' => 'BCA m-Transfer Ref: 20261123-983120 (Rp 51.700)',
            'proof_uploaded_at' => now()->subMinutes(2),
            'cash_account_id' => $accQris->id,
        ]);

        OrderStatusHistory::create([
            'order_id' => $order3->id,
            'previous_status' => null,
            'next_status' => 'PENDING_PAYMENT',
            'actor_name' => 'Kak Raka (QR Meja 4)',
            'actor_role' => 'customer',
            'reason' => 'Pesanan dibuat melalui QR Meja 4',
        ]);

        // D. Demo Employee Report
        EmployeeReport::create([
            'report_code' => 'RPT-DEMO-001',
            'report_date' => now()->subDay()->toDateString(),
            'shift_name' => 'Shift Sore (15.00 - 22.00)',
            'employee_profile_id' => $empBudi->id,
            'employee_name' => 'Budi Santoso',
            'total_orders_count' => 18,
            'completed_orders_count' => 17,
            'cancelled_orders_count' => 1,
            'gross_revenue_amount' => 485000,
            'cash_revenue_amount' => 260000,
            'qris_revenue_amount' => 225000,
            'refund_amount' => 0,
            'expenses_amount' => 22000,
            'crowd_condition' => 'ramai',
            'crowd_peak_note' => 'Ramai mulai jam 19.00 sampai 21.00 WIB di teras depan',
            'stock_condition' => 'menipis',
            'stock_concerns' => 'Susu cair full cream dan gula aren cair mulai menipis untuk besok pagi',
            'operational_issues' => 'Lampu taman meja 8 sempat berkedip, sudah diganti bohlam cadangan',
            'additional_notes' => '[DATA DEMO] Operasional lancar, kas fisik sesuai.',
            'status' => 'submitted',
            'submitted_at' => now()->subDay()->setTime(22, 5),
            'is_demo' => true,
        ]);

        // E. Traffic Events for actual recorded demo transactions
        TrafficEvent::create([
            'event_type' => 'QR_MENU_VISIT',
            'dining_table_id' => $tables[2]->id,
            'table_session_id' => $session1->id,
            'occurred_at' => now()->subMinutes(120),
            'is_demo' => true,
        ]);
        TrafficEvent::create([
            'event_type' => 'ORDER_CREATED',
            'dining_table_id' => $tables[2]->id,
            'order_id' => $order1->id,
            'amount' => 38500,
            'occurred_at' => now()->subMinutes(115),
            'is_demo' => true,
        ]);
        TrafficEvent::create([
            'event_type' => 'PAYMENT_CONFIRMED',
            'dining_table_id' => $tables[2]->id,
            'order_id' => $order1->id,
            'amount' => 38500,
            'occurred_at' => now()->subMinutes(110),
            'is_demo' => true,
        ]);
        TrafficEvent::create([
            'event_type' => 'ORDER_COMPLETED',
            'dining_table_id' => $tables[2]->id,
            'order_id' => $order1->id,
            'amount' => 38500,
            'occurred_at' => now()->subMinutes(65),
            'is_demo' => true,
        ]);
        TrafficEvent::create([
            'event_type' => 'QR_MENU_VISIT',
            'dining_table_id' => $tables[7]->id,
            'table_session_id' => $session7->id,
            'occurred_at' => now()->subMinutes(25),
            'is_demo' => true,
        ]);
        TrafficEvent::create([
            'event_type' => 'ORDER_CREATED',
            'dining_table_id' => $tables[7]->id,
            'order_id' => $order2->id,
            'amount' => 24200,
            'occurred_at' => now()->subMinutes(20),
            'is_demo' => true,
        ]);
        TrafficEvent::create([
            'event_type' => 'PAYMENT_CONFIRMED',
            'dining_table_id' => $tables[7]->id,
            'order_id' => $order2->id,
            'amount' => 24200,
            'occurred_at' => now()->subMinutes(15),
            'is_demo' => true,
        ]);
        TrafficEvent::create([
            'event_type' => 'QR_MENU_VISIT',
            'dining_table_id' => $tables[4]->id,
            'table_session_id' => $session4->id,
            'occurred_at' => now()->subMinutes(8),
            'is_demo' => true,
        ]);
        TrafficEvent::create([
            'event_type' => 'ORDER_CREATED',
            'dining_table_id' => $tables[4]->id,
            'order_id' => $order3->id,
            'amount' => 51700,
            'occurred_at' => now()->subMinutes(3),
            'is_demo' => true,
        ]);

        Notification::create([
            'target_role' => 'cashier',
            'type' => 'PAYMENT_PROOF',
            'title' => 'Bukti QRIS Diunggah — Order #0042',
            'message' => 'Meja 4 mengunggah bukti pembayaran QRIS sebesar Rp 51.700. Verifikasi mutasi merchant sebelum menandai lunas.',
            'reference_code' => $order3->public_code,
            'is_read' => false,
        ]);

        AuditLog::record(
            'SYSTEM_SEED',
            'System Seeder',
            'system',
            'Database',
            'initial',
            'Inisialisasi database dengan 9 meja, menu, bahan baku, resep, dan data demo berlabel.'
        );
    }
}
