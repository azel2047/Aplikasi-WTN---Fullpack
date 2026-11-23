<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'quantity' => 'float',
        'stock_before' => 'float',
        'stock_after' => 'float',
        'unit_cost_snapshot' => 'integer',
        'total_cost_snapshot' => 'integer',
    ];

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }
}
