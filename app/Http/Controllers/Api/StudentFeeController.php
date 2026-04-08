<?php

namespace App\Http\Controllers\Api;

use App\Models\StudentFee;
use App\Services\FeeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

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
    public function index(Request $request)
    {
        $query = StudentFee::with(['student', 'feeHead']);

        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('campus_id')) {
            $query->where('campus_id', $request->campus_id);
        }

        $fees = $query->orderBy('due_date', 'desc')->paginate(20);

        return $this->sendResponse($fees, 'Student fees retrieved successfully.');
    }

    /**
     * Bulk generate fees for students (The Billing Engine).
     */
    public function generate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'campus_id' => 'required|exists:campuses,id',
            'program_id' => 'nullable|exists:programs,id',
            'academic_batch_id' => 'nullable|exists:academic_batches,id',
            'due_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $count = $this->feeService->generateFees(
            $request->campus_id,
            $request->program_id,
            $request->academic_batch_id,
            $request->due_date
        );

        return $this->sendResponse(['count' => $count], "Billing process completed. $count fee records generated.");
    }

    /**
     * Trigger manual fine application.
     */
    public function applyFines(Request $request)
    {
        $count = $this->feeService->applyFines($request->campus_id);
        return $this->sendResponse(['count' => $count], "Fine application process completed. $count records updated.");
    }
}
