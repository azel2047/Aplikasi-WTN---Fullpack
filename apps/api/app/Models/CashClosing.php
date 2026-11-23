<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashClosing extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'closing_date' => 'date',
        'opening_cash_balance' => 'integer',
        'cash_sales_amount' => 'integer',
        'qris_sales_amount' => 'integer',
        'cash_expenses_amount' => 'integer',
        'cash_purchases_amount' => 'integer',
        'cash_refunds_amount' => 'integer',
        'expected_closing_cash' => 'integer',
        'actual_Physical_cash' => 'integer',
        'variance_amount' => 'integer',
        'locked_at' => 'datetime',
    ];

    public function employeeProfile()
    {
        return $this->belongsTo(EmployeeProfile::class);
    }
}
