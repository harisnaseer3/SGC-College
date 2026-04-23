<?php

namespace App\Http\Controllers\Api;

use App\Models\StudentFee;
use App\Services\FeeService;

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
    public function voucher($studentId)
    {
        try {
            $data = $this->feeService->getVoucherData($studentId);
            return $this->sendResponse($data, 'Voucher data generated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Voucher Generation Error.', ['error' => $e->getMessage()], 400);
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
                'fine_amount' => 'nullable|numeric',
                'due_date' => 'nullable|date',
            ]);

            $studentFee->update($validated);

            return $this->sendResponse($studentFee, 'Fee record updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update fee record.', ['error' => $e->getMessage()], 422);
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
                return $this->sendError('No matching fee structure found for this student.', [], 404);
            }

            return $this->sendResponse(['count' => $count], "Fees assigned successfully. $count records created.");
        } catch (\Exception $e) {
            return $this->sendError('Failed to assign fees.', ['error' => $e->getMessage()], 500);
        }
    }
}
