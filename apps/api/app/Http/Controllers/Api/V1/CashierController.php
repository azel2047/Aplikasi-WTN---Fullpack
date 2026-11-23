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
use App\Models\EmployeeReportAttachment;
use App\Models\EmployeeSession;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Notification;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CashierController extends Controller
{
    public function __construct(
        protected OrderService $orderService
    ) {}

    protected function resolveShiftContext(Request $request): array
    {
        $user = $request->user();
        $profileId = $request->header('X-Employee-Profile-Id') ?? $request->input('employee_profile_id');

        if ($profileId) {
            $profile = EmployeeProfile::find($profileId);
            if ($profile) {
                return [
                    'actor_name' => $profile->name,
                    'employee_id' => $profile->id,
                    'shift_name' => $profile->default_shift,
                    'role' => $user?->role ?? 'employee',
                ];
            }
        }

        if ($user) {
            $session = EmployeeSession::with('employeeProfile')
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->latest()
                ->first();
            if ($session && $session->employeeProfile) {
                return [
                    'actor_name' => $session->employeeProfile->name,
                    'employee_id' => $session->employeeProfile->id,
                    'shift_name' => $session->shift_name,
                    'role' => $user->role,
                ];
            }
        }

        $fallback = EmployeeProfile::where('is_active', true)->first();
        return [
            'actor_name' => $user?->role === 'owner' ? $user->name : ($fallback?->name ?? 'Kasir Shift Aktif'),
            'employee_id' => $fallback?->id,
            'shift_name' => $fallback?->default_shift ?? 'Shift Pagi',
            'role' => $user?->role ?? 'employee',
        ];
    }

    /**
     * GET /api/v1/cashier/orders
     * Unified queue for both QR and manual POS orders.
     */
    public function orders(Request $request)
    {
        $query = Order::with(['items.options', 'latestPayment', 'diningTable', 'rating', 'handledByEmployee'])
            ->orderByRaw("CASE
                WHEN status = 'PENDING_PAYMENT' THEN 1
                WHEN status = 'CONFIRMED' THEN 2
                WHEN status = 'PREPARING' THEN 3
                WHEN status = 'READY' THEN 4
                WHEN status = 'COMPLETED' THEN 5
                ELSE 6 END")
            ->orderByDesc('created_at');

        if ($request->filled('status') && $request->status !== 'ALL') {
            if ($request->status === 'NEW') {
                $query->whereIn('status', ['PENDING_PAYMENT', 'CONFIRMED']);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('payment_status') && $request->payment_status !== 'ALL') {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('table_id')) {
            $query->where('dining_table_id', $request->table_id);
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('order_number', 'like', "%{$s}%")
                  ->orWhere('public_code', 'like', "%{$s}%")
                  ->orWhere('customer_name', 'like', "%{$s}%")
                  ->orWhere('table_name_snapshot', 'like', "%{$s}%");
            });
        }

        $orders = $query->limit(100)->get();

        // Counts for filter tabs
        $counts = [
            'new' => Order::whereIn('status', ['PENDING_PAYMENT', 'CONFIRMED'])->count(),
            'preparing' => Order::where('status', 'PREPARING')->count(),
            'ready' => Order::where('status', 'READY')->count(),
            'completed' => Order::where('status', 'COMPLETED')->count(),
            'cancelled' => Order::where('status', 'CANCELLED')->count(),
            'proof_uploaded' => Order::where('payment_status', 'PROOF_UPLOADED')->count(),
        ];

        $notifications = Notification::where('target_role', 'cashier')
            ->where('is_read', false)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'orders' => $orders,
            'counts' => $counts,
            'notifications' => $notifications,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * GET /api/v1/cashier/orders/{id}
     */
    public function showOrder($id)
    {
        $order = Order::with([
            'items.options',
            'payments.verifiedByEmployee',
            'latestPayment',
            'statusHistories',
            'diningTable',
            'rating',
            'handledByEmployee',
        ])->findOrFail($id);

        return response()->json(['order' => $order]);
    }

    /**
     * PATCH /api/v1/cashier/orders/{id}/status
     */
    public function updateStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $ctx = $this->resolveShiftContext($request);

        $validated = $request->validate([
            'status' => 'required|string|in:PENDING_PAYMENT,CONFIRMED,PREPARING,READY,COMPLETED,CANCELLED',
            'reason' => 'nullable|string|max:255',
            'pin' => 'nullable|string|max:12',
            'restore_stock' => 'nullable|boolean',
        ]);

        $updated = $this->orderService->updateOrderStatus(
            $order,
            $validated,
            $ctx['actor_name'],
            $ctx['role'],
            $ctx['employee_id']
        );

        return response()->json([
            'message' => "Status pesanan {$updated->order_number} diperbarui menjadi {$updated->status}.",
            'order' => $updated,
        ]);
    }

    /**
     * POST /api/v1/cashier/orders/{id}/payments
     */
    public function processPayment(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $ctx = $this->resolveShiftContext($request);

        $validated = $request->validate([
            'action' => 'nullable|string|in:VERIFY_PAID,REJECT_PROOF',
            'method' => 'nullable|string|in:CASH,QRIS',
            'amount_received' => 'nullable|integer|min:0',
            'proof_reference' => 'nullable|string|max:190',
            'rejection_reason' => 'nullable|string|max:255',
        ]);

        $updated = $this->orderService->processPayment(
            $order,
            $validated,
            $ctx['actor_name'],
            $ctx['employee_id']
        );

        return response()->json([
            'message' => $updated->payment_status === 'PAID'
                ? "Pembayaran pesanan {$updated->order_number} berhasil diverifikasi lunas."
                : "Bukti pembayaran pesanan {$updated->order_number} telah ditolak.",
            'order' => $updated,
        ]);
    }

    /**
     * POST /api/v1/cashier/orders/{id}/refund
     */
    public function refundOrder(Request $request, $id)
    {
        $order = Order::with('latestPayment')->findOrFail($id);
        $ctx = $this->resolveShiftContext($request);

        $validated = $request->validate([
            'reason' => 'required|string|max:255',
            'pin' => 'required|string|max:12',
            'restore_stock' => 'nullable|boolean',
        ]);

        $this->orderService->verifySensitivePin($validated['pin'], $ctx['employee_id']);

        if ($order->status !== 'CANCELLED') {
            $updated = $this->orderService->updateOrderStatus(
                $order,
                [
                    'status' => 'CANCELLED',
                    'reason' => $validated['reason'],
                    'pin' => $validated['pin'],
                    'restore_stock' => $validated['restore_stock'] ?? true,
                ],
                $ctx['actor_name'],
                $ctx['role'],
                $ctx['employee_id']
            );
        } else {
            DB::transaction(function () use ($order, $validated, $ctx) {
                $locked = Order::with('latestPayment')->where('id', $order->id)->lockForUpdate()->firstOrFail();
                $this->orderService->refundOrderPayment($locked, $validated['reason'], $ctx['actor_name']);
            });
            $updated = $order->fresh(['items.options', 'latestPayment', 'statusHistories', 'diningTable', 'rating']);
        }

        return response()->json([
            'message' => "Refund untuk pesanan {$updated->order_number} berhasil dicatat.",
            'order' => $updated,
        ]);
    }

    /**
     * GET /api/v1/cashier/pos/catalog
     */
    public function posCatalog()
    {
        $categories = Category::where('is_active', true)
            ->orderBy('sort_order')
            ->with([
                'products' => function ($q) {
                    $q->orderBy('sort_order')->with(['options.values', 'recipe.items.ingredient']);
                },
            ])
            ->get();

        $tables = DiningTable::where('is_active', true)->orderBy('code')->get();

        return response()->json([
            'categories' => $categories,
            'tables' => $tables,
        ]);
    }

    /**
     * POST /api/v1/cashier/pos/orders
     * Creates a manual POS order that enters the same unified queue, and optionally processes immediate payment.
     */
    public function createPosOrder(Request $request)
    {
        $ctx = $this->resolveShiftContext($request);

        $validated = $request->validate([
            'order_type' => 'required|in:DINE_IN,TAKEAWAY',
            'dining_table_id' => 'nullable|integer|exists:dining_tables,id',
            'customer_name' => 'nullable|string|max:80',
            'payment_method' => 'required|in:CASH,QRIS',
            'discount_amount' => 'nullable|integer|min:0',
            'pay_immediately' => 'nullable|boolean',
            'amount_received' => 'nullable|integer|min:0',
            'proof_reference' => 'nullable|string|max:190',
            'idempotency_key' => 'nullable|string|max:64',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:50',
            'items.*.option_value_ids' => 'nullable|array',
            'items.*.option_value_ids.*' => 'integer',
            'items.*.item_note' => 'nullable|string|max:250',
        ]);

        $order = $this->orderService->createOrder(
            $validated,
            'POS',
            $ctx['actor_name'],
            $ctx['employee_id']
        );

        if (!empty($validated['pay_immediately'])) {
            $order = $this->orderService->processPayment(
                $order,
                [
                    'action' => 'VERIFY_PAID',
                    'method' => $validated['payment_method'],
                    'amount_received' => $validated['payment_method'] === 'CASH'
                        ? ($validated['amount_received'] ?? $order->total_amount)
                        : $order->total_amount,
                    'proof_reference' => $validated['proof_reference'] ?? 'Verifikasi langsung di kasir POS',
                ],
                $ctx['actor_name'],
                $ctx['employee_id']
            );
        }

        return response()->json([
            'message' => 'Pesanan POS berhasil dibuat.',
            'order' => $order,
        ], 201);
    }

    /**
     * GET /api/v1/cashier/expenses & POST /api/v1/cashier/expenses
     */
    public function listExpenses(Request $request)
    {
        $expenses = Expense::with(['category', 'cashAccount', 'employeeProfile'])
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $categories = ExpenseCategory::orderBy('name')->get();
        $accounts = CashAccount::where('is_active', true)->get();

        return response()->json([
            'expenses' => $expenses,
            'categories' => $categories,
            'cash_accounts' => $accounts,
        ]);
    }

    public function storeExpense(Request $request)
    {
        $ctx = $this->resolveShiftContext($request);

        $validated = $request->validate([
            'expense_category_id' => 'required|integer|exists:expense_categories,id',
            'expense_date' => 'nullable|date',
            'amount' => 'required|integer|min:100',
            'payment_method' => 'required|in:CASH,QRIS_BANK',
            'description' => 'required|string|max:255',
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:4096',
        ]);

        return DB::transaction(function () use ($request, $validated, $ctx) {
            $accountCode = $validated['payment_method'] === 'QRIS_BANK' ? 'QRIS_BANK' : 'CASH_DRAWER';
            $cashAccount = CashAccount::where('code', $accountCode)->lockForUpdate()->firstOrFail();

            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $request->file('attachment')->store('private/expense-attachments', 'local');
            }

            $expense = Expense::create([
                'expense_code' => 'EXP-' . strtoupper(Str::random(6)),
                'expense_category_id' => $validated['expense_category_id'],
                'cash_account_id' => $cashAccount->id,
                'expense_date' => $validated['expense_date'] ?? now()->toDateString(),
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'description' => $validated['description'],
                'attachment_path' => $attachmentPath,
                'actor_name' => $ctx['actor_name'],
                'employee_profile_id' => $ctx['employee_id'],
            ]);

            $balBefore = (int) $cashAccount->current_balance;
            $balAfter = $balBefore - (int) $validated['amount'];
            $cashAccount->update(['current_balance' => $balAfter]);

            CashTransaction::create([
                'cash_account_id' => $cashAccount->id,
                'transaction_code' => 'TRX-EXP-' . strtoupper(Str::random(6)),
                'direction' => 'OUT',
                'category' => 'OPERATING_EXPENSE',
                'amount' => (int) $validated['amount'],
                'balance_before' => $balBefore,
                'balance_after' => $balAfter,
                'reference_type' => 'Expense',
                'reference_id' => $expense->id,
                'description' => "Pengeluaran operasional: {$validated['description']}",
                'actor_name' => $ctx['actor_name'],
                'occurred_at' => now(),
            ]);

            AuditLog::record(
                'EXPENSE_CREATED',
                $ctx['actor_name'],
                $ctx['role'],
                'Expense',
                $expense->id,
                "Mencatat pengeluaran operasional Rp " . number_format($validated['amount'], 0, ',', '.') . ": {$validated['description']}"
            );

            return response()->json([
                'message' => 'Pengeluaran operasional berhasil dicatat.',
                'expense' => $expense->load(['category', 'cashAccount']),
            ], 201);
        });
    }

    /**
     * GET /api/v1/cashier/daily-reports & POST /api/v1/cashier/daily-reports
     * Enforces AC-24 & AC-25: System-generated transaction metrics + 1 daily report per date/shift.
     */
    public function dailyReportContext(Request $request)
    {
        $date = $request->input('date', now()->toDateString());

        $ordersToday = Order::whereDate('created_at', $date)->get();
        $paidOrders = $ordersToday->where('payment_status', 'PAID');

        $systemMetrics = [
            'date' => $date,
            'total_orders_count' => $ordersToday->count(),
            'completed_orders_count' => $ordersToday->where('status', 'COMPLETED')->count(),
            'cancelled_orders_count' => $ordersToday->where('status', 'CANCELLED')->count(),
            'gross_revenue_amount' => (int) $paidOrders->sum('total_amount'),
            'cash_revenue_amount' => (int) $paidOrders->where('payment_method', 'CASH')->sum('total_amount'),
            'qris_revenue_amount' => (int) $paidOrders->where('payment_method', 'QRIS')->sum('total_amount'),
            'refund_amount' => (int) $ordersToday->where('payment_status', 'REFUNDED')->sum('total_amount'),
            'expenses_amount' => (int) Expense::whereDate('expense_date', $date)->sum('amount'),
        ];

        $reports = EmployeeReport::with(['employeeProfile', 'attachments'])
            ->orderByDesc('report_date')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        return response()->json([
            'system_metrics' => $systemMetrics,
            'reports' => $reports,
        ]);
    }

    public function submitDailyReport(Request $request)
    {
        $ctx = $this->resolveShiftContext($request);

        $validated = $request->validate([
            'report_date' => 'nullable|date',
            'shift_name' => 'required|string|max:100',
            'crowd_condition' => 'required|in:ramai,normal,sepi',
            'crowd_peak_note' => 'nullable|string|max:255',
            'stock_condition' => 'required|in:aman,menipis,habis',
            'stock_concerns' => 'nullable|string|max:1000',
            'operational_issues' => 'nullable|string|max:1000',
            'additional_notes' => 'nullable|string|max:1000',
            'status' => 'nullable|in:draft,submitted',
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:4096',
        ]);

        $date = $validated['report_date'] ?? now()->toDateString();

        // Check duplicate submitted report for the same date & shift (AC-24)
        $existingSubmitted = EmployeeReport::whereDate('report_date', $date)
            ->where('shift_name', $validated['shift_name'])
            ->whereIn('status', ['submitted', 'reviewed'])
            ->first();

        if ($existingSubmitted) {
            throw ValidationException::withMessages([
                'shift_name' => ["Laporan harian untuk tanggal {$date} ({$validated['shift_name']}) sudah dikirim sebelumnya."],
            ]);
        }

        // System-generated numbers (AC-25)
        $ordersToday = Order::whereDate('created_at', $date)->get();
        $paidOrders = $ordersToday->where('payment_status', 'PAID');

        $report = EmployeeReport::updateOrCreate(
            [
                'report_date' => $date,
                'shift_name' => $validated['shift_name'],
            ],
            [
                'report_code' => 'RPT-' . strtoupper(Str::random(6)),
                'employee_profile_id' => $ctx['employee_id'],
                'employee_name' => $ctx['actor_name'],
                'total_orders_count' => $ordersToday->count(),
                'completed_orders_count' => $ordersToday->where('status', 'COMPLETED')->count(),
                'cancelled_orders_count' => $ordersToday->where('status', 'CANCELLED')->count(),
                'gross_revenue_amount' => (int) $paidOrders->sum('total_amount'),
                'cash_revenue_amount' => (int) $paidOrders->where('payment_method', 'CASH')->sum('total_amount'),
                'qris_revenue_amount' => (int) $paidOrders->where('payment_method', 'QRIS')->sum('total_amount'),
                'refund_amount' => (int) $ordersToday->where('payment_status', 'REFUNDED')->sum('total_amount'),
                'expenses_amount' => (int) Expense::whereDate('expense_date', $date)->sum('amount'),
                'crowd_condition' => $validated['crowd_condition'],
                'crowd_peak_note' => $validated['crowd_peak_note'] ?? null,
                'stock_condition' => $validated['stock_condition'],
                'stock_concerns' => $validated['stock_concerns'] ?? null,
                'operational_issues' => $validated['operational_issues'] ?? null,
                'additional_notes' => $validated['additional_notes'] ?? null,
                'status' => $validated['status'] ?? 'submitted',
                'submitted_at' => now(),
            ]
        );

        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('private/report-attachments', 'local');
            EmployeeReportAttachment::create([
                'employee_report_id' => $report->id,
                'file_path' => $path,
                'file_name' => $request->file('attachment')->getClientOriginalName(),
                'caption' => 'Lampiran laporan harian',
            ]);
        }

        AuditLog::record(
            'DAILY_REPORT_SUBMITTED',
            $ctx['actor_name'],
            $ctx['role'],
            'EmployeeReport',
            $report->id,
            "Mengirim laporan harian shift {$validated['shift_name']} untuk tanggal {$date}"
        );

        return response()->json([
            'message' => 'Laporan harian karyawan berhasil dikirim.',
            'report' => $report->load(['employeeProfile', 'attachments']),
        ], 201);
    }

    /**
     * GET /api/v1/cashier/closings & POST /api/v1/cashier/closings
     */
    public function closingContext(Request $request)
    {
        $date = $request->input('date', now()->toDateString());
        $cashDrawer = CashAccount::where('code', 'CASH_DRAWER')->first();
        $qrisAccount = CashAccount::where('code', 'QRIS_BANK')->first();

        $paidOrders = Order::whereDate('created_at', $date)->where('payment_status', 'PAID')->get();
        $cashSales = (int) $paidOrders->where('payment_method', 'CASH')->sum('total_amount');
        $qrisSales = (int) $paidOrders->where('payment_method', 'QRIS')->sum('total_amount');
        $cashExpenses = (int) Expense::whereDate('expense_date', $date)->where('payment_method', 'CASH')->sum('amount');
        $cashRefunds = (int) Order::whereDate('created_at', $date)
            ->where('payment_status', 'REFUNDED')
            ->where('payment_method', 'CASH')
            ->sum('total_amount');

        $openingCash = (int) ($cashDrawer?->opening_balance ?? 500000);
        $expectedCash = (int) ($cashDrawer?->current_balance ?? ($openingCash + $cashSales - $cashExpenses - $cashRefunds));

        $closings = CashClosing::with('employeeProfile')
            ->orderByDesc('closing_date')
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return response()->json([
            'summary' => [
                'date' => $date,
                'opening_cash_balance' => $openingCash,
                'cash_sales_amount' => $cashSales,
                'qris_sales_amount' => $qrisSales,
                'cash_expenses_amount' => $cashExpenses,
                'cash_refunds_amount' => $cashRefunds,
                'expected_closing_cash' => $expectedCash,
                'qris_account_balance' => (int) ($qrisAccount?->current_balance ?? 0),
            ],
            'closings' => $closings,
        ]);
    }

    public function submitClosing(Request $request)
    {
        $ctx = $this->resolveShiftContext($request);

        $validated = $request->validate([
            'closing_date' => 'nullable|date',
            'shift_name' => 'required|string|max:100',
            'actual_physical_cash' => 'required|integer|min:0',
            'variance_reason' => 'nullable|string|max:500',
            'pin' => 'required|string|max:12',
        ]);

        $this->orderService->verifySensitivePin($validated['pin'], $ctx['employee_id']);

        $date = $validated['closing_date'] ?? now()->toDateString();
        $cashDrawer = CashAccount::where('code', 'CASH_DRAWER')->first();

        $paidOrders = Order::whereDate('created_at', $date)->where('payment_status', 'PAID')->get();
        $cashSales = (int) $paidOrders->where('payment_method', 'CASH')->sum('total_amount');
        $qrisSales = (int) $paidOrders->where('payment_method', 'QRIS')->sum('total_amount');
        $cashExpenses = (int) Expense::whereDate('expense_date', $date)->where('payment_method', 'CASH')->sum('amount');
        $cashRefunds = (int) Order::whereDate('created_at', $date)
            ->where('payment_status', 'REFUNDED')
            ->where('payment_method', 'CASH')
            ->sum('total_amount');

        $openingCash = (int) ($cashDrawer?->opening_balance ?? 500000);
        $expectedCash = (int) ($cashDrawer?->current_balance ?? ($openingCash + $cashSales - $cashExpenses - $cashRefunds));
        $actualCash = (int) $validated['actual_physical_cash'];
        $variance = $actualCash - $expectedCash;

        if ($variance !== 0 && empty(trim((string) ($validated['variance_reason'] ?? '')))) {
            throw ValidationException::withMessages([
                'variance_reason' => ['Terdapat selisih kas fisik. Alasan selisih kas wajib diisi.'],
            ]);
        }

        $closing = CashClosing::create([
            'closing_code' => 'CLS-' . strtoupper(Str::random(6)),
            'closing_date' => $date,
            'shift_name' => $validated['shift_name'],
            'employee_profile_id' => $ctx['employee_id'],
            'actor_name' => $ctx['actor_name'],
            'opening_cash_balance' => $openingCash,
            'cash_sales_amount' => $cashSales,
            'qris_sales_amount' => $qrisSales,
            'cash_expenses_amount' => $cashExpenses,
            'cash_refunds_amount' => $cashRefunds,
            'expected_closing_cash' => $expectedCash,
            'actual_Physical_cash' => $actualCash,
            'variance_amount' => $variance,
            'variance_reason' => $validated['variance_reason'] ?? null,
            'status' => 'SUBMITTED',
        ]);

        AuditLog::record(
            'CASH_CLOSING_SUBMITTED',
            $ctx['actor_name'],
            $ctx['role'],
            'CashClosing',
            $closing->id,
            sprintf(
                'Closing kas %s (%s): Saldo seharusnya Rp %s, Fisik Rp %s, Selisih Rp %s',
                $date,
                $validated['shift_name'],
                number_format($expectedCash, 0, ',', '.'),
                number_format($actualCash, 0, ',', '.'),
                number_format($variance, 0, ',', '.')
            )
        );

        return response()->json([
            'message' => 'Penutupan kas (Closing) berhasil disimpan.',
            'closing' => $closing,
        ], 201);
    }

    /**
     * Serve private payment proof image to authenticated cashier/owner.
     */
    public function viewPaymentProof($orderId)
    {
        $order = Order::with('latestPayment')->findOrFail($orderId);
        $path = $order->latestPayment?->proof_file_path;
        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File bukti pembayaran tidak ditemukan.'], 404);
        }
        return Storage::disk('local')->response($path);
    }

    public function markNotificationsRead()
    {
        Notification::where('target_role', 'cashier')->where('is_read', false)->update(['is_read' => true]);
        return response()->json(['message' => 'Notifikasi ditandai sudah dibaca.']);
    }
}
