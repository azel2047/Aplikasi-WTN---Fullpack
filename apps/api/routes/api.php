<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CashierController;
use App\Http\Controllers\Api\V1\OwnerController;
use App\Http\Controllers\Api\V1\PublicCustomerController;
use App\Http\Middleware\EnsureUserRole;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public Customer & Auth Discovery Endpoints
    Route::get('/auth/employee-profiles', [AuthController::class, 'employeeProfiles']);
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:30,1');

    Route::prefix('public')->group(function () {
        Route::get('/tables', [PublicCustomerController::class, 'listActiveTables']);
        Route::get('/tables/{token}/menu', [PublicCustomerController::class, 'tableMenu']);
        Route::post('/orders', [PublicCustomerController::class, 'createOrder'])->middleware('throttle:60,1');
        Route::get('/orders/{publicCode}', [PublicCustomerController::class, 'showOrder']);
        Route::post('/orders/{publicCode}/payment-proof', [PublicCustomerController::class, 'uploadPaymentProof'])->middleware('throttle:30,1');
        Route::post('/orders/{publicCode}/call-waiter', [PublicCustomerController::class, 'callWaiter'])->middleware('throttle:20,1');
        Route::post('/orders/{publicCode}/rating', [PublicCustomerController::class, 'submitRating'])->middleware('throttle:20,1');
        Route::get('/qris-image', [PublicCustomerController::class, 'qrisImage']);
    });

    // Authenticated Endpoints (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/switch-shift', [AuthController::class, 'switchShiftProfile']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Cashier Endpoints (Accessible by employee and owner)
        Route::prefix('cashier')->middleware(EnsureUserRole::class . ':employee,owner')->group(function () {
            Route::get('/orders', [CashierController::class, 'orders']);
            Route::get('/orders/{id}', [CashierController::class, 'showOrder']);
            Route::patch('/orders/{id}/status', [CashierController::class, 'updateStatus']);
            Route::post('/orders/{id}/payments', [CashierController::class, 'processPayment']);
            Route::post('/orders/{id}/refund', [CashierController::class, 'refundOrder']);
            Route::get('/orders/{id}/payment-proof', [CashierController::class, 'viewPaymentProof']);
            Route::post('/notifications/read', [CashierController::class, 'markNotificationsRead']);

            Route::get('/pos/catalog', [CashierController::class, 'posCatalog']);
            Route::post('/pos/orders', [CashierController::class, 'createPosOrder']);

            Route::get('/expenses', [CashierController::class, 'listExpenses']);
            Route::post('/expenses', [CashierController::class, 'storeExpense']);

            Route::get('/daily-reports', [CashierController::class, 'dailyReportContext']);
            Route::post('/daily-reports', [CashierController::class, 'submitDailyReport']);
            Route::post('/reports/daily', [CashierController::class, 'submitDailyReport']); // Alias matching PRD table

            Route::get('/closings', [CashierController::class, 'closingContext']);
            Route::post('/closings', [CashierController::class, 'submitClosing']);
        });

        // Owner Endpoints (Strictly accessible by owner role only)
        Route::prefix('owner')->middleware(EnsureUserRole::class . ':owner')->group(function () {
            Route::get('/dashboard', [OwnerController::class, 'dashboard']);

            // Menu & Categories
            Route::get('/products', [OwnerController::class, 'listMenu']);
            Route::post('/categories', [OwnerController::class, 'storeCategory']);
            Route::post('/products', [OwnerController::class, 'storeProduct']);
            Route::put('/products/{id}', [OwnerController::class, 'updateProduct']);
            Route::patch('/products/{id}', [OwnerController::class, 'updateProduct']);
            Route::delete('/products/{id}', [OwnerController::class, 'deleteProduct']);

            // 9 Tables & QR Management
            Route::get('/tables', [OwnerController::class, 'listTables']);
            Route::patch('/tables/{id}', [OwnerController::class, 'updateTable']);
            Route::post('/tables/{id}/regenerate-qr', [OwnerController::class, 'regenerateTableQr']);

            // Inventory, Ingredients, Recipes, Purchases, Stock Opname
            Route::get('/inventory', [OwnerController::class, 'listInventory']);
            Route::get('/ingredients', [OwnerController::class, 'listInventory']);
            Route::post('/ingredients', [OwnerController::class, 'storeIngredient']);
            Route::put('/ingredients/{id}', [OwnerController::class, 'updateIngredient']);
            Route::patch('/ingredients/{id}', [OwnerController::class, 'updateIngredient']);

            Route::get('/recipes', [OwnerController::class, 'listInventory']);
            Route::post('/recipes', [OwnerController::class, 'saveRecipe']);

            Route::post('/inventory/purchases', [OwnerController::class, 'storeStockPurchase']);
            Route::post('/inventory/stock-opname', [OwnerController::class, 'storeStockOpname']);

            // Finance, Expenses, Closings
            Route::get('/finance/cash-flow', [OwnerController::class, 'financeOverview']);
            Route::get('/expenses', [CashierController::class, 'listExpenses']);
            Route::post('/expenses', [CashierController::class, 'storeExpense']);
            Route::patch('/closings/{id}/review', [OwnerController::class, 'lockCashClosing']);

            // Employee Reports, Ratings, Analytics
            Route::get('/employee-reports', [OwnerController::class, 'listEmployeeReports']);
            Route::patch('/employee-reports/{id}/review', [OwnerController::class, 'reviewEmployeeReport']);
            Route::get('/ratings', [OwnerController::class, 'listRatings']);
            Route::get('/analytics/traffic', [OwnerController::class, 'trafficAnalytics']);

            // Settings, Employees, Audit Logs, Exports
            Route::get('/settings', [OwnerController::class, 'getSettings']);
            Route::post('/settings', [OwnerController::class, 'updateSettings']);
            Route::post('/employees', [OwnerController::class, 'storeEmployeeProfile']);
            Route::get('/audit-logs', [OwnerController::class, 'auditLogs']);
            Route::get('/exports', [OwnerController::class, 'exportReport']);
        });
    });
});
