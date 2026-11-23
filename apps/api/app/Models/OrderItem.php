<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'unit_price_snapshot' => 'integer',
        'options_price_snapshot' => 'integer',
        'quantity' => 'integer',
        'line_total' => 'integer',
        'unit_cogs_snapshot' => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function options()
    {
        return $this->hasMany(OrderItemOption::class);
    }
}
