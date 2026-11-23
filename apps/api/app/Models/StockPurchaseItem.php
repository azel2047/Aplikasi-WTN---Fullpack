<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockPurchaseItem extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'quantity_in_base_unit' => 'float',
        'display_quantity' => 'float',
        'unit_price' => 'integer',
        'subtotal' => 'integer',
    ];

    public function purchase()
    {
        return $this->belongsTo(StockPurchase::class, 'stock_purchase_id');
    }

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }
}
