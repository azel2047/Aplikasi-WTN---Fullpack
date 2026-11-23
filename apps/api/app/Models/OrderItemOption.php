<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItemOption extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['price_delta_snapshot' => 'integer'];

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }
}
