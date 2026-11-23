<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeProfile extends Model
{
    protected $guarded = ['id'];
    protected $hidden = ['pin_hash'];
    protected $casts = ['is_active' => 'boolean'];
}
