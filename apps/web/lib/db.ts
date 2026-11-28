import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Pool } from "pg";

// PostgreSQL persistence when DATABASE_URL / POSTGRES_URL is set, with local JSON fallback.

export interface WtnDatabase {
  counters: Record<string, number>;
  users: any[];
  employee_profiles: any[];
  employee_sessions: any[];
  dining_tables: any[];
  table_sessions: any[];
  categories: any[];
  products: any[];
  ingredients: any[];
  ingredient_categories: any[];
  recipes: any[];
  inventory_movements: any[];
  stock_purchases: any[];
  stock_adjustments: any[];
  cash_accounts: any[];
  cash_transactions: any[];
  expense_categories: any[];
  expenses: any[];
  cash_closings: any[];
  employee_reports: any[];
  orders: any[];
  ratings: any[];
  traffic_events: any[];
  notifications: any[];
  system_settings: Record<string, any>;
  audit_logs: any[];
  auth_tokens: Record<string, { user_id: number; role: string; employee_profile_id?: number; shift_name?: string }>;
  push_subscriptions?: any[];
}

const DB_FILE =
  process.env.VERCEL || process.env.NETLIFY
    ? "/tmp/wtn-db.json"
    : path.join(process.cwd(), "data", "wtn-db.json");

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createInitialSeed(): WtnDatabase {
  const now = new Date();
  const iso = (offsetMinutes = 0) =>
    new Date(now.getTime() + offsetMinutes * 60000).toISOString();
  const today = now.toISOString().slice(0, 10);

  const fixedTokens: Record<number, string> = {
    1: "wtn_tbl01_9f8a7b6c5d4e3f2a1b",
    2: "wtn_tbl02_2c3d4e5f6a7b8c9d0e",
    3: "wtn_tbl03_7e6f5a4b3c2d1e0f9a",
    4: "wtn_tbl04_4a5b6c7d8e9f0a1b2c",
    5: "wtn_tbl05_5d6e7f8a9b0c1d2e3f",
    6: "wtn_tbl06_6f7a8b9c0d1e2f3a4b",
    7: "wtn_tbl07_7a8b9c0d1e2f3a4b5c",
    8: "wtn_tbl08_8b9c0d1e2f3a4b5c6d",
    9: "wtn_tbl09_9c0d1e2f3a4b5c6d7e",
  };

  const tables = Array.from({ length: 9 }, (_, idx) => {
    const i = idx + 1;
    return {
      id: i,
      code: `TBL-0${i}`,
      name: `Meja ${i}`,
      area: i <= 4 ? "Teras Depan" : i <= 7 ? "Ruang Tengah" : "Sudut Taman",
      capacity: i === 6 || i === 9 ? 6 : 4,
      qr_token: fixedTokens[i],
      is_active: true,
      qr_generated_at: iso(-14 * 1440),
      last_scanned_at: [2, 4, 7].includes(i) ? iso(-i * 4) : iso(-120),
    };
  });

  const ingredient_categories = [
    { id: 1, name: "Kopi", slug: "kopi" },
    { id: 2, name: "Susu & Krimer", slug: "susu-krimer" },
    { id: 3, name: "Pemanis", slug: "pemanis" },
    { id: 4, name: "Teh & Minuman", slug: "teh-minuman" },
    { id: 5, name: "Mie & Makanan", slug: "mie-makanan" },
  ];

  const ingredients = [
    {
      id: 1,
      ingredient_category_id: 1,
      code: "ING-001",
      name: "Biji Kopi Robusta",
      notes: "Gilingan Halus/Medium",
      base_unit: "gram",
      display_unit: "kg",
      display_conversion_factor: 1000,
      current_stock: 6200,
      minimum_stock: 2000,
      last_purchase_price_per_display_unit: 140000,
      average_cost_per_base_unit: 140,
      is_active: true,
    },
    {
      id: 2,
      ingredient_category_id: 2,
      code: "ING-002",
      name: "Susu Cair Full Cream",
      notes: "Pasteurisasi Segar",
      base_unit: "ml",
      display_unit: "L",
      display_conversion_factor: 1000,
      current_stock: 2400,
      minimum_stock: 3000,
      last_purchase_price_per_display_unit: 18000,
      average_cost_per_base_unit: 18,
      is_active: true,
    },
    {
      id: 3,
      ingredient_category_id: 3,
      code: "ING-003",
      name: "Gula Aren Cair",
      notes: "Organik Murni",
      base_unit: "ml",
      display_unit: "kg",
      display_conversion_factor: 1000,
      current_stock: 850,
      minimum_stock: 1000,
      last_purchase_price_per_display_unit: 24000,
      average_cost_per_base_unit: 24,
      is_active: true,
    },
    {
      id: 4,
      ingredient_category_id: 4,
      code: "ING-004",
      name: "Teh Bubuk Melati",
      notes: "Racikan Pekat",
      base_unit: "gram",
      display_unit: "kg",
      display_conversion_factor: 1000,
      current_stock: 2100,
      minimum_stock: 1000,
      last_purchase_price_per_display_unit: 65000,
      average_cost_per_base_unit: 65,
      is_active: true,
    },
    {
      id: 5,
      ingredient_category_id: 2,
      code: "ING-005",
      name: "Susu Kental Manis",
      notes: "Kaleng Krimer",
      base_unit: "ml",
      display_unit: "L",
      display_conversion_factor: 1000,
      current_stock: 3500,
      minimum_stock: 1000,
      last_purchase_price_per_display_unit: 25000,
      average_cost_per_base_unit: 25,
      is_active: true,
    },
    {
      id: 6,
      ingredient_category_id: 5,
      code: "ING-006",
      name: "Mie Instan Goreng",
      notes: "Kemasan 85g",
      base_unit: "pcs",
      display_unit: "pcs",
      display_conversion_factor: 1,
      current_stock: 16,
      minimum_stock: 20,
      last_purchase_price_per_display_unit: 3100,
      average_cost_per_base_unit: 3100,
      is_active: true,
    },
    {
      id: 7,
      ingredient_category_id: 5,
      code: "ING-007",
      name: "Mie Instan Soto",
      notes: "Kemasan Kuah",
      base_unit: "pcs",
      display_unit: "pcs",
      display_conversion_factor: 1,
      current_stock: 35,
      minimum_stock: 15,
      last_purchase_price_per_display_unit: 3000,
      average_cost_per_base_unit: 3000,
      is_active: true,
    },
    {
      id: 8,
      ingredient_category_id: 5,
      code: "ING-008",
      name: "Telur Ayam",
      notes: "Grade A Segar",
      base_unit: "butir",
      display_unit: "butir",
      display_conversion_factor: 1,
      current_stock: 54,
      minimum_stock: 30,
      last_purchase_price_per_display_unit: 2000,
      average_cost_per_base_unit: 2000,
      is_active: true,
    },
    {
      id: 9,
      ingredient_category_id: 5,
      code: "ING-009",
      name: "Pisang Kepok",
      notes: "Siap Goreng",
      base_unit: "buah",
      display_unit: "buah",
      display_conversion_factor: 1,
      current_stock: 65,
      minimum_stock: 20,
      last_purchase_price_per_display_unit: 1000,
      average_cost_per_base_unit: 1000,
      is_active: true,
    },
    {
      id: 10,
      ingredient_category_id: 5,
      code: "ING-010",
      name: "Roti Tawar Tebal",
      notes: "Roti Bakar Bandung",
      base_unit: "lembar",
      display_unit: "lembar",
      display_conversion_factor: 1,
      current_stock: 24,
      minimum_stock: 10,
      last_purchase_price_per_display_unit: 1500,
      average_cost_per_base_unit: 1500,
      is_active: true,
    },
  ];

  const categories = [
    { id: 1, name: "Kopi", slug: "kopi", sort_order: 1, is_active: true },
    { id: 2, name: "Teh & Non-Kopi", slug: "teh-non-kopi", sort_order: 2, is_active: true },
    { id: 3, name: "Makanan", slug: "makanan-berat", sort_order: 3, is_active: true },
    { id: 4, name: "Camilan", slug: "camilan", sort_order: 4, is_active: true },
  ];

  const products = [
    {
      id: 1,
      category_id: 1,
      sku: "MNU-001",
      name: "Kopi Hitam Tubruk",
      slug: "kopi-hitam-tubruk",
      description: "Robusta seduh panas tradisi warkop",
      price: 6000,
      image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
      unit_label: "cangkir",
      is_available: true,
      track_inventory: true,
      sort_order: 1,
      options: [
        {
          id: 1,
          name: "Takaran Gula",
          selection_type: "single",
          is_required: true,
          values: [
            { id: 1, name: "Normal", price_delta: 0, is_default: true, is_available: true },
            { id: 2, name: "Sedikit (50%)", price_delta: 0, is_default: false, is_available: true },
            { id: 3, name: "Tanpa Gula", price_delta: 0, is_default: false, is_available: true },
          ],
        },
      ],
    },
    {
      id: 2,
      category_id: 1,
      sku: "MNU-002",
      name: "Kopi Susu Gula Aren",
      slug: "kopi-susu-gula-aren",
      description: "Robusta, susu segar, gula aren murni",
      price: 12000,
      image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80",
      unit_label: "gelas",
      is_available: true,
      track_inventory: true,
      sort_order: 2,
      options: [
        {
          id: 2,
          name: "Suhu",
          selection_type: "single",
          is_required: true,
          values: [
            { id: 4, name: "Dingin (Es)", price_delta: 0, is_default: true, is_available: true },
            { id: 5, name: "Hangat", price_delta: 0, is_default: false, is_available: true },
          ],
        },
        {
          id: 3,
          name: "Tingkat Manis",
          selection_type: "single",
          is_required: true,
          values: [
            { id: 6, name: "Normal", price_delta: 0, is_default: true, is_available: true },
            { id: 7, name: "50% (Less Sweet)", price_delta: 0, is_default: false, is_available: true },
            { id: 8, name: "Extra Aren", price_delta: 2000, is_default: false, is_available: true },
          ],
        },
        {
          id: 4,
          name: "Tambahan",
          selection_type: "multiple",
          is_required: false,
          values: [
            { id: 9, name: "Extra Shot Kopi", price_delta: 3000, is_default: false, is_available: true },
          ],
        },
      ],
    },
    {
      id: 3,
      category_id: 2,
      sku: "MNU-003",
      name: "Teh Tarik",
      slug: "teh-tarik",
      description: "Teh melati pekat & susu kental berbusa",
      price: 10000,
      image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
      unit_label: "gelas",
      is_available: true,
      track_inventory: true,
      sort_order: 1,
      options: [
        {
          id: 5,
          name: "Penyajian",
          selection_type: "single",
          is_required: true,
          values: [
            { id: 10, name: "Dingin (Es)", price_delta: 0, is_default: true, is_available: true },
            { id: 11, name: "Hangat", price_delta: 0, is_default: false, is_available: true },
          ],
        },
      ],
    },
    {
      id: 4,
      category_id: 2,
      sku: "MNU-004",
      name: "Wedang Jahe Sereh",
      slug: "wedang-jahe-sereh",
      description: "Jahe emprit bakar & sereh segar",
      price: 8000,
      image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
      unit_label: "gelas",
      is_available: true,
      track_inventory: false,
      sort_order: 2,
      options: [],
    },
    {
      id: 5,
      category_id: 3,
      sku: "MNU-005",
      name: "Indomie Goreng Telur",
      slug: "indomie-goreng-telur",
      description: "Telur mata sapi, sawi & bawang goreng",
      price: 13000,
      image_url: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=600&q=80",
      unit_label: "porsi",
      is_available: true,
      track_inventory: true,
      sort_order: 1,
      options: [
        {
          id: 6,
          name: "Telur",
          selection_type: "single",
          is_required: true,
          values: [
            { id: 12, name: "Setengah Matang", price_delta: 0, is_default: true, is_available: true },
            { id: 13, name: "Matang", price_delta: 0, is_default: false, is_available: true },
            { id: 14, name: "Dadar", price_delta: 0, is_default: false, is_available: true },
          ],
        },
        {
          id: 7,
          name: "Level Pedas",
          selection_type: "single",
          is_required: false,
          values: [
            { id: 15, name: "Tidak Pedas", price_delta: 0, is_default: true, is_available: true },
            { id: 16, name: "Sedang", price_delta: 0, is_default: false, is_available: true },
            { id: 17, name: "Pedas Rawit", price_delta: 1000, is_default: false, is_available: true },
          ],
        },
      ],
    },
    {
      id: 6,
      category_id: 3,
      sku: "MNU-006",
      name: "Indomie Kuah Soto",
      slug: "indomie-kuah-soto-telur",
      description: "Kuah soto hangat, telur & jeruk nipis",
      price: 13000,
      image_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
      unit_label: "porsi",
      is_available: true,
      track_inventory: true,
      sort_order: 2,
      options: [],
    },
    {
      id: 7,
      category_id: 4,
      sku: "MNU-007",
      name: "Pisang Goreng Aren",
      slug: "pisang-goreng-gula-aren",
      description: "5 pcs pisang kepok renyah & gula aren",
      price: 10000,
      image_url: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80",
      unit_label: "porsi",
      is_available: true,
      track_inventory: true,
      sort_order: 1,
      options: [],
    },
    {
      id: 8,
      category_id: 4,
      sku: "MNU-008",
      name: "Roti Bakar Cokelat Keju",
      slug: "roti-bakar-cokelat-keju",
      description: "Roti tebal panggang mentega, meses & keju",
      price: 15000,
      image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
      unit_label: "porsi",
      is_available: true,
      track_inventory: true,
      sort_order: 2,
      options: [],
    },
  ];

  const recipes = [
    { id: 1, product_id: 1, version: 1, is_validated: true, notes: "15g robusta", items: [{ id: 1, ingredient_id: 1, quantity: 15, unit: "gram" }] },
    { id: 2, product_id: 2, version: 1, is_validated: true, notes: "15g kopi, 120ml susu, 25ml aren", items: [{ id: 2, ingredient_id: 1, quantity: 15, unit: "gram" }, { id: 3, ingredient_id: 2, quantity: 120, unit: "ml" }, { id: 4, ingredient_id: 3, quantity: 25, unit: "ml" }] },
    { id: 3, product_id: 3, version: 1, is_validated: true, notes: "10g teh, 40ml kental manis", items: [{ id: 5, ingredient_id: 4, quantity: 10, unit: "gram" }, { id: 6, ingredient_id: 5, quantity: 40, unit: "ml" }] },
    { id: 4, product_id: 5, version: 1, is_validated: true, notes: "1 mie goreng, 1 telur", items: [{ id: 7, ingredient_id: 6, quantity: 1, unit: "pcs" }, { id: 8, ingredient_id: 8, quantity: 1, unit: "butir" }] },
    { id: 5, product_id: 6, version: 1, is_validated: true, notes: "1 mie soto, 1 telur", items: [{ id: 9, ingredient_id: 7, quantity: 1, unit: "pcs" }, { id: 10, ingredient_id: 8, quantity: 1, unit: "butir" }] },
    { id: 6, product_id: 7, version: 1, is_validated: true, notes: "3 pisang, 15ml aren", items: [{ id: 11, ingredient_id: 9, quantity: 3, unit: "buah" }, { id: 12, ingredient_id: 3, quantity: 15, unit: "ml" }] },
    { id: 7, product_id: 8, version: 1, is_validated: true, notes: "2 roti tawar, 20ml kental manis", items: [{ id: 13, ingredient_id: 10, quantity: 2, unit: "lembar" }, { id: 14, ingredient_id: 5, quantity: 20, unit: "ml" }] },
  ];

  const orders = [
    {
      id: 1,
      public_code: "ORD-0040-8F3K",
      order_number: "#0040",
      idempotency_key: "seed_0040",
      source: "QR",
      order_type: "DINE_IN",
      dining_table_id: 2,
      table_name_snapshot: "Meja 2",
      customer_name: "Dimas",
      status: "COMPLETED",
      payment_method: "CASH",
      payment_status: "PAID",
      subtotal_amount: 35000,
      discount_amount: 0,
      tax_amount: 3500,
      total_amount: 38500,
      cogs_amount: 11420,
      stock_deducted: true,
      stock_restored: false,
      created_by_actor: "Dimas (Meja 2)",
      created_at: iso(-115),
      confirmed_at: iso(-110),
      preparing_at: iso(-105),
      ready_at: iso(-95),
      completed_at: iso(-65),
      items: [
        { id: 1, product_id: 2, product_name_snapshot: "Kopi Susu Gula Aren", product_sku_snapshot: "MNU-002", unit_price_snapshot: 12000, options_price_snapshot: 0, quantity: 1, line_total: 12000, item_note: "Es sedikit", options: [] },
        { id: 2, product_id: 5, product_name_snapshot: "Indomie Goreng Telur", product_sku_snapshot: "MNU-005", unit_price_snapshot: 13000, options_price_snapshot: 0, quantity: 1, line_total: 13000, item_note: "Telur setengah matang", options: [] },
        { id: 3, product_id: 7, product_name_snapshot: "Pisang Goreng Aren", product_sku_snapshot: "MNU-007", unit_price_snapshot: 10000, options_price_snapshot: 0, quantity: 1, line_total: 10000, item_note: "Goreng garing", options: [] },
      ],
      latest_payment: {
        id: 1,
        payment_code: "PAY-0040",
        method: "CASH",
        status: "PAID",
        amount_due: 38500,
        amount_received: 50000,
        change_amount: 11500,
        verified_by_name: "Rina Wulandari",
        verified_at: iso(-110),
      },
      status_histories: [
        { id: 1, previous_status: null, next_status: "PENDING_PAYMENT", actor_name: "Dimas", actor_role: "customer", reason: "Pesanan QR Meja 2", created_at: iso(-115) },
        { id: 2, previous_status: "PENDING_PAYMENT", next_status: "CONFIRMED", actor_name: "Rina Wulandari", actor_role: "employee", reason: "Tunai Rp 50.000 (Kembali Rp 11.500)", created_at: iso(-110) },
        { id: 3, previous_status: "READY", next_status: "COMPLETED", actor_name: "Rina Wulandari", actor_role: "employee", reason: "Pesanan selesai disajikan", created_at: iso(-65) },
      ],
    },
    {
      id: 2,
      public_code: "ORD-0041-2K9M",
      order_number: "#0041",
      idempotency_key: "seed_0041",
      source: "QR",
      order_type: "DINE_IN",
      dining_table_id: 7,
      table_name_snapshot: "Meja 7",
      customer_name: "Nadia",
      status: "PREPARING",
      payment_method: "QRIS",
      payment_status: "PAID",
      subtotal_amount: 22000,
      discount_amount: 0,
      tax_amount: 2200,
      total_amount: 24200,
      cogs_amount: 6510,
      stock_deducted: true,
      stock_restored: false,
      created_by_actor: "Nadia (Meja 7)",
      created_at: iso(-20),
      confirmed_at: iso(-15),
      preparing_at: iso(-12),
      items: [
        { id: 4, product_id: 2, product_name_snapshot: "Kopi Susu Gula Aren", product_sku_snapshot: "MNU-002", unit_price_snapshot: 12000, options_price_snapshot: 0, quantity: 1, line_total: 12000, item_note: "Gula 50%", options: [] },
        { id: 5, product_id: 3, product_name_snapshot: "Teh Tarik", product_sku_snapshot: "MNU-003", unit_price_snapshot: 10000, options_price_snapshot: 0, quantity: 1, line_total: 10000, item_note: "Hangat", options: [] },
      ],
      latest_payment: {
        id: 2,
        payment_code: "PAY-0041",
        method: "QRIS",
        status: "PAID",
        amount_due: 24200,
        amount_received: 24200,
        change_amount: 0,
        proof_reference: "QRIS Ref 882910",
        verified_by_name: "Rina Wulandari",
        verified_at: iso(-15),
      },
      status_histories: [
        { id: 4, previous_status: null, next_status: "PENDING_PAYMENT", actor_name: "Nadia", actor_role: "customer", reason: "Pesanan QR Meja 7", created_at: iso(-20) },
        { id: 5, previous_status: "PENDING_PAYMENT", next_status: "CONFIRMED", actor_name: "Rina Wulandari", actor_role: "employee", reason: "QRIS diverifikasi manual", created_at: iso(-15) },
      ],
    },
    {
      id: 3,
      public_code: "ORD-0042-4P7X",
      order_number: "#0042",
      idempotency_key: "seed_0042",
      source: "QR",
      order_type: "DINE_IN",
      dining_table_id: 4,
      table_name_snapshot: "Meja 4",
      customer_name: "Raka",
      status: "PENDING_PAYMENT",
      payment_method: "QRIS",
      payment_status: "PROOF_UPLOADED",
      subtotal_amount: 47000,
      discount_amount: 0,
      tax_amount: 4700,
      total_amount: 51700,
      cogs_amount: 0,
      stock_deducted: false,
      stock_restored: false,
      created_by_actor: "Raka (Meja 4)",
      created_at: iso(-5),
      items: [
        { id: 6, product_id: 2, product_name_snapshot: "Kopi Susu Gula Aren", product_sku_snapshot: "MNU-002", unit_price_snapshot: 12000, options_price_snapshot: 0, quantity: 2, line_total: 24000, item_note: "Es sedikit, gula 50%", options: [] },
        { id: 7, product_id: 5, product_name_snapshot: "Indomie Goreng Telur", product_sku_snapshot: "MNU-005", unit_price_snapshot: 13000, options_price_snapshot: 0, quantity: 1, line_total: 13000, item_note: "Tanpa bawang, sambal dipisah", options: [] },
        { id: 8, product_id: 3, product_name_snapshot: "Teh Tarik", product_sku_snapshot: "MNU-003", unit_price_snapshot: 10000, options_price_snapshot: 0, quantity: 1, line_total: 10000, item_note: "Hangat", options: [] },
      ],
      latest_payment: {
        id: 3,
        payment_code: "PAY-0042",
        method: "QRIS",
        status: "PROOF_UPLOADED",
        amount_due: 51700,
        amount_received: 0,
        change_amount: 0,
        proof_reference: "BCA m-Transfer Ref 983120",
        proof_uploaded_at: iso(-3),
      },
      status_histories: [
        { id: 6, previous_status: null, next_status: "PENDING_PAYMENT", actor_name: "Raka", actor_role: "customer", reason: "Pesanan QR Meja 4", created_at: iso(-5) },
      ],
    },
  ];

  return {
    counters: {
      order: 42,
      order_item: 10,
      product: 8,
      category: 4,
      ingredient: 10,
      recipe: 7,
      movement: 1,
      purchase: 1,
      adjustment: 0,
      expense: 1,
      closing: 0,
      report: 1,
      rating: 1,
      traffic: 6,
      audit: 1,
      employee: 3,
      cash_trx: 4,
    },
    users: [
      { id: 1, name: "Nenek Sari", email: "owner@warkopterasnenek.id", password: "owner123", role: "owner", pin: "9999", is_active: true },
      { id: 2, name: "Kasir", email: "kasir@warkopterasnenek.id", password: "kasir123", role: "employee", pin: "1234", is_active: true },
    ],
    employee_profiles: [
      { id: 1, name: "Rina Wulandari", code: "EMP-01", role_title: "Kasir & Barista", default_shift: "Shift Pagi (07.00 - 15.00)", pin: "1234", is_active: true },
      { id: 2, name: "Budi Santoso", code: "EMP-02", role_title: "Barista & Kasir", default_shift: "Shift Sore (15.00 - 22.00)", pin: "2345", is_active: true },
      { id: 3, name: "Riko Pratama", code: "EMP-03", role_title: "Dapur & Barista", default_shift: "Shift Sore (15.00 - 22.00)", pin: "3456", is_active: true },
    ],
    employee_sessions: [],
    dining_tables: tables,
    table_sessions: [
      { id: 1, dining_table_id: 2, status: "CLOSED", opened_at: iso(-120), closed_at: iso(-65), duration_minutes: 55 },
      { id: 2, dining_table_id: 7, status: "ACTIVE", opened_at: iso(-25), closed_at: null, duration_minutes: null },
      { id: 3, dining_table_id: 4, status: "ACTIVE", opened_at: iso(-8), closed_at: null, duration_minutes: null },
    ],
    categories,
    products,
    ingredients,
    ingredient_categories,
    recipes,
    inventory_movements: [],
    stock_purchases: [
      {
        id: 1,
        purchase_code: "PO-001",
        supplier_name: "Grosir Kopi Pak Slamet",
        purchase_date: today,
        total_amount: 176000,
        payment_method: "CASH",
        notes: "Restock kopi 1kg & susu 2L",
        actor_name: "Rina Wulandari",
        items: [
          { id: 1, ingredient_id: 1, ingredient_name: "Biji Kopi Robusta", display_quantity: 1, display_unit: "kg", unit_price: 140000, subtotal: 140000 },
          { id: 2, ingredient_id: 2, ingredient_name: "Susu Cair Full Cream", display_quantity: 2, display_unit: "L", unit_price: 18000, subtotal: 36000 },
        ],
      },
    ],
    stock_adjustments: [],
    cash_accounts: [
      { id: 1, code: "CASH_DRAWER", name: "Kas Tunai Laci", type: "CASH", opening_balance: 500000, current_balance: 340500, is_active: true },
      { id: 2, code: "QRIS_BANK", name: "Rekening QRIS & Bank", type: "BANK", opening_balance: 1500000, current_balance: 1524200, is_active: true },
    ],
    cash_transactions: [
      { id: 1, cash_account_id: 1, transaction_code: "TRX-PO-001", direction: "OUT", category: "STOCK_PURCHASE", amount: 176000, balance_before: 500000, balance_after: 324000, description: "Restock bahan baku PO-001", actor_name: "Rina Wulandari", occurred_at: iso(-180) },
      { id: 2, cash_account_id: 1, transaction_code: "TRX-EXP-001", direction: "OUT", category: "OPERATING_EXPENSE", amount: 22000, balance_before: 324000, balance_after: 302000, description: "Isi ulang gas LPG 3kg", actor_name: "Rina Wulandari", occurred_at: iso(-150) },
      { id: 3, cash_account_id: 1, transaction_code: "TRX-ORD-0040", direction: "IN", category: "SALES", amount: 38500, balance_before: 302000, balance_after: 340500, description: "Penjualan Tunai #0040 (Meja 2)", actor_name: "Rina Wulandari", occurred_at: iso(-110) },
      { id: 4, cash_account_id: 2, transaction_code: "TRX-ORD-0041", direction: "IN", category: "SALES", amount: 24200, balance_before: 1500000, balance_after: 1524200, description: "Penjualan QRIS #0041 (Meja 7)", actor_name: "Rina Wulandari", occurred_at: iso(-15) },
    ],
    expense_categories: [
      { id: 1, name: "Gas & Dapur", slug: "gas-dapur", is_recurring: true },
      { id: 2, name: "Listrik & Air", slug: "listrik-air", is_recurring: true },
      { id: 3, name: "Es Batu Kristal", slug: "es-kristal", is_recurring: true },
      { id: 4, name: "Kebersihan", slug: "kebersihan", is_recurring: false },
      { id: 5, name: "Lainnya", slug: "lainnya", is_recurring: false },
    ],
    expenses: [
      {
        id: 1,
        expense_code: "EXP-001",
        expense_category_id: 1,
        expense_date: today,
        amount: 22000,
        payment_method: "CASH",
        description: "Isi ulang tabung gas LPG 3kg",
        actor_name: "Rina Wulandari",
      },
    ],
    cash_closings: [],
    employee_reports: [
      {
        id: 1,
        report_code: "RPT-001",
        report_date: today,
        shift_name: "Shift Sore (15.00 - 22.00)",
        employee_profile_id: 2,
        employee_name: "Budi Santoso",
        total_orders_count: 18,
        completed_orders_count: 17,
        cancelled_orders_count: 1,
        gross_revenue_amount: 485000,
        cash_revenue_amount: 260000,
        qris_revenue_amount: 225000,
        refund_amount: 0,
        expenses_amount: 22000,
        crowd_condition: "ramai",
        crowd_peak_note: "Ramai jam 19.00 - 21.00 WIB",
        stock_condition: "menipis",
        stock_concerns: "Susu cair dan gula aren perlu restock besok pagi",
        operational_issues: "Tidak ada kendala",
        additional_notes: "Kas laci sesuai.",
        status: "submitted",
        owner_feedback: null,
        submitted_at: iso(-40),
      },
    ],
    orders,
    ratings: [
      {
        id: 1,
        order_id: 1,
        dining_table_id: 2,
        stars: 5,
        tags: ["Kopi Pas Mantap", "Pelayanan Ramah & Cepat"],
        comment: "Kopi susu gula arennya mantap, indomie setengah matangnya pas!",
        customer_display_name: "Dimas (Meja 2)",
        is_public_wall: true,
        created_at: iso(-60),
      },
    ],
    traffic_events: [
      { id: 1, event_type: "QR_MENU_VISIT", dining_table_id: 2, occurred_at: iso(-120) },
      { id: 2, event_type: "ORDER_CREATED", dining_table_id: 2, order_id: 1, amount: 38500, occurred_at: iso(-115) },
      { id: 3, event_type: "QR_MENU_VISIT", dining_table_id: 7, occurred_at: iso(-25) },
      { id: 4, event_type: "ORDER_CREATED", dining_table_id: 7, order_id: 2, amount: 24200, occurred_at: iso(-20) },
      { id: 5, event_type: "QR_MENU_VISIT", dining_table_id: 4, occurred_at: iso(-8) },
      { id: 6, event_type: "ORDER_CREATED", dining_table_id: 4, order_id: 3, amount: 51700, occurred_at: iso(-5) },
    ],
    notifications: [],
    system_settings: {
      business_name: "Warkop Teras Nenek",
      business_tagline: "Kopi Tubruk & Masakan Hangat",
      business_address: "Jl. Teras Rindang No. 14, Yogyakarta",
      business_phone: "0812-3456-7890",
      wifi_ssid: "WarkopTeras_5G",
      wifi_password: "ngopidulu123",
      tax_enabled: true,
      tax_pb1_percentage: 10,
      qris_merchant_name: "WARKOP TERAS NENEK",
      qris_nmid: "ID1026000000000",
      qris_bank_info: "QRIS Statis Merchant",
      qris_image_data_url: null,
      daily_revenue_target: 500000,
      daily_target_notified_date: null,
    },
    audit_logs: [
      {
        id: 1,
        action: "SYSTEM_INIT",
        actor_name: "Sistem",
        actor_role: "system",
        entity_type: "Database",
        entity_id: "1",
        summary: "Inisialisasi 9 meja, menu, bahan baku, dan resep Warkop Teras Nenek.",
        created_at: iso(-180),
      },
    ],
    auth_tokens: {},
    push_subscriptions: [],
  };
}

