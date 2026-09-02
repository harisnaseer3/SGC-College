<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\StudentFee;
use App\Services\FeeService;
use Illuminate\Support\Facades\DB;

class StudentFeeController extends BaseController implements HasMiddleware
{
    use \App\Traits\CompressesImages;

    public static function middleware(): array
    {
        return [
            (new Middleware('role_or_permission:super_admin|view_student_fees'))->only(['index', 'studentLedger', 'voucher', 'bulkVouchers', 'findByVoucher', 'vouchersList']),
            (new Middleware('role_or_permission:super_admin|create_student_fees'))->only(['generate', 'manualAssign', 'generateVoucher']),
            (new Middleware('role_or_permission:super_admin|edit_student_fees'))->only(['update', 'destroyVoucher', 'bulkDestroyVouchers']),
            (new Middleware('role_or_permission:super_admin|pay_student_fees|create_fee_receipts|manage_fee_receipts'))->only(['deposit']),
            (new Middleware('role_or_permission:super_admin|split_student_fees'))->only(['split', 'revertSplit']),
            (new Middleware('role_or_permission:super_admin|apply_fines'))->only(['applyFines']),
            (new Middleware('role_or_permission:super_admin|view_student_fees'))->only(['allPayments', 'showPayment']),
            (new Middleware('role_or_permission:super_admin|edit_student_fees'))->only(['destroyPayment', 'bulkDestroyPayments']),
        ];
    }

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
            $query = \App\Models\Student::with(['program', 'academicClass', 'campus.bankAccounts']);

            if ($request->filled('status')) {
                $status = is_array($request->status) ? $request->status : explode(',', $request->status);
                $query->whereIn('status', $status);
            }

            if ($request->filled('campus_id')) {
                $query->where('campus_id', $request->campus_id);
            }
            if ($request->filled('program_id')) {
                $programIds = is_array($request->program_id) ? $request->program_id : explode(',', $request->program_id);
                $query->whereIn('program_id', $programIds);
            }
            if ($request->filled('academic_batch_id')) {
                $batchIds = is_array($request->academic_batch_id) ? $request->academic_batch_id : explode(',', $request->academic_batch_id);
                $query->whereIn('academic_batch_id', $batchIds);
            }
            if ($request->filled('month') && $request->filled('year')) {
                $date = \Illuminate\Support\Carbon::createFromDate($request->year, $request->month, 1)->endOfMonth();
                $query->where('admission_date', '<=', $date->toDateString());
            }

            if ($request->filled('search')) {
                $search = trim($request->search);
                $terms = array_filter(explode(' ', preg_replace('/\s+/', ' ', $search)));

                $query->where(function($q) use ($search, $terms) {
                    $q->where('first_name', 'like', "%$search%")
                      ->orWhere('last_name', 'like', "%$search%")
                      ->orWhere('roll_number', 'like', "%$search%")
                      ->orWhere('admission_number', 'like', "%$search%")
                      ->orWhere(DB::raw("CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))"), 'like', "%$search%");

                    if (count($terms) > 1) {
                        $q->orWhere(function($subQ) use ($terms) {
                            foreach ($terms as $term) {
                                $subQ->where(function($termQ) use ($term) {
                                    $termQ->where('first_name', 'like', "%$term%")
                                          ->orWhere('last_name', 'like', "%$term%")
                                          ->orWhere('roll_number', 'like', "%$term%")
                                          ->orWhere('admission_number', 'like', "%$term%");
                                });
                            }
                        });
                    }
                });
            }

            $students = $query->withSum(['studentFees as total_amount' => function($q) {
                    $q->where('status', '!=', 'carried_forward');
                }], 'amount')
                ->withSum(['studentFees as total_paid' => function($q) {
                    $q->where('status', '!=', 'carried_forward');
                }], 'paid_amount')
                ->withSum(['studentFees as total_balance' => function($q) {
                    $q->where('status', '!=', 'carried_forward');
                }], 'balance_amount')
                ->orderBy('id', 'desc')
                ->paginate(request('per_page', 10));

