<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'expense_date' => 'date',
        'amount' => 'integer',
        'is_demo' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function cashAccount()
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function employeeProfile()
    {
        return $this->belongsTo(EmployeeProfile::class);
    }
}
