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
     * Assign initial fees to a newly enrolled student based on their program/batch.
     */
    public function assignInitialFees(Student $student)
    {
        // Allow assigning fees to both Enrolled and Pending students
        if (!in_array($student->status, ['Enrolled', 'Pending'])) {
            return 0;
        }

        $dueDate = Carbon::now()->addDays(10);
        
        // Fetch structures that apply to this student (Campus + Program)
        $structures = FeeStructure::where('campus_id', $student->campus_id)
            ->where(function ($query) use ($student) {
                $query->whereNull('program_id')
                      ->orWhere('program_id', $student->program_id);
            })
            ->with('items.feeHead')
            ->get();

        $generatedCount = 0;

        foreach ($structures as $structure) {
            foreach ($structure->items as $item) {
                // Check for duplicates in the current month
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

    /**
     * Get aggregated voucher data for a student, matching the official format.
     */
    public function getVoucherData($studentId, $month = null, $year = null)
    {
        $student = Student::with(['program', 'academicBatch', 'campus'])->findOrFail($studentId);
        
        // Get all unpaid or partially paid fees
        $allPendingFees = StudentFee::with('feeHead')
            ->where('student_id', $studentId)
            ->whereIn('status', ['unpaid', 'partially_paid'])
            ->orderBy('due_date', 'asc')
            ->get();

        if ($allPendingFees->isEmpty()) {
            throw new \Exception("No pending fees found for this student.");
        }

        if ($month && $year) {
            $targetMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        } else {
            $targetMonth = Carbon::now()->startOfMonth();
        }
        
        // Separate current month fees and arrears
        $currentFees = $allPendingFees->filter(function ($fee) use ($targetMonth) {
            return $fee->due_date->format('Y-m') === $targetMonth->format('Y-m');
        });

        $arrearsFees = $allPendingFees->filter(function ($fee) use ($targetMonth) {
            return $fee->due_date->format('Y-m') < $targetMonth->format('Y-m') && $fee->due_date->isPast();
        });

        // If no fees in target month, and it was default (now), take latest
        if ($currentFees->isEmpty() && !$month && !$allPendingFees->isEmpty()) {
            $latestMonth = $allPendingFees->max('due_date')->startOfMonth();
            $currentFees = $allPendingFees->filter(function ($fee) use ($latestMonth) {
                return $fee->due_date->format('Y-m') === $latestMonth->format('Y-m');
            });
            $arrearsFees = $allPendingFees->filter(function ($fee) use ($latestMonth) {
                return $fee->due_date->format('Y-m') < $latestMonth->format('Y-m');
            });
            $targetMonth = $latestMonth;
        }

        if ($currentFees->isEmpty() && $month) {
            throw new \Exception("No fees found for " . Carbon::createFromDate($year, $month, 1)->format('M Y'));
        }

        $feeMonth = $targetMonth->format('M Y');
        $dueDate = $currentFees->isNotEmpty() ? $currentFees->first()->due_date : $targetMonth->copy()->day(10);
        $validDate = $dueDate->copy()->endOfMonth();

        $arrearsAmount = $arrearsFees->sum('balance_amount');
        $previousFine = $allPendingFees->filter(fn($f) => $f->due_date->startOfMonth()->lt($targetMonth))->sum('fine_amount');
        
        $totalCurrent = $currentFees->sum('balance_amount');
        $payableWithinDueDate = $totalCurrent + $arrearsAmount;

        // Relation label (S/O or D/O)
        $relationLabel = (strtolower($student->gender) === 'female') ? 'D/O' : 'S/O';

        // Get or Generate persistent voucher number
        $existingVoucher = $currentFees->whereNotNull('voucher_number')->first();
        if ($existingVoucher) {
            $voucherNumber = $existingVoucher->voucher_number;
        } else {
            // Start from 1001 or next available
            $maxVoucher = StudentFee::whereRaw('voucher_number REGEXP "^[0-9]+$"')->max(DB::raw('CAST(voucher_number AS UNSIGNED)'));
            $voucherNumber = $maxVoucher ? $maxVoucher + 1 : 1001;
            
            // Persist to all fees in this group
            foreach ($currentFees as $fee) {
                $fee->update(['voucher_number' => $voucherNumber]);
            }
        }

        return [
            'voucher_number' => $voucherNumber,
            'copy_names' => ["Parent's Copy", "School's Copy", "Bank's Copy"],
            'institution' => [
                'name' => 'TIGES - River Bliss Campus', // In image
                'location' => 'Muzaffarabad',
                'logo_url' => $student->campus->logo_url,
            ],
            'academic' => [
                'voucher_number' => $voucherNumber,
                'fee_month' => $feeMonth,
                'issue_date' => Carbon::now()->format('d M Y'),
                'due_date' => Carbon::now()->addDays(15)->format('d M Y'),
                'valid_date' => $targetMonth->copy()->endOfMonth()->format('d M Y'),
                'roll_no' => $student->roll_number,
                'student_id' => $student->admission_number,
                'adm_reg_no' => 'TIGES/MZD/' . $student->admission_number . '/',
            ],
            'student' => [
                'full_name' => $student->first_name . ' ' . $student->last_name,
                'parent_relation' => $relationLabel,
                'guardian_name' => $student->guardian_name,
                'class' => $student->program ? $student->program->name : 'N/A',
            ],
            'fee_items' => $currentFees->values()->map(function ($fee, $index) {
                return [
                    'sr_no' => $index + 1,
                    'head' => $fee->feeHead->name,
                    'amount' => number_format($fee->amount, 0),
                ];
            })->all(),
            'summary' => [
                'arrears' => number_format($arrearsAmount, 0),
                'previous_fine' => number_format($previousFine, 0),
                'payable_within_due_date' => number_format($payableWithinDueDate, 0),
                'late_fee_fine' => '0', // Placeholder as per image
                'absent_fine' => '0',   // Placeholder as per image
                'payable_after_due_date' => number_format($payableWithinDueDate + 500, 0), // Assuming 500 late fee
            ],
            'bank' => [
                'info' => 'Bank Islami Pakistan Limited-31000223490001-The Integrity Global Education System',
            ]
        ];
    }
}
