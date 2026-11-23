<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiningTable extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'is_active' => 'boolean',
        'qr_generated_at' => 'datetime',
        'last_scanned_at' => 'datetime',
    ];

    public function sessions()
    {
        return $this->hasMany(TableSession::class);
    }

    public function activeSession()
    {
        return $this->hasOne(TableSession::class)->where('status', 'ACTIVE')->latestOfMany();
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
