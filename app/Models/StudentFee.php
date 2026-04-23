<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class StudentFee extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // Recalculate balance
            $amount = $model->amount ?? 0;
            $fine = $model->fine_amount ?? 0;
            $discount = $model->discount_amount ?? 0;
            $paid = $model->paid_amount ?? 0;

            $model->balance_amount = ($amount + $fine) - $discount - $paid;
            
            // Adjust balance and status
            if ($model->balance_amount <= 0) {
                $model->status = 'paid';
                $model->balance_amount = 0;
            } elseif ($paid > 0) {
                $model->status = 'partially_paid';
            } else {
                $model->status = 'unpaid';
            }
        });
    }

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
        'voucher_number',
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
