<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class FeePayment extends Model
{
    use SoftDeletes;

    use \App\Traits\LogsActivity;

    use HasOrganizationScope, HasCampusScope;

    protected static function booted()
    {
        static::restored(function ($payment) {
            $remaining = (float) $payment->amount;
            if ($remaining <= 0) return;

            $fees = \App\Models\StudentFee::where('student_id', $payment->student_id)
                ->when($payment->voucher_number, function ($q, $v) {
                    $q->where('voucher_number', $v);
                })
                ->whereIn('status', ['unpaid', 'partial'])
                ->orderBy('due_date', 'asc')
                ->get();

            if ($fees->isEmpty() && $payment->voucher_number) {
                $fees = \App\Models\StudentFee::where('student_id', $payment->student_id)
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->orderBy('due_date', 'asc')
                    ->get();
            }

            foreach ($fees as $fee) {
                if ($remaining <= 0) break;
                $payable = (float) $fee->balance_amount;
                $apply = min($remaining, $payable);
                $fee->paid_amount += $apply;
                $fee->save();
                $remaining -= $apply;
            }
        });
    }

    protected $fillable = [
        'organization_id',
        'campus_id',
        'student_id',
        'amount',
        'payment_method',
        'transaction_id',
        'payment_date',
        'receipt_number',
        'voucher_number',
        'received_by',
        'attachment',
    ];

    protected $appends = [
        'attachment_url',
    ];

    public function getAttachmentUrlAttribute()
    {
        return $this->attachment ? asset('storage/' . $this->attachment) : null;
    }

    protected $casts = [
        'payment_date' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by')->withoutGlobalScopes();
    }

    public function campus()
    {
        return $this->belongsTo(Campus::class);
    }
}
