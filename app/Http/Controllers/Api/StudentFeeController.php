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
            $currentMonth = now()->startOfMonth();
            $query = StudentFee::with('student')
                ->selectRaw("student_id, SUM(amount) as total_amount, SUM(paid_amount) as total_paid, SUM(balance_amount) as total_balance, SUM(CASE WHEN due_date < '{$currentMonth->toDateString()}' THEN balance_amount ELSE 0 END) as total_arrears, MIN(due_date) as earliest_due_date, MAX(status) as aggregated_status");

            if ($request->has('student_id')) {
                $query->where('student_id', $request->student_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('campus_id')) {
                $query->where('campus_id', $request->campus_id);
            }

            $fees = $query->groupBy('student_id')
                ->orderBy('earliest_due_date', 'asc')
                ->get();

            return $this->sendResponse($fees, 'Student fee summaries retrieved successfully.');
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
}
