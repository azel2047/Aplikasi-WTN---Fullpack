<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\DiningTable;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Rating;
use App\Models\SystemSetting;
use App\Models\TableSession;
use App\Models\TrafficEvent;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublicCustomerController extends Controller
{
    public function __construct(
        protected OrderService $orderService
    ) {}

    /**
     * Helper endpoint for demo selector / QR test page to view active tables.
     */
    public function listActiveTables()
    {
        $tables = DiningTable::where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'area', 'capacity', 'qr_token', 'is_active']);

        return response()->json([
            'tables' => $tables,
            'business_name' => SystemSetting::getValue('business_name', 'Warkop Teras Nenek'),
        ]);
    }

    /**
     * GET /api/v1/public/tables/{token}/menu
     * Validates QR token, records visit event, opens/retrieves table session, and returns menu catalog.
     */
    public function tableMenu(string $token)
    {
        $table = DiningTable::where('qr_token', $token)->first();

        if (!$table || !$table->is_active) {
            return response()->json([
                'error' => 'INVALID_QR_TOKEN',
                'message' => 'QR Code meja ini tidak valid, sudah diganti, atau sedang dinonaktifkan. Silakan hubungi kasir atau pindai QR terbaru di meja Anda.',
            ], 404);
        }

        $table->update(['last_scanned_at' => now()]);

        $session = TableSession::where('dining_table_id', $table->id)
            ->where('status', 'ACTIVE')
            ->latest()
            ->first();

        if (!$session) {
            $session = TableSession::create([
                'dining_table_id' => $table->id,
                'session_token' => 'sess_' . strtolower($table->code) . '_' . Str::random(16),
                'status' => 'ACTIVE',
                'opened_at' => now(),
                'last_activity_at' => now(),
            ]);
        } else {
            $session->update(['last_activity_at' => now()]);
        }

        TrafficEvent::create([
            'event_type' => 'QR_MENU_VISIT',
            'dining_table_id' => $table->id,
            'table_session_id' => $session->id,
            'occurred_at' => now(),
        ]);

        $categories = Category::where('is_active', true)
            ->orderBy('sort_order')
            ->with([
                'products' => function ($q) {
                    $q->orderBy('sort_order')->with(['options.values', 'recipe.items.ingredient']);
                },
            ])
            ->get();

        // Active orders in this table session so customer can easily return to tracking
        $activeOrders = Order::where('dining_table_id', $table->id)
            ->whereIn('status', ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY'])
            ->orderByDesc('created_at')
            ->get(['id', 'public_code', 'order_number', 'status', 'payment_status', 'total_amount', 'created_at']);

        return response()->json([
            'table' => [
                'id' => $table->id,
                'code' => $table->code,
                'name' => $table->name,
                'area' => $table->area,
                'capacity' => $table->capacity,
                'qr_token' => $table->qr_token,
            ],
            'table_session' => [
                'id' => $session->id,
                'session_token' => $session->session_token,
                'opened_at' => $session->opened_at,
            ],
            'categories' => $categories,
            'active_orders' => $activeOrders,
            'settings' => [
                'business_name' => SystemSetting::getValue('business_name', 'Warkop Teras Nenek'),
                'business_tagline' => SystemSetting::getValue('business_tagline', 'Kopi Tubruk & Susu Aren'),
                'tax_enabled' => (bool) SystemSetting::getValue('tax_enabled', true),
                'tax_pb1_percentage' => (int) SystemSetting::getValue('tax_pb1_percentage', 10),
                'wifi_ssid' => SystemSetting::getValue('wifi_ssid', 'WarkopTeras_5G'),
                'wifi_password' => SystemSetting::getValue('wifi_password', 'ngopidulu123'),
                'qris_merchant_name' => SystemSetting::getValue('qris_merchant_name'),
                'qris_nmid' => SystemSetting::getValue('qris_nmid'),
                'qris_bank_info' => SystemSetting::getValue('qris_bank_info'),
                'has_official_qris_image' => !empty(SystemSetting::getValue('qris_image_path')),
            ],
        ]);
    }

    /**
     * POST /api/v1/public/orders
     */
    public function createOrder(Request $request)
    {
        $validated = $request->validate([
            'table_token' => 'required|string',
            'customer_name' => 'nullable|string|max:80',
            'payment_method' => 'required|in:CASH,QRIS,cash,qris',
            'idempotency_key' => 'nullable|string|max:64',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:50',
            'items.*.option_value_ids' => 'nullable|array',
            'items.*.option_value_ids.*' => 'integer',
            'items.*.item_note' => 'nullable|string|max:250',
        ]);

        if (!$request->filled('idempotency_key') && $request->header('Idempotency-Key')) {
            $validated['idempotency_key'] = $request->header('Idempotency-Key');
        }

        $actor = !empty($validated['customer_name'])
            ? $validated['customer_name']
            : 'Pelanggan QR';

        $order = $this->orderService->createOrder($validated, 'QR', $actor);

        return response()->json([
            'message' => 'Pesanan berhasil dikirim ke kasir.',
            'order' => $order,
        ], 201);
    }

    /**
     * GET /api/v1/public/orders/{publicCode}
     */
    public function showOrder(string $publicCode)
    {
        $order = Order::with([
            'items.options',
            'latestPayment',
            'statusHistories',
            'diningTable:id,code,name,area,qr_token',
            'rating',
        ])->where('public_code', $publicCode)->first();

        if (!$order) {
            return response()->json([
                'message' => 'Kode pesanan tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'order' => $order,
            'settings' => [
                'business_name' => SystemSetting::getValue('business_name', 'Warkop Teras Nenek'),
                'wifi_ssid' => SystemSetting::getValue('wifi_ssid', 'WarkopTeras_5G'),
                'wifi_password' => SystemSetting::getValue('wifi_password', 'ngopidulu123'),
                'qris_merchant_name' => SystemSetting::getValue('qris_merchant_name'),
                'qris_nmid' => SystemSetting::getValue('qris_nmid'),
                'qris_bank_info' => SystemSetting::getValue('qris_bank_info'),
                'has_official_qris_image' => !empty(SystemSetting::getValue('qris_image_path')),
            ],
        ]);
    }

    /**
     * POST /api/v1/public/orders/{publicCode}/payment-proof
     * Important AC-13: Uploading proof marks payment as PROOF_UPLOADED, NEVER PAID automatically.
     */
    public function uploadPaymentProof(Request $request, string $publicCode)
    {
        $order = Order::with('latestPayment')->where('public_code', $publicCode)->firstOrFail();

        if ($order->payment_status === 'PAID') {
            return response()->json([
                'message' => 'Pembayaran pesanan ini sudah terverifikasi lunas.',
                'order' => $order->fresh(['items.options', 'latestPayment', 'statusHistories', 'diningTable', 'rating']),
            ]);
        }

        $validated = $request->validate([
            'proof_file' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:4096',
            'proof_reference' => 'nullable|string|max:190',
        ]);

        if (!$request->hasFile('proof_file') && empty($validated['proof_reference'])) {
            throw ValidationException::withMessages([
                'proof_file' => ['Unggah gambar bukti pembayaran atau masukkan catatan referensi transfer.'],
            ]);
        }

        $filePath = $order->latestPayment?->proof_file_path;
        if ($request->hasFile('proof_file')) {
            // Store in private local disk (not publicly accessible without authorized endpoint)
            $filePath = $request->file('proof_file')->store('private/payment-proofs', 'local');
        }

        $payment = $order->latestPayment;
        if ($payment) {
            $payment->update([
                'method' => 'QRIS',
                'status' => 'PROOF_UPLOADED',
                'proof_file_path' => $filePath,
                'proof_reference' => $validated['proof_reference'] ?? $payment->proof_reference ?? 'Bukti QRIS diunggah pelanggan',
                'proof_uploaded_at' => now(),
                'rejection_reason' => null,
            ]);
        }

        $order->update([
            'payment_method' => 'QRIS',
            'payment_status' => 'PROOF_UPLOADED',
        ]);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'previous_status' => $order->status,
            'next_status' => $order->status,
            'actor_name' => $order->customer_name ?? 'Pelanggan',
            'actor_role' => 'customer',
            'reason' => 'Pelanggan mengunggah bukti pembayaran QRIS (Menunggu verifikasi manual kasir)',
        ]);

        Notification::create([
            'target_role' => 'cashier',
            'type' => 'PAYMENT_PROOF',
            'title' => "Bukti QRIS Diunggah — {$order->order_number}",
            'message' => "{$order->table_name_snapshot} mengunggah bukti QRIS Rp " . number_format($order->total_amount, 0, ',', '.') . ". Verifikasi mutasi sebelum menandai lunas.",
            'reference_code' => $order->public_code,
        ]);

        return response()->json([
            'message' => 'Bukti pembayaran berhasil dikirim. Mohon tunggu kasir memverifikasi mutasi pembayaran Anda.',
            'order' => $order->fresh(['items.options', 'latestPayment', 'statusHistories', 'diningTable', 'rating']),
        ]);
    }

    /**
     * POST /api/v1/public/orders/{publicCode}/call-waiter
     */
    public function callWaiter(string $publicCode)
    {
        $order = Order::where('public_code', $publicCode)->firstOrFail();
        $order->update([
            'waiter_called' => true,
            'waiter_called_at' => now(),
        ]);

        Notification::create([
            'target_role' => 'cashier',
            'type' => 'WAITER_CALL',
            'title' => "Panggilan Bantuan — {$order->table_name_snapshot}",
            'message' => "Pelanggan di {$order->table_name_snapshot} (Order {$order->order_number}) memanggil bantuan kasir/barista.",
            'reference_code' => $order->public_code,
        ]);

        return response()->json([
            'message' => 'Panggilan bantuan telah dikirim ke kasir dan barista.',
            'order' => $order,
        ]);
    }

    /**
     * POST /api/v1/public/orders/{publicCode}/rating
     * Enforces AC-27 & AC-28: 1-5 stars overall rating, only after COMPLETED, max 1 rating per order.
     */
    public function submitRating(Request $request, string $publicCode)
    {
        $order = Order::with('rating')->where('public_code', $publicCode)->firstOrFail();

        if ($order->status !== 'COMPLETED') {
            throw ValidationException::withMessages([
                'order' => ['Rating hanya dapat diberikan setelah pesanan berstatus Selesai (COMPLETED).'],
            ]);
        }

        if ($order->rating) {
            throw ValidationException::withMessages([
                'rating' => ['Anda sudah mengirim rating untuk pesanan ini. Satu pesanan hanya dapat memiliki satu rating.'],
            ]);
        }

        $validated = $request->validate([
            'stars' => 'required|integer|min:1|max:5',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:60',
            'comment' => 'nullable|string|max:500',
            'is_public_wall' => 'nullable|boolean',
        ]);

        $rating = Rating::create([
            'order_id' => $order->id,
            'dining_table_id' => $order->dining_table_id,
            'stars' => $validated['stars'],
            'tags' => $validated['tags'] ?? [],
            'comment' => $validated['comment'] ?? null,
            'customer_display_name' => $order->customer_name
                ? "{$order->customer_name} ({$order->table_name_snapshot})"
                : "Pelanggan {$order->table_name_snapshot}",
            'is_public_wall' => $validated['is_public_wall'] ?? true,
        ]);

        return response()->json([
            'message' => 'Matur suwun! Rating dan ulasan Anda telah tersimpan.',
            'rating' => $rating,
            'order' => $order->fresh(['items.options', 'latestPayment', 'statusHistories', 'diningTable', 'rating']),
        ], 201);
    }

    /**
     * Serve official QRIS image configured by owner.
     */
    public function qrisImage()
    {
        $path = SystemSetting::getValue('qris_image_path');
        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'Gambar QRIS belum dikonfigurasi owner.'], 404);
        }
        return Storage::disk('local')->response($path);
    }
}
