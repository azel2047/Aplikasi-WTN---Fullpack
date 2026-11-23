<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrafficEvent extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'amount' => 'integer',
        'metadata' => 'array',
        'occurred_at' => 'datetime',
        'is_demo' => 'boolean',
    ];
}
