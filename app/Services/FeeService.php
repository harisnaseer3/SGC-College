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
                // Determine which semester number this dueDate corresponds to for this student
                $semNumber = $this->getStudentSemesterNumber($student, $dueDate);
                [$start, $end] = $this->getStudentSemesterRange($student, $semNumber);

                foreach ($structure->items as $item) {
                    $feeHead = $item->feeHead;
                    $isOneTime = ($feeHead->frequency === 'one_time' || $feeHead->frequency_name === 'Once at First Fee');
                    $isSemester = ($feeHead->frequency === 'semester');

                    if ($semNumber === 1) {
                        if (!$isOneTime && !$isSemester) {
                            continue;
                        }
                    } else {
                        if (!$isSemester) {
                            continue;
                        }
                    }
                    $exists = StudentFee::where('student_id', $student->id)
                        ->where('fee_head_id', $item->fee_head_id)
                        ->whereBetween('due_date', [$start, $end])
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

        // Determine student's semester number for the current date
        $semNumber = $this->getStudentSemesterNumber($student, $dueDate);
        [$start, $end] = $this->getStudentSemesterRange($student, $semNumber);

        foreach ($structures as $structure) {
            foreach ($structure->items as $item) {
                $feeHead = $item->feeHead;
                $isOneTime = ($feeHead->frequency === 'one_time' || $feeHead->frequency_name === 'Once at First Fee');
                $isSemester = ($feeHead->frequency === 'semester');

                if ($semNumber === 1) {
                    if (!$isOneTime && !$isSemester) {
                        continue;
                    }
                } else {
                    if (!$isSemester) {
                        continue;
                    }
                }
                $exists = StudentFee::where('student_id', $student->id)
                    ->where('fee_head_id', $item->fee_head_id)
                    ->whereBetween('due_date', [$start, $end])
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
     * Backfill missing monthly fee records for a student from admission date to today.
     * Called when viewing a student's ledger to ensure all owed months are visible.
     */
    public function backfillMissingFees(Student $student): int
    {
        if (!in_array($student->status, ['Enrolled', 'Pending', 'Promoted'])) {
            return 0;
        }

        if (!$student->admission_date) {
            return 0;
        }

        $admissionDate = Carbon::parse($student->admission_date);
        $currentDate = Carbon::now();

        // Fetch fee structures that apply to this student
        $structures = FeeStructure::where('campus_id', $student->campus_id)
            ->where(function ($query) use ($student) {
                $query->whereNull('program_id')
                      ->orWhere('program_id', $student->program_id);
            })
            ->with('items.feeHead')
            ->get();

        if ($structures->isEmpty()) {
            return 0;
        }

        $generatedCount = 0;

        // Find current semester number for the student
        $currentSem = $this->getStudentSemesterNumber($student, $currentDate);

        for ($s = 1; $s <= $currentSem; $s++) {
            [$start, $end] = $this->getStudentSemesterRange($student, $s);
            $dueDate = $start->copy()->day(10);

            // Find any existing voucher number already assigned to this semester's fees
            $existingSemVoucher = StudentFee::where('student_id', $student->id)
                ->whereBetween('due_date', [$start, $end])
                ->whereNotNull('voucher_number')
                ->value('voucher_number');

            // Generate one new voucher number for the semester only if none exists
            $semVoucherNumber = $existingSemVoucher ?? $this->generateNextVoucherNumber();

            foreach ($structures as $structure) {
                foreach ($structure->items as $item) {
                    $feeHead = $item->feeHead;
                    $isOneTime = ($feeHead->frequency === 'one_time' || $feeHead->frequency_name === 'Once at First Fee');
                    $isSemester = ($feeHead->frequency === 'semester');

                    if ($s === 1) {
                        if (!$isOneTime && !$isSemester) {
                            continue;
                        }
                    } else {
                        if (!$isSemester) {
                            continue;
                        }
                    }
                    $exists = StudentFee::where('student_id', $student->id)
                        ->where('fee_head_id', $item->fee_head_id)
                        ->whereBetween('due_date', [$start, $end])
                        ->exists();

                    if (!$exists) {
                        StudentFee::create([
                            'organization_id' => $student->organization_id,
                            'campus_id'       => $student->campus_id,
                            'student_id'      => $student->id,
                            'fee_head_id'     => $item->fee_head_id,
                            'amount'          => $item->amount,
                            'balance_amount'  => $item->amount,
                            'due_date'        => $dueDate,
                            'status'          => 'unpaid',
                            'voucher_number'  => $semVoucherNumber,
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

    /**
     * Get aggregated voucher data for a student, matching the official format.
     */
    public function getVoucherData($studentId, $month = null, $year = null)
    {
        $student = Student::with(['program', 'academicBatch', 'campus'])->findOrFail($studentId);
        
        // Get all unpaid or partially paid fees
        $allPendingFees = StudentFee::with('feeHead')
            ->where('student_id', $studentId)
            ->whereIn('status', ['unpaid', 'partial'])
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
        
        $semNumber = $this->getStudentSemesterNumber($student, $targetMonth);
        [$start, $end] = $this->getStudentSemesterRange($student, $semNumber);

        // Separate current semester fees and arrears
        $currentFees = $allPendingFees->filter(function ($fee) use ($start, $end) {
            return $fee->due_date->between($start, $end);
        });

        $arrearsFees = $allPendingFees->filter(function ($fee) use ($start) {
            return $fee->due_date->lt($start);
        });

        // If no fees in target semester, and it was default (now), take latest
        if ($currentFees->isEmpty() && !$month && !$allPendingFees->isEmpty()) {
            $latestDueDate = $allPendingFees->max('due_date');
            $semNumber = $this->getStudentSemesterNumber($student, $latestDueDate);
            [$start, $end] = $this->getStudentSemesterRange($student, $semNumber);
            $currentFees = $allPendingFees->filter(function ($fee) use ($start, $end) {
                return $fee->due_date->between($start, $end);
            });
            $arrearsFees = $allPendingFees->filter(function ($fee) use ($start) {
                return $fee->due_date->lt($start);
            });
        }

        if ($currentFees->isEmpty() && $arrearsFees->isEmpty()) {
            throw new \Exception("No pending fees found for this student as of " . $this->getStudentSemesterLabel($student, $semNumber));
        }

        $feeMonth = $this->getStudentSemesterLabel($student, $semNumber);
        $dueDate = $currentFees->isNotEmpty() ? $currentFees->first()->due_date : $targetMonth->copy()->day(10);
        $validDate = $dueDate->copy()->endOfMonth();

        $arrearsAmount = $arrearsFees->sum('balance_amount');
        $previousFine = $allPendingFees->filter(fn($f) => $f->due_date->startOfMonth()->lt($targetMonth))->sum('fine_amount');
        
        $totalCurrent = $currentFees->sum('balance_amount');
        $payableWithinDueDate = $totalCurrent + $arrearsAmount;

        // Relation label (S/O or D/O)
        $relationLabel = (strtolower($student->gender) === 'female') ? 'D/O' : 'S/O';

        // Get or Generate persistent voucher number — scoped to the target month only
        $existingVoucher = $currentFees->whereNotNull('voucher_number')->first();
        if ($existingVoucher) {
            $voucherNumber = $existingVoucher->voucher_number;
        } else {
            $voucherNumber = $this->generateNextVoucherNumber();

            // Persist the new voucher number to this month's fees only
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
    
    /**
     * Record a payment and distribute it among pending fees (FIFO).
     */
    public function recordPayment($studentId, $amount, $details = [])
    {
        $remainingAmount = $amount;
        $student = Student::findOrFail($studentId);

        DB::beginTransaction();
        try {
            // 1. Create the payment record
            $receiptNumber = $details['receipt_number'] ?? 'REC-' . strtoupper(dechex(time())) . '-' . rand(100, 999);
            
            \App\Models\FeePayment::create([
                'organization_id' => $student->organization_id,
                'campus_id' => $student->campus_id,
                'student_id' => $student->id,
                'amount' => $amount,
                'payment_method' => $details['payment_method'] ?? 'Cash',
                'transaction_id' => $details['transaction_id'] ?? null,
                'payment_date' => $details['payment_date'] ?? now(),
                'receipt_number' => $receiptNumber,
                'received_by' => auth()->id() ?? 1,
            ]);

            // 2. Distribute among pending fees
            $query = StudentFee::where('student_id', $studentId)
                ->whereIn('status', ['unpaid', 'partial']);

            if (isset($details['voucher_number']) && $details['voucher_number']) {
                $query->where('voucher_number', $details['voucher_number']);
            }

            $pendingFees = $query->orderBy('due_date', 'asc')->get();

            foreach ($pendingFees as $fee) {
                if ($remainingAmount <= 0) break;

                $payable = $fee->balance_amount;
                $paymentForThisFee = min($remainingAmount, $payable);

                $fee->paid_amount += $paymentForThisFee;
                $fee->save(); // Model boot method handles status and balance recalculation

                $remainingAmount -= $paymentForThisFee;
            }

            DB::commit();
            return $receiptNumber;
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }

    /**
     * Generate the next available numeric voucher number.
     */
    public function generateNextVoucherNumber()
    {
        $maxVoucher = StudentFee::whereRaw('voucher_number REGEXP "^[0-9]+$"')->max(DB::raw('CAST(voucher_number AS UNSIGNED)'));
        return $maxVoucher ? $maxVoucher + 1 : 1001;
    }

    /**
     * Get the semester number for a student based on a given date (like due_date).
     */
    public function getStudentSemesterNumber(Student $student, Carbon $date): int
    {
        if (!$student->admission_date) {
            return 1;
        }

        $admissionDate = Carbon::parse($student->admission_date)->startOfMonth();
        $targetDate = $date->copy()->startOfMonth();

        if ($targetDate->lt($admissionDate)) {
            return 1;
        }

        $diffInMonths = $admissionDate->diffInMonths($targetDate);
        $semesterNumber = (int) floor($diffInMonths / 6) + 1;

        // Capped at program's total semesters if available
        if ($student->program && $student->program->total_semesters) {
            $semesterNumber = min($semesterNumber, $student->program->total_semesters);
        }

        return $semesterNumber;
    }

    /**
     * Get the semester date range for a given student and semester number.
     */
    public function getStudentSemesterRange(Student $student, int $semesterNumber): array
    {
        $admissionDate = $student->admission_date 
            ? Carbon::parse($student->admission_date)->startOfMonth() 
            : Carbon::now()->startOfMonth();

        // Standardize the start month to the calendar semester (Jan or July) of the admission date
        $startMonth = $admissionDate->month >= 7 ? 7 : 1;
        $standardizedAdmission = $admissionDate->copy()->month($startMonth)->startOfMonth();

        $semStart = $standardizedAdmission->copy()->addMonths(($semesterNumber - 1) * 6)->startOfMonth();
        $semEnd = $semStart->copy()->addMonths(6)->subDay()->endOfMonth();

        return [$semStart, $semEnd];
    }

    /**
     * Get the descriptive semester label for a student and semester number.
     * Incorporates Semester number, term (Fall/Spring) and year.
     */
    public function getStudentSemesterLabel(Student $student, int $semesterNumber): string
    {
        [$start, $end] = $this->getStudentSemesterRange($student, $semesterNumber);
        $term = $start->month >= 7 ? 'Fall' : 'Spring';
        return "Semester {$semesterNumber} ({$term} {$start->year})";
    }
}
