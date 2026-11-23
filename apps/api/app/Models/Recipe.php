<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Recipe extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'version' => 'integer',
        'is_validated' => 'boolean',
    ];
    protected $appends = ['estimated_cogs'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function items()
    {
        return $this->hasMany(RecipeItem::class);
    }

    public function getEstimatedCogsAttribute(): int
    {
        if (!$this->relationLoaded('items')) {
            return 0;
        }
        $total = 0;
        foreach ($this->items as $item) {
            if ($item->ingredient) {
                $total += (float) $item->quantity * (float) $item->ingredient->average_cost_per_base_unit;
            }
        }
        return (int) round($total);
    }
}
