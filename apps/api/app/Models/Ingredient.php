<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ingredient extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'display_conversion_factor' => 'float',
        'current_stock' => 'float',
        'minimum_stock' => 'float',
        'last_purchase_price_per_display_unit' => 'integer',
        'average_cost_per_base_unit' => 'float',
        'is_active' => 'boolean',
    ];
    protected $appends = ['stock_status', 'display_current_stock', 'display_minimum_stock'];

    public function category()
    {
        return $this->belongsTo(IngredientCategory::class, 'ingredient_category_id');
    }

    public function movements()
    {
        return $this->hasMany(InventoryMovement::class)->orderByDesc('created_at');
    }

    public function recipeItems()
    {
        return $this->hasMany(RecipeItem::class);
    }

    public function getStockStatusAttribute(): string
    {
        $stock = (float) $this->current_stock;
        $min = (float) $this->minimum_stock;
        if ($stock <= 0) {
            return 'HABIS';
        }
        if ($stock <= $min) {
            return 'MENIPIS';
        }
        return 'AMAN';
    }

    public function getDisplayCurrentStockAttribute(): float
    {
        $factor = (float) ($this->display_conversion_factor ?? $this->attributes['display_Conversion_factor'] ?? 1);
        if ($factor <= 0) $factor = 1;
        return round((float) $this->current_stock / $factor, 2);
    }

    public function getDisplayMinimumStockAttribute(): float
    {
        $factor = (float) ($this->display_conversion_factor ?? $this->attributes['display_Conversion_factor'] ?? 1);
        if ($factor <= 0) $factor = 1;
        return round((float) $this->minimum_stock / $factor, 2);
    }
}
