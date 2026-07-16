<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use App\Models\GeneratedVoucher;
use App\Models\StudentFee;
use App\Models\FeeHead;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            $vouchers = GeneratedVoucher::whereIn('status', ['unpaid', 'partial'])
                ->where('arrears_amount', '>', 0)
                ->get();

            foreach ($vouchers as $voucher) {
                // Check if an Arrears fee already exists for this voucher
                $hasArrearsFee = StudentFee::where('voucher_number', $voucher->voucher_number)
                    ->whereHas('feeHead', function($q) {
                        $q->where('name', 'Arrears');
                    })
                    ->exists();

                if ($hasArrearsFee) {
                    continue;
                }

                // Find the original previous semester fees that were carried forward into this voucher
                $originalArrearsFees = StudentFee::where('student_id', $voucher->student_id)
                    ->where('semester_number', '<', $voucher->semester_number)
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->get();

                if ($originalArrearsFees->isEmpty()) {
                    continue;
                }

                // 1. Mark them as carried_forward
                foreach ($originalArrearsFees as $fee) {
                    $fee->status = 'carried_forward';
                    $fee->save();
                }

                // 2. Create the Arrears fee record
                $arrearsHead = FeeHead::firstOrCreate(
                    ['name' => 'Arrears', 'organization_id' => $voucher->organization_id],
                    ['description' => 'Carried forward unpaid fees from previous semesters', 'campus_id' => $voucher->campus_id]
                );

                $arrearsAmount = (float) $voucher->arrears_amount;
                
                // Calculate if any arrears were already paid (in case of partial voucher status)
                $currentSemesterExpected = (float)$voucher->amount + (float)$voucher->fine_amount - (float)$voucher->discount_amount;
                $arrearsPaid = max(0.00, (float)$voucher->paid_amount - $currentSemesterExpected);
                $arrearsPaid = min($arrearsPaid, $arrearsAmount);

                $arrearsDescription = "Arrears: " . $originalArrearsFees->map(function($f) {
                    return ($f->feeHead->name ?? 'Fee') . ' (Sem ' . $f->semester_number . ')';
                })->implode(', ');

                StudentFee::create([
                    'organization_id' => $voucher->organization_id,
                    'campus_id' => $voucher->campus_id,
                    'student_id' => $voucher->student_id,
                    'fee_head_id' => $arrearsHead->id,
                    'amount' => $arrearsAmount,
                    'discount_amount' => 0.00,
                    'fine_amount' => 0.00,
                    'paid_amount' => $arrearsPaid,
                    'balance_amount' => $arrearsAmount - $arrearsPaid,
                    'due_date' => $voucher->due_date,
                    'status' => $arrearsPaid >= $arrearsAmount ? 'paid' : ($arrearsPaid > 0 ? 'partial' : 'unpaid'),
                    'remarks' => $arrearsDescription,
                    'semester_number' => $voucher->semester_number,
                    'voucher_number' => $voucher->voucher_number,
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Failed to convert existing vouchers arrears: " . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
