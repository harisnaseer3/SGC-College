<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class StudentFee extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'student_id',
        'fee_head_id',
        'amount',
        'discount_amount',
        'fine_amount',
        'paid_amount',
        'balance_amount',
        'due_date',
        'status',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function feeHead()
    {
        return $this->belongsTo(FeeHead::class);
    }
}
