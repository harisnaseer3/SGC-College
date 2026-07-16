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
            ->with('feeHead')
            ->where('voucher_number', $voucherNumber)
            ->get();

        if ($fees->isEmpty()) {
            $voucher->delete();
            return;
        }

        $maxSem = $voucher->semester_number;
        
        $currentFees = $fees->filter(function($fee) {
            return strtolower($fee->feeHead->name ?? '') !== 'arrears';
        });

        $voucherArrearsFees = $fees->filter(function($fee) {
            return strtolower($fee->feeHead->name ?? '') === 'arrears';
        });

        // If there are no current semester fees, treat all associated fees as current
        if ($currentFees->isEmpty()) {
            $currentFees = $fees;
            $voucherArrearsFees = collect();
        }

        $amount = $currentFees->sum('amount');
        $fineAmount = $currentFees->sum('fine_amount');
        $discountAmount = $currentFees->sum('discount_amount');
        $currentPaid = $currentFees->sum('paid_amount');
        
        $currentExpected = $amount + $fineAmount - $discountAmount;
        $currentBalance = max(0.00, $currentExpected - $currentPaid);

        // Fetch current arrears balance from previous semesters that have NOT been carried forward yet
        $olderArrearsBalance = (float) StudentFee::withoutGlobalScopes()
            ->where('student_id', $voucher->student_id)
            ->where('semester_number', '<', $maxSem)
            ->where('status', '!=', 'carried_forward')
            ->where(function($q) use ($voucherNumber) {
                $q->whereNull('voucher_number')
                  ->orWhere('voucher_number', '!=', $voucherNumber);
            })
            ->sum('balance_amount');

        // Total arrears balance is the arrears fee record balance + older uncarried arrears balance
        $voucherArrearsBalance = $voucherArrearsFees->sum('balance_amount');
        $totalArrearsBalance = $voucherArrearsBalance + $olderArrearsBalance;

        // Total balance of the voucher (current balance + arrears balance)
        $totalBalance = $currentBalance + $totalArrearsBalance;

        // Total paid amount on this voucher includes current paid and arrears paid
        $paidAmount = $currentPaid + $voucherArrearsFees->sum('paid_amount');

        // Snapshot of arrears amount
        $totalArrearsAmount = $voucherArrearsFees->sum('amount');

        $status = $voucher->status;
        if ($status !== 'carried_forward') {
            if ($totalBalance <= 0) {
                $status = 'paid';
            } elseif ($paidAmount > 0) {
                $status = 'partial';
            } else {
                $status = 'unpaid';
            }
        }

        $voucher->update([
            'amount' => $amount,
            'arrears_amount' => $totalArrearsAmount,
            'fine_amount' => $fineAmount,
            'discount_amount' => $discountAmount,
            'paid_amount' => $paidAmount,
            'balance_amount' => $totalBalance,
            'status' => $status,
        ]);
    }
}
