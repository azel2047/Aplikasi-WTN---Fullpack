<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TableSession extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'last_activity_at' => 'datetime',
    ];

    public function diningTable()
    {
        return $this->belongsTo(DiningTable::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
