<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeSession extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function employeeProfile()
    {
        return $this->belongsTo(EmployeeProfile::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
