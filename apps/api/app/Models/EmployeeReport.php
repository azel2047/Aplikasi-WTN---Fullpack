<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeReport extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'report_date' => 'date',
        'total_orders_count' => 'integer',
        'completed_orders_count' => 'integer',
        'cancelled_orders_count' => 'integer',
        'gross_revenue_amount' => 'integer',
        'cash_revenue_amount' => 'integer',
        'qris_revenue_amount' => 'integer',
        'refund_amount' => 'integer',
        'expenses_amount' => 'integer',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'is_demo' => 'boolean',
    ];

    public function employeeProfile()
    {
        return $this->belongsTo(EmployeeProfile::class);
    }

    public function attachments()
    {
        return $this->hasMany(EmployeeReportAttachment::class);
    }
}
