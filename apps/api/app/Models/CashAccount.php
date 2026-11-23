<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashAccount extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'opening_balance' => 'integer',
        'current_balance' => 'integer',
        'is_active' => 'boolean',
    ];

    public function transactions()
    {
        return $this->hasMany(CashTransaction::class)->orderByDesc('occurred_at');
    }
}
