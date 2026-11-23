<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockPurchase extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'purchase_date' => 'date',
        'total_amount' => 'integer',
        'is_demo' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(StockPurchaseItem::class);
    }

    public function cashAccount()
    {
        return $this->belongsTo(CashAccount::class);
    }
}
