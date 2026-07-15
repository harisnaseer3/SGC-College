<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\StudentFee;
use App\Services\FeeService;
use Illuminate\Support\Facades\DB;

class StudentFeeController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('role_or_permission:super_admin|view_student_fees', only: ['index', 'studentLedger', 'voucher', 'bulkVouchers', 'findByVoucher']),
            new Middleware('role_or_permission:super_admin|create_student_fees', only: ['generate', 'manualAssign']),
            new Middleware('role_or_permission:super_admin|edit_student_fees', only: ['update']),
            new Middleware('role_or_permission:super_admin|pay_student_fees|create_fee_receipts|manage_fee_receipts', only: ['deposit']),
            new Middleware('role_or_permission:super_admin|split_student_fees', only: ['split']),
            new Middleware('role_or_permission:super_admin|apply_fines', only: ['applyFines']),
            new Middleware('role_or_permission:super_admin|view_student_fees', only: ['allPayments', 'showPayment']),
            new Middleware('role_or_permission:super_admin|edit_student_fees', only: ['destroyPayment']),
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
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('first_name', 'like', "%$search%")
                      ->orWhere('last_name', 'like', "%$search%")
                      ->orWhere('roll_number', 'like', "%$search%")
                      ->orWhere('admission_number', 'like', "%$search%");
                });
            }

            $students = $query->withSum('studentFees as total_amount', 'amount')
                ->withSum('studentFees as total_paid', 'paid_amount')
                ->withSum('studentFees as total_balance', 'balance_amount')
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
                        $vouchers = array_merge($vouchers, $this->feeService->getVoucherData($studentId, (int)$m, (int)$y));
                    }
                }
            } else {
                $vouchers = array_merge($vouchers, $this->feeService->getVoucherData($studentId, $request->month, $request->year));
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

            // Split: unpaid/partial go to billing details; paid go to payment history
            $unpaidFees = $allFees->whereIn('status', ['unpaid', 'partial'])->values();
            $paidFees   = $allFees->where('status', 'paid')->values();

            $summary = [
                'total_payable'   => $allFees->sum('amount'),
                'total_fines'     => $allFees->sum('fine_amount'),
                'total_discounts' => $allFees->sum('discount_amount'),
                'total_paid'      => $allFees->sum('paid_amount'),
                'total_balance'   => $allFees->sum('balance_amount'),
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

            if (!str_contains(strtolower($studentFee->feeHead->name), 'semester')) {
                return $this->sendError("Installments can only be applied to Semester Fee.", [], 422);
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
                    'voucher_number' => $this->feeService->generateNextVoucherNumber(),
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
            ]);

            $receiptNumber = $this->feeService->recordPayment(
                $request->student_id, 
                (float)$request->amount, 
                [
                    'payment_date' => $request->payment_date,
                    'payment_method' => $request->payment_method,
                    'transaction_id' => $request->reference_no,
                    'remarks' => $request->remarks,
                    'voucher_number' => $request->voucher_number
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
            $fees = StudentFee::with(['student.program', 'student.campus.bankAccounts', 'feeHead'])
                ->where('voucher_number', $voucherNumber)
                ->whereIn('status', ['unpaid', 'partial'])
                ->get();

            if ($fees->isEmpty()) {
                return $this->sendError('Active voucher not found or already paid.', [], 404);
            }

            $student = $fees->first()->student;
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
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->whereHas('student', function($sq) use ($search) {
                        $sq->where('first_name', 'like', "%$search%")
                          ->orWhere('last_name', 'like', "%$search%")
                          ->orWhere('roll_number', 'like', "%$search%")
                          ->orWhere('admission_number', 'like', "%$search%");
                    })
                    ->orWhere('receipt_number', 'like', "%$search%")
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
            $payment = \App\Models\FeePayment::with(['student.program', 'student.campus', 'receiver', 'campus'])->findOrFail($id);
            $payment->organization = \App\Models\Organization::find($payment->organization_id);
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
            $query = \App\Models\StudentFee::with(['student.program', 'student.campus'])
                ->select('voucher_number', 'student_id')
                ->selectRaw('MIN(id) as id')
                ->selectRaw('MAX(due_date) as due_date')
                ->selectRaw('SUM(amount) as amount')
                ->selectRaw('SUM(fine_amount) as fine_amount')
                ->selectRaw('SUM(discount_amount) as discount_amount')
                ->selectRaw('SUM(paid_amount) as paid_amount')
                ->selectRaw('
                    CASE 
                        WHEN SUM(paid_amount) >= SUM(amount + fine_amount - discount_amount) THEN "paid"
                        WHEN SUM(paid_amount) > 0 THEN "partial"
                        ELSE "unpaid"
                    END as aggregated_status
                ')
                ->whereNotNull('voucher_number')
                ->groupBy('voucher_number', 'student_id');

            if ($request->filled('month') && $request->filled('year')) {
                $query->whereYear('due_date', $request->year)
                      ->whereMonth('due_date', $request->month);
            }

            if ($request->filled('status')) {
                $statusFilter = $request->status;
                if ($statusFilter === 'paid') {
                    $query->havingRaw('SUM(paid_amount) >= SUM(amount + fine_amount - discount_amount)');
                } elseif ($statusFilter === 'partial') {
                    $query->havingRaw('SUM(paid_amount) > 0 AND SUM(paid_amount) < SUM(amount + fine_amount - discount_amount)');
                } elseif ($statusFilter === 'unpaid') {
                    $query->havingRaw('SUM(paid_amount) <= 0');
                }
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('voucher_number', 'like', "%$search%")
                      ->orWhereHas('student', function($sq) use ($search) {
                          $sq->where('first_name', 'like', "%$search%")
                             ->orWhere('last_name', 'like', "%$search%")
                             ->orWhere('roll_number', 'like', "%$search%");
                      });
                });
            }

            // Apply pagination based on grouped results
            $vouchers = $query->orderBy('due_date', 'desc')
                              ->paginate($request->get('per_page', 10));
            
            // Map aggregated_status to status for frontend compatibility
            $vouchers->getCollection()->transform(function ($voucher) {
                $voucher->status = $voucher->aggregated_status;
                return $voucher;
            });

            // Calculate aggregates for the filtered query using a subquery
            $baseSql = $query->toSql();
            $bindings = $query->getBindings();

            $aggregates = \Illuminate\Support\Facades\DB::table(\Illuminate\Support\Facades\DB::raw("({$baseSql}) as grouped_vouchers"))
                ->setBindings($bindings)
                ->select(
                    \Illuminate\Support\Facades\DB::raw('SUM(amount + fine_amount - discount_amount) as total_expected'),
                    \Illuminate\Support\Facades\DB::raw('SUM(paid_amount) as total_received')
                )->first();

            $totalExpected = (float) ($aggregates->total_expected ?? 0);
            $totalReceived = (float) ($aggregates->total_received ?? 0);
            $totalBalance = max(0, $totalExpected - $totalReceived);

            return $this->sendResponse([
                'paginator' => $vouchers,
                'aggregates' => [
                    'expected' => $totalExpected,
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
}
