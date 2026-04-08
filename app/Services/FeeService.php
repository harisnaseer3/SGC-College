<?php

namespace App\Services;

use App\Models\Student;
use App\Models\FeeStructure;
use App\Models\StudentFee;
use App\Models\FeeFinePolicy;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FeeService
{
    /**
     * Generate fees for students based on their program/batch.
     */
    public function generateFees($campusId, $programId = null, $batchId = null, $dueDate = null)
    {
        $dueDate = $dueDate ? Carbon::parse($dueDate) : Carbon::now()->addDays(10);
        
        // 1. Fetch relevant structures
        $query = FeeStructure::where('campus_id', $campusId);
        if ($programId) $query->where('program_id', $programId);
        if ($batchId) $query->where('academic_batch_id', $batchId);
        
        $structures = $query->with('items.feeHead')->get();

        $generatedCount = 0;

        foreach ($structures as $structure) {
            // 2. Fetch students for this structure
            $studentQuery = Student::where('campus_id', $campusId);
            if ($structure->program_id) $studentQuery->where('program_id', $structure->program_id);
            if ($structure->academic_batch_id) $studentQuery->where('academic_batch_id', $structure->academic_batch_id);
            
            $students = $studentQuery->get();

            foreach ($students as $student) {
                foreach ($structure->items as $item) {
                    // Check if fee already exists for this student/head in the current month/period
                    // For monthly, we check same month/year. For semester, we might need more logic or just generate once.
                    $exists = StudentFee::where('student_id', $student->id)
                        ->where('fee_head_id', $item->fee_head_id)
                        ->whereMonth('due_date', $dueDate->month)
                        ->whereYear('due_date', $dueDate->year)
                        ->exists();

                    if (!$exists) {
                        StudentFee::create([
                            'organization_id' => $student->organization_id,
                            'campus_id' => $student->campus_id,
                            'student_id' => $student->id,
                            'fee_head_id' => $item->fee_head_id,
                            'amount' => $item->amount,
                            'balance_amount' => $item->amount,
                            'due_date' => $dueDate,
                            'status' => 'unpaid'
                        ]);
                        $generatedCount++;
                    }
                }
            }
        }

        return $generatedCount;
    }

    /**
     * Apply fines to overdue student fees.
     */
    public function applyFines($campusId = null)
    {
        $today = Carbon::today();
        
        $query = StudentFee::where('status', '!=', 'paid')
            ->where('due_date', '<', $today);
            
        if ($campusId) $query->where('campus_id', $campusId);

        $overdueFees = $query->get();
        $appliedCount = 0;

        foreach ($overdueFees as $fee) {
            $policy = FeeFinePolicy::where('campus_id', $fee->campus_id)
                ->where('fee_head_id', $fee->fee_head_id)
                ->first();

            if ($policy) {
                $overdueDays = $today->diffInDays($fee->due_date);
                
                if ($overdueDays > $policy->grace_days) {
                    $fineAmount = 0;
                    if ($policy->fine_type === 'fixed') {
                        $fineAmount = $policy->fine_amount;
                    } else {
                        $fineAmount = ($fee->amount * $policy->fine_amount) / 100;
                    }

                    // Avoid double application: usually we check if fine was already applied for this period
                    if ($fee->fine_amount < $fineAmount) {
                        $diff = $fineAmount - $fee->fine_amount;
                        $fee->fine_amount = $fineAmount;
                        $fee->balance_amount += $diff;
                        $fee->save();
                        $appliedCount++;
                    }
                }
            }
        }

        return $appliedCount;
    }
}
