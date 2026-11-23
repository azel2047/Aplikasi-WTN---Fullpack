<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductOption extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['is_required' => 'boolean'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function values()
    {
        return $this->hasMany(ProductOptionValue::class)->orderBy('sort_order');
    }
}
