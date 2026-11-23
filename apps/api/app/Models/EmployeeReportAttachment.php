<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeReportAttachment extends Model
{
    protected $guarded = ['id'];

    public function report()
    {
        return $this->belongsTo(EmployeeReport::class, 'employee_report_id');
    }
}
