<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashTransaction extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'amount' => 'integer',
        'balance_before' => 'integer',
        'balance_after' => 'integer',
        'occurred_at' => 'datetime',
        'is_demo' => 'boolean',
    ];

    public function cashAccount()
    {
        return $this->belongsTo(CashAccount::class);
    }
}
