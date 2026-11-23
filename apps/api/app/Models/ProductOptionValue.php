<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductOptionValue extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'price_delta' => 'integer',
        'is_default' => 'boolean',
        'is_available' => 'boolean',
    ];

    public function option()
    {
        return $this->belongsTo(ProductOption::class, 'product_option_id');
    }
}
