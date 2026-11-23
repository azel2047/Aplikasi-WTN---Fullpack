<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAdjustment extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'system_stock' => 'float',
        'physical_stock' => 'float',
        'difference' => 'float',
    ];

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }
}
