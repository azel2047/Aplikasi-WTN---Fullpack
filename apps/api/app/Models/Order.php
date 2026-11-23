<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'subtotal_amount' => 'integer',
        'discount_amount' => 'integer',
        'tax_amount' => 'integer',
        'total_amount' => 'integer',
        'cogs_amount' => 'integer',
        'stock_deducted' => 'boolean',
        'stock_restored' => 'boolean',
        'waiter_called' => 'boolean',
        'is_demo' => 'boolean',
        'stock_deducted_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'preparing_at' => 'datetime',
        'ready_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'waiter_called_at' => 'datetime',
    ];

    public function diningTable()
    {
        return $this->belongsTo(DiningTable::class);
    }

    public function tableSession()
    {
        return $this->belongsTo(TableSession::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment()
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function statusHistories()
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at');
    }

    public function rating()
    {
        return $this->hasOne(Rating::class);
    }

    public function handledByEmployee()
    {
        return $this->belongsTo(EmployeeProfile::class, 'handled_by_employee_id');
    }
}