// shortcut: single JSONB row in PostgreSQL; normalize into relational tables if concurrent write volume outgrows single-cafe scale
const globalForPg = globalThis as unknown as { __wtnPgPool?: Pool; __wtnPgReady?: boolean };

function getPgUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

function getPgPool(): Pool | null {
  const url = getPgUrl();
  if (!url) return null;
  if (!globalForPg.__wtnPgPool) {
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    // Strip sslmode query param so pg does not override ssl.rejectUnauthorized=false on Supabase/Neon
    let cleanUrl = url;
    try {
      const u = new URL(url);
      u.searchParams.delete("sslmode");
      cleanUrl = u.toString();
    } catch {
      // keep raw url if not standard URL
    }
    globalForPg.__wtnPgPool = new Pool({
      connectionString: cleanUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 8000,
    });
  }
  return globalForPg.__wtnPgPool;
}

async function ensurePgTable(pool: Pool): Promise<void> {
  if (globalForPg.__wtnPgReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wtn_state (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  globalForPg.__wtnPgReady = true;
}

let memoryCache: WtnDatabase | null = null;

export async function readDb(): Promise<WtnDatabase> {
  const pool = getPgPool();
  if (pool) {
    await ensurePgTable(pool);
    const { rows } = await pool.query<{ payload: WtnDatabase }>(
      "SELECT payload FROM wtn_state WHERE id = 'main'"
    );
    if (rows[0]?.payload) return rows[0].payload;
    const seeded = createInitialSeed();
    await pool.query(
      "INSERT INTO wtn_state (id, payload, updated_at) VALUES ('main', $1::jsonb, NOW()) ON CONFLICT (id) DO NOTHING",
      [JSON.stringify(seeded)]
    );
    return seeded;
  }

  if (memoryCache) return memoryCache;
  try {
    if (fs.existsSync(DB_FILE)) {
      memoryCache = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as WtnDatabase;
      return memoryCache;
    }
  } catch {
    // fallback to initial seed
  }
  memoryCache = createInitialSeed();
  await writeDb(memoryCache);
  return memoryCache;
}

export async function writeDb(db: WtnDatabase): Promise<void> {
  const pool = getPgPool();
  if (pool) {
    await ensurePgTable(pool);
    await pool.query(
      "INSERT INTO wtn_state (id, payload, updated_at) VALUES ('main', $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()",
      [JSON.stringify(db)]
    );
    return;
  }

  memoryCache = db;
  try {
    ensureDir(DB_FILE);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // Ignore write failure on strictly read-only environments; memoryCache remains active
  }
}

export function nextId(db: WtnDatabase, key: string): number {
  db.counters[key] = (db.counters[key] || 0) + 1;
  return db.counters[key];
}

export function randomToken(len = 16): string {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

export function enrichIngredient(ing: any, db: WtnDatabase) {
  const cat = db.ingredient_categories.find((c) => c.id === ing.ingredient_category_id) || null;
  const factor = Number(ing.display_conversion_factor || 1) || 1;
  const stock = Number(ing.current_stock || 0);
  const min = Number(ing.minimum_stock || 0);
  return {
    ...ing,
    category: cat,
    stock_status: stock <= 0 ? "HABIS" : stock <= min ? "MENIPIS" : "AMAN",
    display_current_stock: Math.round((stock / factor) * 100) / 100,
    display_minimum_stock: Math.round((min / factor) * 100) / 100,
  };
}

export function enrichProduct(prod: any, db: WtnDatabase) {
  const cat = db.categories.find((c) => c.id === prod.category_id) || null;
  const recipe = db.recipes.find((r) => r.product_id === prod.id) || null;
  let effective_available = Boolean(prod.is_available);
  let stock_status_reason: string | null = prod.is_available ? null : "Dinonaktifkan";

  let enrichedRecipe = null;
  if (recipe) {
    let estimated_cogs = 0;
    const items = (recipe.items || []).map((ri: any) => {
      const ing = db.ingredients.find((i) => i.id === ri.ingredient_id);
      if (ing) {
        estimated_cogs += Number(ri.quantity) * Number(ing.average_cost_per_base_unit || 0);
        if (prod.track_inventory && recipe.is_validated && Number(ing.current_stock) < Number(ri.quantity)) {
          effective_available = false;
          stock_status_reason = `Bahan habis: ${ing.name}`;
        }
      }
      return { ...ri, ingredient: ing ? enrichIngredient(ing, db) : null };
    });
    enrichedRecipe = { ...recipe, items, estimated_cogs: Math.round(estimated_cogs) };
  }

  return {
    ...prod,
    category: cat,
    recipe: enrichedRecipe,
    effective_available,
    stock_status_reason,
  };
}

export function enrichOrder(ord: any, db: WtnDatabase) {
  const table = db.dining_tables.find((t) => t.id === ord.dining_table_id) || null;
  const rating = db.ratings.find((r) => r.order_id === ord.id) || null;
  return {
    ...ord,
    dining_table: table,
    rating,
  };
}

export function recordAudit(
  db: WtnDatabase,
  action: string,
  actorName: string,
  actorRole: string,
  entityType: string,
  entityId: string | number,
  summary: string
) {
  db.audit_logs.unshift({
    id: nextId(db, "audit"),
    action,
    actor_name: actorName,
    actor_role: actorRole,
    entity_type: entityType,
    entity_id: String(entityId),
    summary,
    created_at: new Date().toISOString(),
  });
}

export function deductStockForOrder(db: WtnDatabase, order: any, actorName: string): { ok: boolean; error?: string } {
  if (order.stock_deducted) return { ok: true };

  const requirements: Record<number, number> = {};
  for (const item of order.items || []) {
    const product = db.products.find((p) => p.id === item.product_id);
    if (!product || !product.track_inventory) continue;
    const recipe = db.recipes.find((r) => r.product_id === product.id && r.is_validated);
    if (!recipe || !recipe.items?.length) continue;

    for (const ri of recipe.items) {
      requirements[ri.ingredient_id] = (requirements[ri.ingredient_id] || 0) + Number(ri.quantity) * Number(item.quantity);
    }
  }

  for (const [ingIdStr, needed] of Object.entries(requirements)) {
    const ing = db.ingredients.find((i) => i.id === Number(ingIdStr));
    if (ing && Number(ing.current_stock) < needed) {
      return { ok: false, error: `Stok bahan "${ing.name}" tidak mencukupi (sisa ${ing.current_stock} ${ing.base_unit}).` };
    }
  }

  let totalCogs = 0;
  for (const [ingIdStr, needed] of Object.entries(requirements)) {
    const ing = db.ingredients.find((i) => i.id === Number(ingIdStr));
    if (!ing) continue;
    const before = Number(ing.current_stock);
    const after = Math.max(0, before - needed);
    const cost = Math.round(needed * Number(ing.average_cost_per_base_unit || 0));
    totalCogs += cost;
    ing.current_stock = after;

    db.inventory_movements.unshift({
      id: nextId(db, "movement"),
      ingredient_id: ing.id,
      movement_type: "ORDER_DEDUCTION",
      direction: "OUT",
      quantity: needed,
      stock_before: before,
      stock_after: after,
      unit_cost_snapshot: Math.round(Number(ing.average_cost_per_base_unit || 0)),
      total_cost_snapshot: cost,
      reference_type: "Order",
      reference_id: order.id,
      notes: `Pemakaian resep Order ${order.order_number}`,
      actor_name: actorName,
      created_at: new Date().toISOString(),
    });
  }

  order.stock_deducted = true;
  order.stock_deducted_at = new Date().toISOString();
  order.cogs_amount = totalCogs;
  return { ok: true };
}
