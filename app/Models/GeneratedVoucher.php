<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class GeneratedVoucher extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'student_id',
        'voucher_number',
        'semester_number',
        'due_date',
        'amount',
        'arrears_amount',
        'fine_amount',
        'discount_amount',
        'paid_amount',
        'balance_amount',
        'status',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function studentFees()
    {
        return $this->hasMany(StudentFee::class, 'voucher_number', 'voucher_number');
    }

    public static function recalculateVoucher($voucherNumber)
    {
        if (!$voucherNumber) return;

        $voucher = self::where('voucher_number', $voucherNumber)->first();
        if (!$voucher) return;

        // Use withoutGlobalScopes to bypass user-context filters in model hooks
        $fees = StudentFee::withoutGlobalScopes()
            ->where('voucher_number', $voucherNumber)
            ->get();

        if ($fees->isEmpty()) {
            $voucher->delete();
            return;
        }

        $maxSem = $voucher->semester_number;
        
        $currentFees = $fees->filter(function($fee) use ($maxSem) {
            return $fee->semester_number == $maxSem;
        });

        $amount = $currentFees->sum('amount');
        $arrearsAmount = (float) $voucher->arrears_amount;
        $fineAmount = $fees->sum('fine_amount');
        $discountAmount = $fees->sum('discount_amount');
        $paidAmount = $fees->sum('paid_amount');
        
        $totalExpected = $amount + $arrearsAmount + $fineAmount - $discountAmount;
        $totalBalance = max(0.00, $totalExpected - $paidAmount);

        if ($paidAmount >= $totalExpected) {
            $status = 'paid';
        } elseif ($paidAmount > 0) {
            $status = 'partial';
        } else {
            $status = 'unpaid';
        }

        $voucher->update([
            'amount' => $amount,
            'fine_amount' => $fineAmount,
            'discount_amount' => $discountAmount,
            'paid_amount' => $paidAmount,
            'balance_amount' => $totalBalance,
            'status' => $status,
        ]);
    }
}
