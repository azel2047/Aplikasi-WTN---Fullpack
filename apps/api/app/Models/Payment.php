<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'amount_due' => 'integer',
        'amount_received' => 'integer',
        'change_amount' => 'integer',
        'proof_uploaded_at' => 'datetime',
        'verified_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function cashAccount()
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function verifiedByEmployee()
    {
        return $this->belongsTo(EmployeeProfile::class, 'verified_by_employee_id');
    }
}
