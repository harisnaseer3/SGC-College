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
        $structureQuery = FeeStructure::where('campus_id', $campusId);
        if ($programId) $structureQuery->where('program_id', $programId);
        if ($batchId) $structureQuery->where('academic_batch_id', $batchId);
        $structures = $structureQuery->with('items.feeHead')->get();

        $generatedCount = 0;

        // 2. Fetch relevant students
        $studentQuery = Student::where('campus_id', $campusId);
        if ($programId) $studentQuery->where('program_id', $programId);
        if ($batchId) $studentQuery->where('academic_batch_id', $batchId);
        $students = $studentQuery->get();

        foreach ($students as $student) {
            $semNumber = $this->getStudentSemesterNumber($student, $dueDate);
            [$start, $end] = $this->getStudentSemesterRange($student, $semNumber);

            // Deduplicate fee items across all applicable structures for this student
            $itemsToApply = [];
            foreach ($structures as $structure) {
                // Check if structure applies to this student
                if ($structure->program_id && $structure->program_id !== $student->program_id) continue;
                if ($structure->academic_batch_id && $structure->academic_batch_id !== $student->academic_batch_id) continue;

                foreach ($structure->items as $item) {
                    $name = $item->feeHead->name ?? $item->fee_head_id;
                    if (!isset($itemsToApply[$name]) || $itemsToApply[$name]->amount < $item->amount) {
                        $itemsToApply[$name] = $item;
                    }
                }
            }

            foreach ($itemsToApply as $item) {
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
                
                if ($item->amount <= 0) {
                    continue;
                }
                
                $exists = StudentFee::where('student_id', $student->id)
                    ->whereHas('feeHead', function($q) use ($feeHead) {
                        $q->where('name', $feeHead->name);
                    })
                    ->where('semester_number', $semNumber)
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
                        'status' => 'unpaid',
                        'semester_number' => $semNumber
                    ]);
                    $generatedCount++;
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
            ->where(function ($query) use ($student) {
                $query->whereNull('academic_batch_id')
                      ->orWhere('academic_batch_id', $student->academic_batch_id);
            })
            ->with('items.feeHead')
            ->get();

        $generatedCount = 0;

        // Determine student's semester number for the current date
        $semNumber = $this->getStudentSemesterNumber($student, $dueDate);
        [$start, $end] = $this->getStudentSemesterRange($student, $semNumber);

        $itemsToApply = [];
        foreach ($structures as $structure) {
            foreach ($structure->items as $item) {
                $name = $item->feeHead->name ?? $item->fee_head_id;
                if (!isset($itemsToApply[$name]) || $itemsToApply[$name]->amount < $item->amount) {
                    $itemsToApply[$name] = $item;
                }
            }
        }

        foreach ($itemsToApply as $item) {
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
            
            if ($item->amount <= 0) {
                continue;
            }
            $exists = StudentFee::where('student_id', $student->id)
                ->whereHas('feeHead', function($q) use ($feeHead) {
                    $q->where('name', $feeHead->name);
                })
                ->where('semester_number', $semNumber)
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
                    'status' => 'unpaid',
                    'semester_number' => $semNumber
                ]);
                $generatedCount++;
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
            ->where(function ($query) use ($student) {
                $query->whereNull('academic_batch_id')
                      ->orWhere('academic_batch_id', $student->academic_batch_id);
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

            $itemsToApply = [];
            foreach ($structures as $structure) {
                foreach ($structure->items as $item) {
                    $name = $item->feeHead->name ?? $item->fee_head_id;
                    if (!isset($itemsToApply[$name]) || $itemsToApply[$name]->amount < $item->amount) {
                        $itemsToApply[$name] = $item;
                    }
                }
            }

            foreach ($itemsToApply as $item) {
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
                
                if ($item->amount <= 0) {
                    continue;
                }
                $exists = StudentFee::where('student_id', $student->id)
                    ->whereHas('feeHead', function($q) use ($feeHead) {
                        $q->where('name', $feeHead->name);
                    })
                    ->where('semester_number', $s)
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
                        'voucher_number'  => null,
                        'semester_number' => $s,
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
    public function getVoucherData($studentId, $month = null, $year = null, $voucherNumber = null)
    {
        $student = Student::with(['program', 'academicBatch', 'campus.bankAccounts', 'organization'])->findOrFail($studentId);

        if ($voucherNumber) {
            $allPendingFees = StudentFee::with('feeHead')
                ->where('student_id', $studentId)
                ->where('voucher_number', $voucherNumber)
                ->orderBy('due_date', 'asc')
                ->get();

            if ($allPendingFees->isEmpty()) {
                throw new \Exception("Voucher not found.");
            }

            $voucherRecord = \App\Models\GeneratedVoucher::where('voucher_number', $voucherNumber)->first();
            if (!$voucherRecord) {
                // Auto-heal: Backfill the GeneratedVoucher record from the student fees!
                $maxSem = $allPendingFees->max('semester_number') ?: 1;
                $currentFees = $allPendingFees->filter(function($fee) use ($maxSem) {
                    return $fee->semester_number == $maxSem;
                });
                if ($currentFees->isEmpty()) {
                    $currentFees = $allPendingFees;
                }
                
                $arrearsAmount = $allPendingFees->filter(function($fee) use ($maxSem) {
                    return $fee->semester_number < $maxSem;
                })->sum('balance_amount');

                $voucherRecord = \App\Models\GeneratedVoucher::create([
                    'organization_id' => $student->organization_id,
                    'campus_id' => $student->campus_id,
                    'student_id' => $studentId,
                    'voucher_number' => $voucherNumber,
                    'due_date' => $allPendingFees->min('due_date') ?? now(),
                    'semester_number' => $maxSem,
                    'amount' => $currentFees->sum('amount'),
                    'arrears_amount' => $arrearsAmount,
                    'fine_amount' => $allPendingFees->sum('fine_amount'),
                    'discount_amount' => $allPendingFees->sum('discount_amount'),
                    'paid_amount' => $allPendingFees->sum('paid_amount'),
                    'balance_amount' => $allPendingFees->sum('balance_amount'),
                    'status' => $allPendingFees->sum('balance_amount') <= 0 ? 'paid' : ($allPendingFees->sum('paid_amount') > 0 ? 'partial' : 'unpaid'),
                ]);
            }

            $dueDate = $voucherRecord->due_date;
            $validDate = $dueDate->copy()->endOfMonth();
            $semNumber = $voucherRecord->semester_number;
            $feeMonth = $this->getStudentSemesterLabel($student, $semNumber);

            $relationLabel = (strtolower($student->gender) === 'female') ? 'D/O' : 'S/O';

            $orgName = $student->organization->name ?? 'ORG';
            preg_match_all('/\b(\w)/', strtoupper($orgName), $m);
            $orgAbbr = implode('', $m[1] ?? ['O']);

            $campusAbbr = $student->campus->code;
            if (!$campusAbbr) {
                $campusName = $student->campus->name ?? 'CMP';
                preg_match_all('/\b(\w)/', strtoupper($campusName), $m);
                $campusAbbr = implode('', $m[1] ?? ['C']);
            }
            $bankAccounts = $student->campus->bankAccounts ?? [];
            $bankDetailsArray = [];
            foreach ($bankAccounts as $acc) {
                if ($acc->is_active) {
                    $bankDetailsArray[] = trim(implode(' - ', array_filter([
                        $acc->bank_name,
                        $acc->account_number,
                        $acc->account_title,
                        $acc->branch_code ? "Branch Code: " . $acc->branch_code : null
                    ])));
                }
            }
            $bankDetails = implode("\n", $bankDetailsArray);
            if (empty($bankDetails)) {
                $bankDetails = 'No Bank Details Available for this Campus';
            }

            $currentFees = $allPendingFees->filter(function ($fee) use ($semNumber) {
                return $fee->semester_number == $semNumber;
            });

            // If there are no current fees for this semester (e.g. only arrears in the voucher), use all pending
            if ($currentFees->isEmpty()) {
                $currentFees = $allPendingFees;
            }

            $arrearsAmount = (float) $voucherRecord->arrears_amount;
            $previousFine = $allPendingFees->filter(fn($f) => $f->semester_number < $semNumber)->sum('fine_amount');

            $payableWithinDueDate = (float) $voucherRecord->balance_amount;

            $feeItems = $currentFees->values()->map(function ($fee, $index) {
                return [
                    'sr_no' => $index + 1,
                    'head' => $fee->feeHead->name,
                    'amount' => number_format($fee->balance_amount, 0),
                ];
            })->all();

            return [[
                'voucher_number' => $voucherNumber,
                'copy_names' => ["Finance's Copy", "Student's Copy", "Bank's Copy"],
                'institution' => [
                    'name' => $student->campus->name ?? 'Campus Name',
                    'location' => $student->campus->location ?? 'Campus Location',
                    'logo_url' => $student->campus->logo_url,
                    'payment_terms' => $student->campus->payment_terms ?? "Note:\nPayment Terms\nA fine of Rs. 200 will be charged if the fee is not paid by the due date.\nA fine of Rs. 500 will be applicable if the payment remains unpaid in the following month",
                ],
                'academic' => [
                    'voucher_number' => $voucherNumber,
                    'fee_month' => $feeMonth,
                    'issue_date' => $voucherRecord->created_at->format('d M Y'),
                    'due_date' => $dueDate->format('d M Y'),
                    'valid_date' => $validDate->format('d M Y'),
                    'roll_no' => $student->roll_number,
                    'student_id' => $student->admission_number,
                    'adm_reg_no' => "{$student->admission_number}",
                ],
                'student' => [
                    'full_name' => $student->first_name . ' ' . $student->last_name,
                    'parent_relation' => $relationLabel,
                    'guardian_name' => $student->guardian_name,
                    'class' => $student->program ? $student->program->name : 'N/A',
                ],
                'fee_items' => $feeItems,
                'summary' => [
                    'arrears' => number_format($arrearsAmount, 0),
                    'previous_fine' => number_format($previousFine, 0),
                    'payable_within_due_date' => number_format($payableWithinDueDate, 0),
                    'late_fee_fine' => '0', 
                    'absent_fine' => '0',   
                    'payable_after_due_date' => number_format($payableWithinDueDate + 500, 0), 
                ],
                'bank' => [
                    'info' => $bankDetails,
                ]
            ]];
        }
        
        // Get all unpaid or partially paid fees
        $allPendingFees = StudentFee::with('feeHead')
            ->where('student_id', $studentId)
            ->whereIn('status', ['unpaid', 'partial'])
            ->orderBy('due_date', 'asc')
            ->get();

        if ($allPendingFees->isEmpty()) {
            // Fallback: If they requested a specific month/year, they might be trying to print a paid voucher
            if ($month && $year) {
                $allPendingFees = StudentFee::with('feeHead')
                    ->where('student_id', $studentId)
                    ->whereYear('due_date', $year)
                    ->whereMonth('due_date', $month)
                    ->orderBy('due_date', 'asc')
                    ->get();
            }
            
            if ($allPendingFees->isEmpty()) {
                throw new \Exception("No fees found for this student.");
            }
        }

        if ($month && $year) {
            $targetMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        } else {
            $targetMonth = Carbon::now()->startOfMonth();
        }
        
        // Determine target semester number
        $targetMonthFees = $allPendingFees->filter(function ($fee) use ($targetMonth) {
            return $fee->due_date->format('Y-m') === $targetMonth->format('Y-m');
        });
        
        $semNumber = $targetMonthFees->isNotEmpty() && $targetMonthFees->first()->semester_number 
            ? $targetMonthFees->first()->semester_number 
            : $this->getStudentSemesterNumber($student, $targetMonth);

        // Separate current semester fees and arrears by semester_number
        $currentFees = $allPendingFees->filter(function ($fee) use ($student, $semNumber) {
            $feeSem = $fee->semester_number ?: $this->getStudentSemesterNumber($student, $fee->due_date);
            return $feeSem == $semNumber;
        });

        $arrearsFees = $allPendingFees->filter(function ($fee) use ($student, $semNumber) {
            $feeSem = $fee->semester_number ?: $this->getStudentSemesterNumber($student, $fee->due_date);
            return $feeSem < $semNumber;
        });

        // If no fees in target semester, and it was default (now), take latest
        if ($currentFees->isEmpty() && !$month && !$allPendingFees->isEmpty()) {
            $latestFee = $allPendingFees->sortByDesc('due_date')->first();
            $semNumber = $latestFee->semester_number ?: $this->getStudentSemesterNumber($student, $latestFee->due_date);
            
            $currentFees = $allPendingFees->filter(function ($fee) use ($student, $semNumber) {
                $feeSem = $fee->semester_number ?: $this->getStudentSemesterNumber($student, $fee->due_date);
                return $feeSem == $semNumber;
            });
            $arrearsFees = $allPendingFees->filter(function ($fee) use ($student, $semNumber) {
                $feeSem = $fee->semester_number ?: $this->getStudentSemesterNumber($student, $fee->due_date);
                return $feeSem < $semNumber;
            });
        }

        if ($currentFees->isEmpty() && $arrearsFees->isEmpty()) {
            throw new \Exception("No pending fees found for this student as of " . $this->getStudentSemesterLabel($student, $semNumber));
        }

        $feeMonth = $this->getStudentSemesterLabel($student, $semNumber);
        
        // Relation label (S/O or D/O)
        $relationLabel = (strtolower($student->gender) === 'female') ? 'D/O' : 'S/O';

        // Generate dynamic acronyms for Org and Campus
        $orgName = $student->organization->name ?? 'ORG';
        preg_match_all('/\b(\w)/', strtoupper($orgName), $m);
        $orgAbbr = implode('', $m[1] ?? ['O']);

        $campusAbbr = $student->campus->code;
        if (!$campusAbbr) {
            $campusName = $student->campus->name ?? 'CMP';
            preg_match_all('/\b(\w)/', strtoupper($campusName), $m);
            $campusAbbr = implode('', $m[1] ?? ['C']);
        }
        $bankAccounts = $student->campus->bankAccounts ?? [];
        $bankDetailsArray = [];
        foreach ($bankAccounts as $acc) {
            if ($acc->is_active) {
                $bankDetailsArray[] = trim(implode(' - ', array_filter([
                    $acc->bank_name,
                    $acc->account_number,
                    $acc->account_title,
                    $acc->branch_code ? "Branch Code: " . $acc->branch_code : null
                ])));
            }
        }
        
        $bankDetails = implode("\n", $bankDetailsArray);

        if (empty($bankDetails)) {
            $bankDetails = 'No Bank Details Available for this Campus';
        }

        $vouchers = [];

        // If there are no current fees, but we have arrears, create a dummy group for arrears
        if ($currentFees->isEmpty() && $arrearsFees->isNotEmpty()) {
            $groupedFees = collect(['arrears' => collect([])]);
        } else {
            // Find the first installment's date, or default to earliest date if no installments exist
            $firstInstallment = $currentFees->filter(function($fee) {
                return str_contains($fee->remarks ?? '', '(Installment 1/');
            })->first();

            $firstGroupKey = $firstInstallment 
                ? $firstInstallment->due_date->format('Y-m') 
                : $currentFees->min('due_date')->format('Y-m');

            $groupedFees = $currentFees->groupBy(function($fee) use ($firstGroupKey) {
                // If it is an installment, it goes to its own month's group
                if (str_contains($fee->remarks ?? '', '(Installment')) {
                    return $fee->due_date->format('Y-m');
                }
                // Otherwise, it gets bundled into the first group
                return $firstGroupKey;
            })->sortBy(function($fees, $key) {
                return $key;
            });
        }

        $isFirstGroup = true;

        foreach ($groupedFees as $groupKey => $groupFees) {
            $dueDate = $groupFees->isNotEmpty() ? $groupFees->first()->due_date : $targetMonth->copy()->day(10);
            $validDate = $dueDate->copy()->endOfMonth();

            // Only apply previous semester arrears to the FIRST voucher generated in this batch
            $groupArrearsAmount = $isFirstGroup ? $arrearsFees->sum('balance_amount') : 0;
            $groupPreviousFine = $isFirstGroup ? $allPendingFees->filter(fn($f) => $f->due_date->startOfMonth()->lt($targetMonth))->sum('fine_amount') : 0;

            $totalCurrent = $groupFees->sum('balance_amount');
            $payableWithinDueDate = $totalCurrent + $groupArrearsAmount;

            // Get or Generate persistent voucher number — scoped to this group's fees only
            $existingVoucher = $groupFees->whereNotNull('voucher_number')->first();
            $hasPartialPayment = $groupFees->where('paid_amount', '>', 0)->isNotEmpty();

            if ($existingVoucher && !$hasPartialPayment) {
                $voucherNumber = $existingVoucher->voucher_number;
            } else {
                $voucherNumber = $this->generateNextVoucherNumber();
            }

            // Persist the new voucher number to this group's fees only
            foreach ($groupFees as $fee) {
                if ($fee->voucher_number !== $voucherNumber) {
                    $fee->update(['voucher_number' => $voucherNumber]);
                }
            }



            $vouchers[] = [
                'voucher_number' => $voucherNumber,
                'copy_names' => ["Finance's Copy", "Student's Copy", "Bank's Copy"],
                'institution' => [
                    'name' => $student->campus->name ?? 'Campus Name',
                    'location' => $student->campus->location ?? 'Campus Location',
                    'logo_url' => $student->campus->logo_url,
                    'payment_terms' => $student->campus->payment_terms ?? "Note:\nPayment Terms\nA fine of Rs. 200 will be charged if the fee is not paid by the due date.\nA fine of Rs. 500 will be applicable if the payment remains unpaid in the following month",
                ],
                'academic' => [
                    'voucher_number' => $voucherNumber,
                    'fee_month' => $groupKey === 'arrears' ? $feeMonth : $feeMonth . " (" . Carbon::createFromFormat('Y-m', $groupKey)->format('M Y') . ")",
                    'issue_date' => Carbon::now()->format('d M Y'),
                    'due_date' => $dueDate->format('d M Y'),
                    'valid_date' => $validDate->format('d M Y'),
                    'roll_no' => $student->roll_number,
                    'student_id' => $student->admission_number,
                    'adm_reg_no' => "{$student->admission_number}",
                ],
                'student' => [
                    'full_name' => $student->first_name . ' ' . $student->last_name,
                    'parent_relation' => $relationLabel,
                    'guardian_name' => $student->guardian_name,
                    'class' => $student->program ? $student->program->name : 'N/A',
                ],
                'fee_items' => $groupFees->values()->map(function ($fee, $index) {
                    return [
                        'sr_no' => $index + 1,
                        'head' => $fee->feeHead->name,
                        'amount' => number_format($fee->balance_amount, 0),
                    ];
                })->all(),
                'summary' => [
                    'arrears' => number_format($groupArrearsAmount, 0),
                    'previous_fine' => number_format($groupPreviousFine, 0),
                    'payable_within_due_date' => number_format($payableWithinDueDate, 0),
                    'late_fee_fine' => '0', // Placeholder as per image
                    'absent_fine' => '0',   // Placeholder as per image
                    'payable_after_due_date' => number_format($payableWithinDueDate + 500, 0), // Assuming 500 late fee
                ],
                'bank' => [
                    'info' => $bankDetails,
                ]
            ];
            $isFirstGroup = false;
        }

        return $vouchers;
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
                'voucher_number' => $details['voucher_number'] ?? null,
                'payment_date' => $details['payment_date'] ?? now(),
                'receipt_number' => $receiptNumber,
                'received_by' => auth('api')->check() ? auth('api')->id() : (auth()->check() ? auth()->id() : 1),
                'attachment' => $details['attachment'] ?? null,
            ]);

            // 2. Distribute among pending fees
            $query = StudentFee::where('student_id', $studentId)
                ->whereIn('status', ['unpaid', 'partial']);

            if (isset($details['voucher_number']) && $details['voucher_number']) {
                $vNum = $details['voucher_number'];
                
                $pendingFees = StudentFee::where('student_id', $studentId)
                    ->where('voucher_number', $vNum)
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->orderBy('due_date', 'asc')
                    ->get();
            } else {
                $pendingFees = StudentFee::where('student_id', $studentId)
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->orderBy('due_date', 'asc')
                    ->get();
            }

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
        if (DB::connection()->getDriverName() === 'sqlite') {
            $maxVoucher = StudentFee::all()
                ->filter(fn($f) => is_numeric($f->voucher_number))
                ->max(fn($f) => (int)$f->voucher_number);
            return $maxVoucher ? $maxVoucher + 1 : 1001;
        }

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
        // Standardize the start month to the calendar semester (Jan or July) of the admission date
        $startMonth = $admissionDate->month >= 7 ? 7 : 1;
        $standardizedAdmission = $admissionDate->copy()->month($startMonth)->startOfMonth();

        $targetDate = $date->copy()->startOfMonth();

        if ($targetDate->lt($standardizedAdmission)) {
            return 1;
        }

        $diffInMonths = $standardizedAdmission->diffInMonths($targetDate);
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
        return "{$term} {$start->year}";
    }

    /**
     * Clean up any duplicate fees for the same semester to resolve live data issues.
     */
    public function removeDuplicateFees(Student $student)
    {
        $fees = StudentFee::where('student_id', $student->id)->get();
        
        $grouped = [];
        foreach ($fees as $fee) {
            $semNumber = $fee->semester_number ?: $this->getStudentSemesterNumber($student, $fee->due_date);
            // Key by fee_head, semester, amount, and remarks to safely distinguish splits
            $key = $fee->fee_head_id . '_' . $semNumber . '_' . $fee->amount . '_' . ($fee->remarks ?? '');
            if (!isset($grouped[$key])) {
                $grouped[$key] = [];
            }
            $grouped[$key][] = $fee;
        }

        foreach ($grouped as $key => $duplicates) {
            if (count($duplicates) > 1) {
                // Sort so we keep the one that has the most paid amount
                usort($duplicates, function($a, $b) {
                    return $b->paid_amount <=> $a->paid_amount;
                });
                
                // Keep the first, delete the rest
                array_shift($duplicates);
                foreach ($duplicates as $dup) {
                    // Only delete if it has no payments
                    if ($dup->paid_amount <= 0) {
                        $dup->delete();
                    }
                }
            }
        }
    }
}
