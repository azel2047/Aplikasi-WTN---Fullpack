<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rating extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'stars' => 'integer',
        'tags' => 'array',
        'is_public_wall' => 'boolean',
        'is_demo' => 'boolean',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function diningTable()
    {
        return $this->belongsTo(DiningTable::class);
    }
}
