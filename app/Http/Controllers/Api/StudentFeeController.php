<?php

namespace App\Http\Controllers\Api;

use App\Models\StudentFee;
use App\Services\FeeService;
use Illuminate\Support\Facades\DB;

class StudentFeeController extends BaseController
{
    protected $feeService;

    public function __construct(FeeService $feeService)
    {
        $this->feeService = $feeService;
    }

    /**
     * Display a listing of student fees.
     */
    public function index(\Illuminate\Http\Request $request)
    {
        try {
            // Start from Student to ensure all students can be listed
            $query = \App\Models\Student::with(['program', 'academicClass']);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('campus_id')) {
                $query->where('campus_id', $request->campus_id);
            }
            if ($request->filled('program_id')) {
                $query->where('program_id', $request->program_id);
            }
            if ($request->filled('academic_batch_id')) {
                $query->where('academic_batch_id', $request->academic_batch_id);
            }

            $students = $query->withSum('studentFees as total_amount', 'amount')
                ->withSum('studentFees as total_paid', 'paid_amount')
                ->withSum('studentFees as total_balance', 'balance_amount')
                ->orderBy('first_name')
                ->get()
                ->map(function ($student) {
                    $totalAmount = $student->total_amount ?? 0;
                    $totalPaid = $student->total_paid ?? 0;
                    $totalBalance = $student->total_balance ?? 0;

                    // Determine aggregated status
                    $status = 'unpaid';
                    if ($totalAmount == 0) {
                        $status = 'no fees';
                    } elseif ($totalBalance <= 0) {
                        $status = 'paid';
                    } elseif ($totalPaid > 0) {
                        $status = 'partial';
                    }

                    return [
                        'student_id' => $student->id,
                        'student' => $student,
                        'total_amount' => $totalAmount,
                        'total_paid' => $totalPaid,
                        'total_balance' => $totalBalance,
                        'aggregated_status' => $status
                    ];
                });

            return $this->sendResponse($students, 'Student fee summaries retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve fee summaries.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Bulk generate fees for students (The Billing Engine).
     */
    public function generate(\App\Http\Requests\Api\Fees\GenerateStudentFeeRequest $request)
    {
        try {
            $count = $this->feeService->generateFees(
                $request->campus_id,
                $request->program_id,
                $request->academic_batch_id,
                $request->due_date
            );

            return $this->sendResponse(['count' => $count], "Billing process completed. $count fee records generated.");
        } catch (\Exception $e) {
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Trigger manual fine application.
     */
    public function applyFines(\Illuminate\Http\Request $request)
    {
        try {
            $count = $this->feeService->applyFines($request->campus_id);
            return $this->sendResponse(['count' => $count], "Fine application process completed. $count records updated.");
        } catch (\Exception $e) {
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get voucher data for a student.
     */
    public function voucher(\Illuminate\Http\Request $request, $studentId)
    {
        try {
            $vouchers = [];
            
            if ($request->has('periods')) {
                // periods=5-2026,6-2026
                $periods = explode(',', $request->periods);
                foreach ($periods as $p) {
                    if (str_contains($p, '-')) {
                        [$m, $y] = explode('-', $p);
                        $vouchers[] = $this->feeService->getVoucherData($studentId, (int)$m, (int)$y);
                    }
                }
            } else {
                $vouchers[] = $this->feeService->getVoucherData($studentId, $request->month, $request->year);
            }
            
            return $this->sendResponse($vouchers, 'Voucher data generated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Voucher Generation Error.', ['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Get voucher data for multiple students in bulk.
     */
    public function bulkVouchers(\Illuminate\Http\Request $request)
    {
        try {
            $studentIds = explode(',', $request->student_ids);
            $month = $request->month;
            $year = $request->year;
            $vouchers = [];

            foreach ($studentIds as $id) {
                try {
                    $vouchers[] = $this->feeService->getVoucherData($id, $month, $year);
                } catch (\Exception $e) {
                    // Skip students with no fees for that month instead of failing the whole batch
                    continue;
                }
            }

            if (empty($vouchers)) {
                throw new \Exception("No vouchers could be generated for the selected students/period.");
            }

            return $this->sendResponse($vouchers, count($vouchers) . ' vouchers generated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Bulk Voucher Generation Error.', ['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Get all fee records for a specific student (Ledger).
     */
    public function studentLedger($studentId)
    {
        try {
            $fees = StudentFee::with('feeHead')
                ->where('student_id', $studentId)
                ->orderBy('due_date', 'desc')
                ->get();
            
            $summary = [
                'total_payable' => $fees->sum('amount'),
                'total_fines' => $fees->sum('fine_amount'),
                'total_discounts' => $fees->sum('discount_amount'),
                'total_paid' => $fees->sum('paid_amount'),
                'total_balance' => $fees->sum('balance_amount'),
            ];

            return $this->sendResponse([
                'fees' => $fees,
                'summary' => $summary
            ], 'Student ledger retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve ledger.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update an individual student fee record.
     */
    public function update(\Illuminate\Http\Request $request, StudentFee $studentFee)
    {
        try {
            $validated = $request->validate([
                'amount' => 'nullable|numeric',
                'discount_amount' => 'nullable|numeric',
                'discount_type' => 'nullable|string|in:fixed,percentage',
                'fine_amount' => 'nullable|numeric',
                'due_date' => 'nullable|date',
                'apply_to_all' => 'nullable|boolean'
            ]);

            $discountVal = $request->discount_amount ?? 0;
            $discountType = $request->discount_type ?? 'fixed';

            if ($request->apply_to_all) {
                $fees = StudentFee::where('student_id', $studentFee->student_id)
                    ->whereIn('status', ['unpaid', 'partially_paid'])
                    ->get();
                
                foreach ($fees as $fee) {
                    $actualDiscount = ($discountType === 'percentage') 
                        ? ($fee->amount * $discountVal) / 100 
                        : $discountVal;

                    $fee->discount_amount = $actualDiscount;
                    $fee->save();
                }
            } else {
                if ($discountType === 'percentage') {
                    $validated['discount_amount'] = ($studentFee->amount * $discountVal) / 100;
                }
                $studentFee->update($validated);
            }

            return $this->sendResponse($studentFee, 'Fee record(s) updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update fee record.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Manually assign initial fees to a student.
     */
    public function manualAssign(\App\Models\Student $student)
    {
        try {
            $count = $this->feeService->assignInitialFees($student);
            
            if ($count === 0) {
                $details = "Student Status: {$student->status}, Campus: {$student->campus_id}, Program: " . ($student->program_id ?? 'None') . ", Batch: " . ($student->academic_batch_id ?? 'None');
                return $this->sendError("No matching fee structure found for this student. ({$details})", [], 404);
            }

            return $this->sendResponse(['count' => $count], "Fees assigned successfully. $count records created.");
        } catch (\Exception $e) {
            return $this->sendError('Failed to assign fees.', ['error' => $e->getMessage()], 500);
        }
    }
    /**
     * Split a fee record into multiple installments.
     */
    public function split(\Illuminate\Http\Request $request, StudentFee $studentFee)
    {
        try {
            $request->validate([
                'installments' => 'required|array|min:2',
                'installments.*.amount' => 'required|numeric|min:1',
                'installments.*.due_date' => 'required|date',
            ]);

            $totalSplit = collect($request->installments)->sum('amount');
            $currentBalance = $studentFee->balance_amount;

            // Use a small epsilon for float comparison if needed, but balance is usually decimal/numeric
            if (abs($totalSplit - $currentBalance) > 0.01) {
                return $this->sendError("Total installments (Rs. $totalSplit) must equal the current balance (Rs. $currentBalance).", [], 422);
            }

            DB::beginTransaction();

            $count = count($request->installments);
            $firstDueDate = $request->installments[0]['due_date'];

            // If splitting tuition, move all other unpaid fees to the first installment's due date
            if (str_contains(strtolower($studentFee->feeHead->name), 'tuition')) {
                \App\Models\StudentFee::where('student_id', $studentFee->student_id)
                    ->where('id', '!=', $studentFee->id)
                    ->whereIn('status', ['unpaid', 'partially_paid'])
                    ->update(['due_date' => $firstDueDate]);
            }

            foreach ($request->installments as $index => $inst) {
                StudentFee::create([
                    'organization_id' => $studentFee->organization_id,
                    'campus_id' => $studentFee->campus_id,
                    'student_id' => $studentFee->student_id,
                    'fee_head_id' => $studentFee->fee_head_id,
                    'amount' => $inst['amount'],
                    'discount_amount' => 0, // Discounts should be applied to installments individually or pre-split
                    'fine_amount' => 0,
                    'paid_amount' => 0,
                    'balance_amount' => $inst['amount'],
                    'due_date' => $inst['due_date'],
                    'status' => 'unpaid',
                    'remarks' => $studentFee->feeHead->name . " (Installment " . ($index + 1) . "/$count)"
                ]);
            }

            // Delete the original record
            $studentFee->delete();

            DB::commit();

            return $this->sendResponse([], 'Fee successfully split into installments.');
        } catch (\Exception $e) {
            DB::rollback();
            return $this->sendError('Failed to split fee.', ['error' => $e->getMessage()], 500);
        }
    }
}