            $students->getCollection()->transform(function ($student) {
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
            $result = $this->feeService->generateFees(
                $request->campus_id,
                $request->program_id,
                $request->academic_batch_id,
                $request->due_date
            );

            // Fetch correctly for arrays (new logic) or ints (fallback)
            $count = is_array($result) ? $result['count'] : $result;
            $skipped = is_array($result) ? $result['skipped_struck_off'] : 0;

            $msg = "Billing process completed. $count fee records generated.";
            if ($skipped > 0) {
                $msg .= " Note: $skipped struck-off students were skipped automatically.";
            }

            return $this->sendResponse(['count' => $count, 'skipped' => $skipped], $msg);
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
            
            if ($request->has('voucher_number')) {
                $vouchers = $this->feeService->getVoucherData($studentId, null, null, $request->voucher_number);
            } elseif ($request->has('periods')) {
                // periods=5-2026,6-2026
                $periods = explode(',', $request->periods);
                foreach ($periods as $p) {
                    if (str_contains($p, '-')) {
                        [$m, $y] = explode('-', $p);
                        $vouchers = array_merge($vouchers, $this->feeService->getVoucherData($studentId, (int)$m, (int)$y));
                    }
                }
            } else {
                $vouchers = array_merge($vouchers, $this->feeService->getVoucherData($studentId, $request->month, $request->year));
            }
            
            return $this->sendResponse($vouchers, 'Voucher data generated successfully.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Voucher Generation Error for student ' . $studentId . ': ' . $e->getMessage() . "\n" . $e->getTraceAsString());
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
                    $voucherArray = $this->feeService->getVoucherData($id, $month, $year);
                    $vouchers = array_merge($vouchers, $voucherArray);
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
     * Auto-backfills any missing monthly fees from the student's admission date to today.
     */
    public function studentLedger($studentId)
    {
        try {
            $student = \App\Models\Student::with('program')->findOrFail($studentId);

            // Backfill any months that were never generated (e.g. student admitted in Jan, fees only generated for May)
            $this->feeService->backfillMissingFees($student);
            
            // Clean up any duplicates that might have been caused by previous bugs or race conditions
            $this->feeService->removeDuplicateFees($student);

            $allFees = StudentFee::with('feeHead')
                ->where('student_id', $studentId)
                ->orderBy('due_date', 'asc')
                ->get();

            // For struck-off students: hide unpaid fees with due_date >= struck-off date
            if (strtolower($student->status) === 'struck off' || strtolower($student->status) === 'struck_off') {
                $struckOffLog = \App\Models\StudentStatusLog::where('student_id', $student->id)
                    ->where('status', 'Struck Off')
                    ->orderBy('action_date', 'desc')
                    ->first();
                if ($struckOffLog) {
                    $struckOffDate = \Carbon\Carbon::parse($struckOffLog->action_date)->startOfDay();
                    $allFees = $allFees->filter(function($fee) use ($struckOffDate) {
                        // Always keep paid/partial fees (they are historical records)
                        if (in_array($fee->status, ['paid', 'partial', 'carried_forward'])) {
                            return true;
                        }
                        // Hide unpaid fees whose due date is on or after the struck-off date
                        $feeDueDate = \Carbon\Carbon::parse($fee->due_date)->startOfDay();
                        return $feeDueDate->lt($struckOffDate);
                    })->values();
                }
            }

            $structureType = $student->program->structure_type ?? 'semester';
            if (in_array($structureType, ['monthly', 'annual'])) {
                $currentSem = $this->feeService->getStudentSemesterNumber($student, \Carbon\Carbon::now());
                $allFees = $allFees->filter(function($f) use ($student, $currentSem) {
                    $semNum = $f->semester_number ?: $this->feeService->getStudentSemesterNumber($student, $f->due_date);
                    return $semNum <= $currentSem || $f->paid_amount > 0 || !empty($f->voucher_number);
                })->values();
            }

            // Split: unpaid/partial go to billing details; paid go to payment history
            $unpaidFees = $allFees->whereIn('status', ['unpaid', 'partial', 'carried_forward'])->values();
            $paidFees   = $allFees->where('status', 'paid')->values();

            $summary = [
                'total_payable'   => $allFees->filter(fn($f) => strtolower($f->feeHead->name ?? '') !== 'arrears')->sum('amount'),
                'total_fines'     => $allFees->filter(fn($f) => strtolower($f->feeHead->name ?? '') !== 'arrears')->sum('fine_amount'),
                'total_discounts' => $allFees->filter(fn($f) => strtolower($f->feeHead->name ?? '') !== 'arrears')->sum('discount_amount'),
                'total_paid'      => $allFees->sum('paid_amount'),
                'total_balance'   => $allFees->where('status', '!=', 'carried_forward')->sum('balance_amount'),
            ];

            $payments = \App\Models\FeePayment::where('student_id', $studentId)
                ->orderBy('payment_date', 'desc')
                ->get();

            return $this->sendResponse([
                'fees'      => $unpaidFees,
                'paid_fees' => $paidFees,
                'payments'  => $payments,
                'summary'   => $summary,
                'student'   => $student,
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
                'apply_to_all' => 'nullable|boolean',
                'apply_due_date_to_all' => 'nullable|boolean'
            ]);

            $discountVal = $request->discount_amount ?? 0;
            $discountType = $request->discount_type ?? 'fixed';

            // First, update the specific fee being edited
            $currentFeeUpdates = [];
            if ($request->filled('due_date')) {
                $currentFeeUpdates['due_date'] = $request->due_date;
            }
            if ($request->filled('fine_amount')) {
                $currentFeeUpdates['fine_amount'] = $request->fine_amount;
            }
            if ($request->has('discount_amount') || $request->has('discount_type')) {
                $actualDiscount = ($discountType === 'percentage') 
                    ? ($studentFee->amount * $discountVal) / 100 
                    : $discountVal;
                $currentFeeUpdates['discount_amount'] = $actualDiscount;
            }
            if ($request->filled('amount')) {
                $currentFeeUpdates['amount'] = $request->amount;
            }

            $studentFee->update($currentFeeUpdates);

            // Now, handle bulk application to other fees
            if ($request->apply_to_all || $request->apply_due_date_to_all) {
                $otherFees = StudentFee::where('student_id', $studentFee->student_id)
                    ->where('id', '!=', $studentFee->id)
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->get();
                
                foreach ($otherFees as $fee) {
                    $updates = [];

                    // Apply due date to all other fees if requested
                    if ($request->apply_due_date_to_all && $request->filled('due_date')) {
                        $updates['due_date'] = $request->due_date;
                    }

                    // Apply discount/fine only to the SAME fee head in other semesters
                    if ($request->apply_to_all && $fee->fee_head_id === $studentFee->fee_head_id) {
                        if ($request->filled('fine_amount')) {
                            $updates['fine_amount'] = $request->fine_amount;
                        }
                        if ($request->has('discount_amount') || $request->has('discount_type')) {
                            $actualDiscount = ($discountType === 'percentage') 
                                ? ($fee->amount * $discountVal) / 100 
                                : $discountVal;
                            $updates['discount_amount'] = $actualDiscount;
                        }
                    }

                    if (!empty($updates)) {
                        $fee->update($updates);
                    }
                }
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
            if (strtolower($student->status) === 'struck off' || strtolower($student->status) === 'struck_off') {
                return $this->sendError("Fees cannot be manually assigned because the student is marked as Struck Off.", [], 400);
            }

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
                'installments' => 'required|array|min:2|max:4',
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

            $headName = strtolower($studentFee->feeHead->name ?? '');
            $oneTimeKeywords = ['admission', 'registration', 'prospectus', 'security', 'caution', 'id card', 'card fee', 'certificate', 'degree'];
            foreach ($oneTimeKeywords as $kw) {
                if (str_contains($headName, $kw)) {
                    return $this->sendError("Installments can only be applied to recurring fees (e.g. Monthly Fee or Tuition Fee), not one-time fees.", [], 422);
                }
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
                    'voucher_number' => null,
                    'remarks' => $studentFee->feeHead->name . " (Installment " . ($index + 1) . "/$count)",
                    'semester_number' => $studentFee->semester_number,
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

    /**
     * Record a fee deposit for a student.
     */
    public function deposit(\Illuminate\Http\Request $request)
    {
        try {
            $request->validate([
                'student_id' => 'required|exists:students,id',
                'amount' => 'required|numeric|min:0.01',
                'payment_date' => 'required|date',
                'payment_method' => 'required|string',
                'reference_no' => 'nullable|string',
                'remarks' => 'nullable|string',
                'attachment' => 'required|file|mimes:jpeg,jpg,png,pdf|max:5120',
            ], [
                'attachment.required' => 'Audit receipt attachment is required for fee deposit.',
                'attachment.mimes' => 'Receipt attachment must be a JPEG, PNG, or PDF file.',
                'attachment.max' => 'Receipt attachment file size must not exceed 5MB.',
            ]);

            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $this->compressAndStoreFile($request->file('attachment'), 'receipts');
            }

            $receiptNumber = $this->feeService->recordPayment(
                $request->student_id, 
                (float)$request->amount, 
                [
                    'payment_date' => $request->payment_date,
                    'payment_method' => $request->payment_method,
                    'transaction_id' => $request->reference_no,
                    'remarks' => $request->remarks,
                    'voucher_number' => $request->voucher_number,
                    'attachment' => $attachmentPath,
                ]
            );

            return $this->sendResponse(['receipt_number' => $receiptNumber], 'Payment recorded successfully.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('deposit failed: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return $this->sendError('Failed to record payment.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Find student and fees by voucher number.
     */
    public function findByVoucher($voucherNumber)
    {
        try {
            $voucherNumber = trim($voucherNumber);
            $voucherRecord = \App\Models\GeneratedVoucher::with('student.program', 'student.campus.bankAccounts')
                ->where('voucher_number', $voucherNumber)
                ->first();

            if (!$voucherRecord) {
                return $this->sendError('Active voucher not found or already paid.', [], 404);
            }

            if ($voucherRecord->status === 'carried_forward') {
                return $this->sendError('This voucher has been carried forward to a newer voucher and is no longer payable.', [], 400);
            }

            // Get current fees directly associated with this voucher
            $voucherFees = StudentFee::with(['student.program', 'student.campus.bankAccounts', 'feeHead'])
                ->where('voucher_number', $voucherNumber)
                ->whereIn('status', ['unpaid', 'partial'])
                ->get();

            $student = $voucherRecord->student;
            $maxSem = $voucherRecord->semester_number;

            // Get arrears fees from previous semesters
            $arrearsFees = StudentFee::with(['student.program', 'student.campus.bankAccounts', 'feeHead'])
                ->where('student_id', $student->id)
                ->where('semester_number', '<', $maxSem)
                ->whereIn('status', ['unpaid', 'partial'])
                ->get();

            $fees = $voucherFees->concat($arrearsFees);

            if ($fees->isEmpty()) {
                return $this->sendError('Active fees for this voucher are already fully paid.', [], 400);
            }

            $totalBalance = $fees->sum('balance_amount');

            return $this->sendResponse([
                'student' => $student,
                'fees' => $fees,
                'total_balance' => $totalBalance
            ], 'Voucher found.');
        } catch (\Exception $e) {
            return $this->sendError('Error finding voucher.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get all fee payments with filters.
     */
    public function allPayments(\Illuminate\Http\Request $request)
    {
        try {
            $query = \App\Models\FeePayment::with(['student.program', 'student.campus', 'receiver']);

            if ($request->filled('start_date')) {
                $query->whereDate('payment_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('payment_date', '<=', $request->end_date);
            }
            if ($request->filled('program_id')) {
                $query->whereHas('student', function($q) use ($request) {
                    $q->where('program_id', $request->program_id);
                });
            }
            if ($request->filled('search')) {
                $search = trim($request->search);
                $terms = array_filter(explode(' ', preg_replace('/\s+/', ' ', $search)));

                $query->where(function($q) use ($search, $terms) {
                    $q->whereHas('student', function($sq) use ($search, $terms) {
                        $sq->where('first_name', 'like', "%$search%")
                          ->orWhere('last_name', 'like', "%$search%")
                          ->orWhere('roll_number', 'like', "%$search%")
                          ->orWhere('admission_number', 'like', "%$search%")
                          ->orWhere(DB::raw("CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))"), 'like', "%$search%");

                        if (count($terms) > 1) {
                            $sq->orWhere(function($subQ) use ($terms) {
                                foreach ($terms as $term) {
                                    $subQ->where(function($termQ) use ($term) {
                                        $termQ->where('first_name', 'like', "%$term%")
                                              ->orWhere('last_name', 'like', "%$term%")
                                              ->orWhere('roll_number', 'like', "%$term%")
                                              ->orWhere('admission_number', 'like', "%$term%");
                                    });
                                }
                            });
                        }
                    })
                    ->orWhere('receipt_number', 'like', "%$search%")
                    ->orWhere('voucher_number', 'like', "%$search%")
                    ->orWhere('transaction_id', 'like', "%$search%");
                });
            }

            $totalAmount = (clone $query)->sum('amount');
            $payments = $query->orderBy('payment_date', 'desc')->paginate($request->get('per_page', 20));

            return $this->sendResponse([
                'paginator' => $payments,
                'total_amount' => $totalAmount
            ], 'Payments retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve payments.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific fee payment.
     */
    public function showPayment($id)
    {
        try {
            $payment = \App\Models\FeePayment::with([
                'student.program', 
                'student.academicBatch', 
                'student.academicClass', 
                'student.section', 
                'student.programSemester', 
                'student.campus', 
                'receiver', 
                'campus'
            ])->findOrFail($id);

            $payment->organization = \App\Models\Organization::find($payment->organization_id);

            // Determine specific semester for this payment
            $semesterNumber = null;
            if ($payment->voucher_number) {
                $voucher = \App\Models\GeneratedVoucher::where('voucher_number', $payment->voucher_number)->first();
                if ($voucher && $voucher->semester_number) {
                    $semesterNumber = $voucher->semester_number;
                }
            }

            if (!$semesterNumber) {
                // Fallback: check student fees with this voucher_number or paid fees
                $feeQuery = \App\Models\StudentFee::where('student_id', $payment->student_id);
                if ($payment->voucher_number) {
                    $feeQuery->where('voucher_number', $payment->voucher_number);
                } else {
                    $feeQuery->where('paid_amount', '>', 0);
                }
                $semesterNumber = $feeQuery->whereNotNull('semester_number')->max('semester_number');
            }

            if ($semesterNumber) {
                $feeService = app(\App\Services\FeeService::class);
                $payment->payment_semester = $feeService->getStudentSemesterLabel($payment->student, (int)$semesterNumber);
            } else {
                $payment->payment_semester = null;
            }

            // Calculate current remaining balance for the student
            $payment->remaining_balance = \App\Models\StudentFee::where('student_id', $payment->student_id)
                ->where('status', '!=', 'carried_forward')
                ->sum('balance_amount');

            return $this->sendResponse($payment, 'Payment retrieved successfully.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('showPayment failed: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return $this->sendError('Failed to retrieve payment.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get a paginated list of all generated fee vouchers, filterable by month/year/status.
     */
    public function vouchersList(\Illuminate\Http\Request $request)
    {
        try {
            $query = \App\Models\GeneratedVoucher::with(['student.program', 'student.campus']);

            // Exclude fee vouchers for struck off students if voucher due date is on or after their struck-off date
            $query->whereNotIn('generated_vouchers.id', function($q) {
                $q->select('generated_vouchers.id')
                  ->from('generated_vouchers')
                  ->join('students', 'students.id', '=', 'generated_vouchers.student_id')
                  ->join('student_status_logs', 'student_status_logs.student_id', '=', 'students.id')
                  ->whereRaw('LOWER(students.status) IN ("struck off", "struck_off")')
                  ->where('student_status_logs.status', 'Struck Off')
                  ->whereRaw('generated_vouchers.due_date >= student_status_logs.action_date');
            });

            if ($request->filled('month') && $request->filled('year')) {
                $query->whereMonth('due_date', $request->month)
                      ->whereYear('due_date', $request->year);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('program_id')) {
                $query->whereHas('student', function($q) use ($request) {
                    $q->where('program_id', $request->program_id);
                });
            }

            if ($request->filled('class_id')) {
                $query->whereHas('student', function($q) use ($request) {
                    $q->where('academic_class_id', $request->class_id);
                });
            }

            if ($request->filled('search')) {
                $search = trim($request->search);
                $terms = array_filter(explode(' ', preg_replace('/\s+/', ' ', $search)));

                $query->where(function($q) use ($search, $terms) {
                    $q->where('voucher_number', 'like', "%$search%")
                      ->orWhereHas('student', function($sq) use ($search, $terms) {
                          $sq->where('first_name', 'like', "%$search%")
                             ->orWhere('last_name', 'like', "%$search%")
                             ->orWhere('roll_number', 'like', "%$search%")
                             ->orWhere(DB::raw("CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))"), 'like', "%$search%");

                          if (count($terms) > 1) {
                              $sq->orWhere(function($subQ) use ($terms) {
                                  foreach ($terms as $term) {
                                      $subQ->where(function($termQ) use ($term) {
                                          $termQ->where('first_name', 'like', "%$term%")
                                                ->orWhere('last_name', 'like', "%$term%")
                                                ->orWhere('roll_number', 'like', "%$term%");
                                      });
                                  }
                              });
                          }
                      });
                });
            }

            $sortBy = $request->get('sort_by', 'id');
            $sortOrder = strtolower($request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

            $allowedSorts = ['id', 'voucher_number', 'due_date', 'amount', 'balance_amount', 'status'];
            if (!in_array($sortBy, $allowedSorts)) {
                $sortBy = 'id';
            }

            $vouchers = $query->orderBy($sortBy, $sortOrder)
                              ->paginate($request->get('per_page', 10));

            // Calculate unique aggregates (excluding carried_forward vouchers to prevent duplicate cumulative sums)
            $allVouchersForAggregates = (clone $query)->select('student_id', 'semester_number', 'amount', 'fine_amount', 'discount_amount', 'arrears_amount', 'paid_amount', 'balance_amount', 'status')
                ->where(function($q) {
                    $q->whereNull('status')->orWhere('status', '!=', 'carried_forward');
                })
                ->get();

            $totalExpected = 0.00;
            $totalArrears = 0.00;
            $totalReceived = 0.00;
            $totalBalance = 0.00;

            foreach ($allVouchersForAggregates as $v) {
                $currentExpected = (float)$v->amount + (float)$v->fine_amount - (float)$v->discount_amount;
                $currentArrears = (float)$v->arrears_amount;
                $currentReceivable = $currentExpected + $currentArrears;
                $currentBalance = (float)$v->balance_amount;
                $currentReceived = max(0.00, $currentReceivable - $currentBalance);

                $totalExpected += $currentExpected;
                $totalArrears += $currentArrears;
                $totalReceived += $currentReceived;
                $totalBalance += $currentBalance;
            }

            return $this->sendResponse([
                'paginator' => $vouchers,
                'aggregates' => [
                    'expected' => $totalExpected,
                    'arrears'  => $totalArrears,
                    'received' => $totalReceived,
                    'balance'  => $totalBalance
                ]
            ], 'Vouchers retrieved successfully.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('vouchersList failed: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return $this->sendError('Failed to retrieve vouchers.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a specific fee payment and reverse its distribution.
     */
    public function destroyPayment($id)
    {
        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $payment = \App\Models\FeePayment::findOrFail($id);
            $amountToReverse = $payment->amount;

            // Reverse the payment distribution (LIFO based on updated_at)
            $fees = \App\Models\StudentFee::where('student_id', $payment->student_id)
                ->where('paid_amount', '>', 0)
                ->orderBy('updated_at', 'desc')
                ->get();

            foreach ($fees as $fee) {
                if ($amountToReverse <= 0) break;

                $amountToDeduct = min($amountToReverse, $fee->paid_amount);
                $fee->paid_amount -= $amountToDeduct;
                $fee->save(); // Status recalculation handled by boot method

                $amountToReverse -= $amountToDeduct;
            }

            // Delete the payment record
            $payment->delete();

            \Illuminate\Support\Facades\DB::commit();
            return $this->sendResponse([], 'Payment receipt deleted successfully and transaction reversed.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollback();
            \Illuminate\Support\Facades\Log::error('destroyPayment failed: ' . $e->getMessage());
            return $this->sendError('Failed to delete payment.', ['error' => $e->getMessage()], 500);
        }
    }

    public function generateVoucher(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'fee_ids' => 'nullable|array',
            'fee_ids.*' => 'exists:student_fees,id',
            'semester_number' => 'nullable|integer',
            'due_date' => 'nullable|date',
        ]);

        $studentId = $request->student_id;
        $student = \App\Models\Student::findOrFail($studentId);

        // Block voucher generation for struck-off students for fees on/after their struck-off date
        if (strtolower($student->status) === 'struck off' || strtolower($student->status) === 'struck_off') {
            $struckOffLog = \App\Models\StudentStatusLog::where('student_id', $student->id)
                ->where('status', 'Struck Off')
                ->orderBy('action_date', 'desc')
                ->first();
            if ($struckOffLog) {
                $struckOffDate = \Carbon\Carbon::parse($struckOffLog->action_date)->startOfDay();
                return $this->sendError(
                    'Voucher generation is not allowed for this student. They were marked as Struck Off on ' . $struckOffDate->format('d M Y') . '. No new vouchers can be issued from that date onward.',
                    [],
                    400
                );
            }
            return $this->sendError('Voucher generation is not allowed for struck-off students.', [], 400);
        }

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $feesQuery = StudentFee::where('student_id', $studentId)
                ->whereIn('status', ['unpaid', 'partial'])
                ->whereNull('voucher_number');

            if ($request->filled('fee_ids')) {
                $feesQuery->whereIn('id', $request->fee_ids);
            } elseif ($request->filled('semester_number')) {
                $feesQuery->where('semester_number', $request->semester_number);
            }

            $fees = $feesQuery->get();

            if ($fees->isEmpty()) {
                return $this->sendError('No unpaid fees found to generate a voucher.', [], 400);
            }

            $firstInstallment = $fees->filter(function($fee) {
                return str_contains($fee->remarks ?? '', '(Installment 1/');
            })->first();

            $firstGroupKey = $firstInstallment 
                ? \Carbon\Carbon::parse($firstInstallment->due_date)->format('Y-m') 
                : ($fees->min('due_date') ? \Carbon\Carbon::parse($fees->min('due_date'))->format('Y-m') : now()->format('Y-m'));

            $groupedFees = $fees->groupBy(function($fee) use ($firstGroupKey) {
                if (str_contains($fee->remarks ?? '', '(Installment')) {
                    return \Carbon\Carbon::parse($fee->due_date)->format('Y-m');
                }
                return $firstGroupKey;
            })->sortBy(function($fees, $key) {
                return $key;
            });

            $vouchers = [];
            $isFirstGroup = true;

            foreach ($groupedFees as $groupKey => $groupFees) {
                $maxSem = $groupFees->max('semester_number') ?: 1;

                $arrears = collect();
                $arrearsSum = 0.00;
                if ($isFirstGroup) {
                    $arrears = StudentFee::where('student_id', $studentId)
                        ->whereIn('status', ['unpaid', 'partial'])
                        ->where('semester_number', '<', $maxSem)
                        ->get();
                    $arrearsSum = $arrears->sum('balance_amount');
                }

                $voucherNumber = $this->feeService->generateNextVoucherNumber();
                $dueDate = $request->due_date ?? ($groupFees->min('due_date') ?? now()->addDays(10));

                if ($arrearsSum > 0) {
                    // Update original arrears status to carried_forward
                    foreach ($arrears as $arrFee) {
                        $arrFee->update(['status' => 'carried_forward']);
                    }

                    // Update older vouchers to carried_forward status
                    \App\Models\GeneratedVoucher::where('student_id', $studentId)
                        ->where('semester_number', '<', $maxSem)
                        ->whereIn('status', ['unpaid', 'partial'])
                        ->update(['status' => 'carried_forward']);

                    // Get or create Arrears Fee Head
                    $arrearsHead = \App\Models\FeeHead::firstOrCreate(
                        ['name' => 'Arrears', 'organization_id' => $student->organization_id],
                        ['description' => 'Carried forward unpaid fees from previous semesters', 'campus_id' => $student->campus_id]
                    );

                    $arrearsDescription = "Arrears: " . $arrears->map(function($f) {
                        return ($f->feeHead->name ?? 'Fee') . ' (Sem ' . $f->semester_number . ')';
                    })->implode(', ');

                    // Create Arrears fee record for the new voucher / semester
                    StudentFee::create([
                        'organization_id' => $student->organization_id,
                        'campus_id' => $student->campus_id,
                        'student_id' => $studentId,
                        'fee_head_id' => $arrearsHead->id,
                        'amount' => $arrearsSum,
                        'discount_amount' => 0.00,
                        'fine_amount' => 0.00,
                        'paid_amount' => 0.00,
                        'balance_amount' => $arrearsSum,
                        'due_date' => $dueDate,
                        'status' => 'unpaid',
                        'remarks' => $arrearsDescription,
                        'semester_number' => $maxSem,
                        'voucher_number' => $voucherNumber,
                    ]);
                }

                $voucher = \App\Models\GeneratedVoucher::create([
                    'organization_id' => $student->organization_id,
                    'campus_id' => $student->campus_id,
                    'student_id' => $studentId,
                    'voucher_number' => $voucherNumber,
                    'due_date' => $dueDate,
                    'semester_number' => $maxSem,
                    'amount' => $groupFees->sum('amount'),
                    'arrears_amount' => $arrearsSum,
                    'fine_amount' => $groupFees->sum('fine_amount'),
                    'discount_amount' => $groupFees->sum('discount_amount'),
                    'paid_amount' => 0.00,
                    'balance_amount' => $groupFees->sum('balance_amount') + $arrearsSum,
                    'status' => 'unpaid',
                ]);

                foreach ($groupFees as $fee) {
                    $fee->update(['voucher_number' => $voucherNumber]);
                }

                $vouchers[] = $voucher;
                $isFirstGroup = false;
            }

            \Illuminate\Support\Facades\DB::commit();

            return $this->sendResponse($vouchers, count($vouchers) . ' voucher(s) generated successfully.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollback();
            return $this->sendError('Failed to generate voucher.', ['error' => $e->getMessage()], 500);
        }
    }

    public function destroyVoucher($id)
    {
        try {
            $voucher = \App\Models\GeneratedVoucher::findOrFail($id);

            if ($voucher->status !== 'unpaid') {
                return $this->sendError('Only unpaid vouchers can be deleted.', [], 400);
            }

            \Illuminate\Support\Facades\DB::beginTransaction();

            // Delete any Arrears fees on this voucher
            StudentFee::withoutGlobalScopes()
                ->where('voucher_number', $voucher->voucher_number)
                ->whereHas('feeHead', function($q) {
                    $q->where('name', 'Arrears');
                })
                ->delete();

            // Dissociate other fees
            StudentFee::withoutGlobalScopes()
                ->where('voucher_number', $voucher->voucher_number)
                ->update(['voucher_number' => null]);

            // Restore older carried_forward fees of this student
            $carriedForwardFees = StudentFee::withoutGlobalScopes()
                ->where('student_id', $voucher->student_id)
                ->where('semester_number', '<', $voucher->semester_number)
                ->where('status', 'carried_forward')
                ->get();

            foreach ($carriedForwardFees as $cfFee) {
                $cfFee->status = $cfFee->paid_amount > 0 ? 'partial' : 'unpaid';
                $cfFee->save();
            }

            // Restore older carried_forward vouchers of this student
            $carriedForwardVouchers = \App\Models\GeneratedVoucher::where('student_id', $voucher->student_id)
                ->where('semester_number', '<', $voucher->semester_number)
                ->where('status', 'carried_forward')
                ->get();

            foreach ($carriedForwardVouchers as $cfVoucher) {
                $cfVoucher->status = 'unpaid';
                $cfVoucher->save();
                \App\Models\GeneratedVoucher::recalculateVoucher($cfVoucher->voucher_number);
            }

            $voucher->delete();

            \Illuminate\Support\Facades\DB::commit();
            return $this->sendResponse([], 'Voucher deleted successfully.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollback();
            return $this->sendError('Failed to delete voucher.', ['error' => $e->getMessage()], 500);
        }
    }

    public function bulkDestroyVouchers(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:generated_vouchers,id',
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $vouchers = \App\Models\GeneratedVoucher::whereIn('id', $request->ids)->get();

            $deletedCount = 0;
            foreach ($vouchers as $voucher) {
                if ($voucher->status !== 'unpaid') {
                    return $this->sendError("Only unpaid vouchers can be deleted. Voucher {$voucher->voucher_number} is {$voucher->status}.", [], 400);
                }

                // Delete any Arrears fees on this voucher
                StudentFee::withoutGlobalScopes()
                    ->where('voucher_number', $voucher->voucher_number)
                    ->whereHas('feeHead', function($q) {
                        $q->where('name', 'Arrears');
                    })
                    ->delete();

                // Dissociate other fees
                StudentFee::withoutGlobalScopes()
                    ->where('voucher_number', $voucher->voucher_number)
                    ->update(['voucher_number' => null]);

                // Restore older carried_forward fees of this student
                $carriedForwardFees = StudentFee::withoutGlobalScopes()
                    ->where('student_id', $voucher->student_id)
                    ->where('semester_number', '<', $voucher->semester_number)
                    ->where('status', 'carried_forward')
                    ->get();

                foreach ($carriedForwardFees as $cfFee) {
                    $cfFee->status = $cfFee->paid_amount > 0 ? 'partial' : 'unpaid';
                    $cfFee->save();
                }

                // Restore older carried_forward vouchers of this student
                $carriedForwardVouchers = \App\Models\GeneratedVoucher::where('student_id', $voucher->student_id)
                    ->where('semester_number', '<', $voucher->semester_number)
                    ->where('status', 'carried_forward')
                    ->get();

                foreach ($carriedForwardVouchers as $cfVoucher) {
                    $cfVoucher->status = 'unpaid';
                    $cfVoucher->save();
                    \App\Models\GeneratedVoucher::recalculateVoucher($cfVoucher->voucher_number);
                }

                $voucher->delete();
                $deletedCount++;
            }

            \Illuminate\Support\Facades\DB::commit();
            return $this->sendResponse([], "$deletedCount voucher(s) deleted successfully.");
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollback();
            return $this->sendError('Failed to delete vouchers in bulk.', ['error' => $e->getMessage()], 500);
        }
    }

    public function bulkDestroyPayments(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:fee_payments,id',
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $payments = \App\Models\FeePayment::whereIn('id', $request->ids)->get();

            $deletedCount = 0;
            foreach ($payments as $payment) {
                $amountToReverse = $payment->amount;

                // Reverse the payment distribution (LIFO based on updated_at)
                $fees = \App\Models\StudentFee::where('student_id', $payment->student_id)
                    ->where('paid_amount', '>', 0)
                    ->orderBy('updated_at', 'desc')
                    ->get();

                foreach ($fees as $fee) {
                    if ($amountToReverse <= 0) break;

                    $amountToDeduct = min($amountToReverse, $fee->paid_amount);
                    $fee->paid_amount -= $amountToDeduct;
                    $fee->save(); // Recalculation handled by boot method

                    $amountToReverse -= $amountToDeduct;
                }

                $payment->delete();
                $deletedCount++;
            }

            \Illuminate\Support\Facades\DB::commit();
            return $this->sendResponse([], "$deletedCount receipt(s) deleted and payment(s) reversed successfully.");
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollback();
            \Illuminate\Support\Facades\Log::error('bulkDestroyPayments failed: ' . $e->getMessage());
            return $this->sendError('Failed to delete receipts in bulk.', ['error' => $e->getMessage()], 500);
        }
    }

    public function revertSplit(\App\Models\StudentFee $studentFee)
    {
        try {
            // Check if this fee is indeed an installment
            if (!str_contains(strtolower($studentFee->remarks), '(installment')) {
                return $this->sendError("This fee record is not part of an installment split.", [], 422);
            }

            // Find all companion installment records
            $installments = \App\Models\StudentFee::where('student_id', $studentFee->student_id)
                ->where('fee_head_id', $studentFee->fee_head_id)
                ->where('semester_number', $studentFee->semester_number)
                ->where('remarks', 'like', $studentFee->feeHead->name . ' (Installment %')
                ->get();

            // If any installment is paid or partial, we can't revert the split
            foreach ($installments as $inst) {
                if ($inst->paid_amount > 0 || $inst->status !== 'unpaid') {
                    return $this->sendError("Cannot delete installments because one or more installments have payments recorded.", [], 422);
                }
            }

            \Illuminate\Support\Facades\DB::beginTransaction();

            // Calculate total amount and find the earliest due date
            $totalAmount = $installments->sum('amount');
            $earliestDueDate = $installments->min('due_date');

            // Reconstruct the undivided fee record
            \App\Models\StudentFee::create([
                'organization_id' => $studentFee->organization_id,
                'campus_id' => $studentFee->campus_id,
                'student_id' => $studentFee->student_id,
                'fee_head_id' => $studentFee->fee_head_id,
                'amount' => $totalAmount,
                'discount_amount' => 0,
                'fine_amount' => 0,
                'paid_amount' => 0,
                'balance_amount' => $totalAmount,
                'due_date' => $earliestDueDate,
                'status' => 'unpaid',
                'voucher_number' => null,
                'remarks' => null,
                'semester_number' => $studentFee->semester_number,
            ]);

            // Delete all the installments
            foreach ($installments as $inst) {
                $inst->delete();
            }

            \Illuminate\Support\Facades\DB::commit();

            return $this->sendResponse([], 'Installments successfully reverted back to a single fee.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollback();
            return $this->sendError('Failed to revert installments.', ['error' => $e->getMessage()], 500);
        }
    }
}
