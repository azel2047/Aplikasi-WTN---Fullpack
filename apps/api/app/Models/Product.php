<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'price' => 'integer',
        'is_available' => 'boolean',
        'track_inventory' => 'boolean',
    ];
    protected $appends = ['effective_available', 'stock_status_reason'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function options()
    {
        return $this->hasMany(ProductOption::class)->orderBy('sort_order');
    }

    public function recipe()
    {
        return $this->hasOne(Recipe::class);
    }

    public function getEffectiveAvailableAttribute(): bool
    {
        if (!$this->is_available) {
            return false;
        }
        if ($this->track_inventory && $this->relationLoaded('recipe') && $this->recipe && $this->recipe->is_validated) {
            foreach ($this->recipe->items as $item) {
                if ($item->ingredient && (float) $item->ingredient->current_stock < (float) $item->quantity) {
                    return false;
                }
            }
        }
        return true;
    }

    public function getStockStatusReasonAttribute(): ?string
    {
        if (!$this->is_available) {
            return 'Dinonaktifkan dari menu';
        }
        if ($this->track_inventory && $this->relationLoaded('recipe') && $this->recipe && $this->recipe->is_validated) {
            foreach ($this->recipe->items as $item) {
                if ($item->ingredient && (float) $item->ingredient->current_stock < (float) $item->quantity) {
                    return 'Bahan habis: ' . $item->ingredient->name;
                }
            }
        }
        return null;
    }
}
