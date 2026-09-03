<?php

namespace App\Http\Controllers\Api\Reports;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use App\Http\Controllers\Api\BaseController;
use App\Models\Student;
use App\Models\StudentFee;
use Illuminate\Http\Request;
use Carbon\Carbon;

class FeeReportController extends BaseController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            (new Middleware('permission:view_fee_reports'))->only(['defaulters', 'collection', 'studentSummary']),
        ];
    }

    /**
     * Defaulter Report: Get list of students with outstanding overdue balances.
     */
    public function defaulters(Request $request)
    {
        try {
            $dueDateBefore = $request->input('due_date_before', Carbon::today()->toDateString());
            $campusId = $request->input('campus_id');
            $programId = $request->input('program_id');
            $batchId = $request->input('academic_batch_id');
            $includeStruckOff = filter_var($request->input('include_struck_off', false), FILTER_VALIDATE_BOOLEAN);
            $search = trim($request->input('search', ''));

            // Only include students who have at least one voucher-generated unpaid or partial fee
            $query = Student::whereHas('studentFees', function($q) {
                $q->whereIn('status', ['unpaid', 'partial'])
                  ->whereNotNull('voucher_number');
            })->with(['program:id,name', 'campus:id,name', 'academicBatch:id,name']);

            if ($campusId && !$request->hasHeader('X-Campus-ID')) {
                $query->where('campus_id', $campusId);
            }
            if ($programId) {
                $query->where('program_id', $programId);
            }
            if ($batchId) {
                $query->where('academic_batch_id', $batchId);
            }
            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('first_name', 'LIKE', "%{$search}%")
                      ->orWhere('last_name', 'LIKE', "%{$search}%")
                      ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                      ->orWhere('roll_number', 'LIKE', "%{$search}%")
                      ->orWhere('admission_number', 'LIKE', "%{$search}%");
                });
            }

            // Exclude struck-off students unless explicitly requested
            if (!$includeStruckOff) {
                $query->where(function($q) {
                    $q->whereNotIn(\Illuminate\Support\Facades\DB::raw('LOWER(status)'), ['struck off', 'struck_off'])
                      ->orWhereNull('status');
                });
            }

            $students = $query->get()->map(function($student) use ($includeStruckOff) {
                // Determine struck-off date (if student is struck off)
                $struckOffDate = null;
                if (strtolower($student->status) === 'struck off' || strtolower($student->status) === 'struck_off') {
                    $struckOffLog = \App\Models\StudentStatusLog::where('student_id', $student->id)
                        ->where('status', 'Struck Off')
                        ->orderBy('action_date', 'desc')
                        ->first();
                    if ($struckOffLog) {
                        $struckOffDate = Carbon::parse($struckOffLog->action_date)->startOfDay();
                    }
                }

                // Only count fees where a voucher was actually generated and are still unpaid/partial
                $fees = $student->studentFees()
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->whereNotNull('voucher_number')
                    ->with('feeHead')
                    ->get();

                // Exclude fees on/after the struck-off date for struck-off students
                if ($struckOffDate) {
                    $fees = $fees->filter(function($fee) use ($struckOffDate) {
                        return Carbon::parse($fee->due_date)->startOfDay()->lt($struckOffDate);
                    })->values();
                }

                $totalOverdue = $fees->sum('balance_amount');

                return [
                    'id' => $student->id,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'admission_number' => $student->admission_number,
                    'roll_number' => $student->roll_number,
                    'program' => $student->program->name ?? 'N/A',
                    'campus' => $student->campus->name ?? 'N/A',
                    'batch' => $student->academicBatch->name ?? 'N/A',
                    'total_overdue' => (float)$totalOverdue,
                    'fees' => $fees->map(fn($f) => [
                        'fee_head' => $f->feeHead->name ?? 'N/A',
                        'due_date' => $f->due_date->format('d M Y'),
                        'amount' => (float)$f->amount,
                        'paid_amount' => (float)$f->paid_amount,
                        'balance_amount' => (float)$f->balance_amount,
                        'voucher_number' => $f->voucher_number,
                        'remarks' => $f->remarks
                    ])
                ];
            })->filter(fn($s) => $s['total_overdue'] > 0)->sortByDesc('total_overdue')->values();

            $totalOverdueSum = $students->sum('total_overdue');

            return $this->sendResponse([
                'defaulters' => $students,
                'total_overdue_sum' => $totalOverdueSum,
                'count' => $students->count(),
                'filters' => [
                    'due_date_before' => $dueDateBefore,
                    'campus_id' => $campusId,
                    'program_id' => $programId,
                    'academic_batch_id' => $batchId
                ]
            ], 'Defaulter report generated successfully.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate defaulter report.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Fee Collection Report: Get fee payments summary over date range.
     */
    public function collection(Request $request)
    {
        try {
            $startDate = $request->input('start_date', Carbon::today()->startOfMonth()->toDateString());
            $endDate   = $request->input('end_date', Carbon::today()->endOfMonth()->toDateString());
            $campusId  = $request->input('campus_id');
            $paymentMethod = $request->input('payment_method');
            $search = trim($request->input('search', ''));

            $query = \App\Models\FeePayment::with(['student.program', 'student.campus', 'receiver']);

            if ($startDate && $endDate) {
                $query->whereBetween('payment_date', [
                    Carbon::parse($startDate)->startOf('day')->toDateString(),
                    Carbon::parse($endDate)->endOf('day')->toDateString()
                ]);
            }

            if ($campusId && !$request->hasHeader('X-Campus-ID')) {
                $query->where('campus_id', $campusId);
            }

            if ($paymentMethod) {
                $query->where('payment_method', $paymentMethod);
            }

            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('receipt_number', 'LIKE', "%{$search}%")
                      ->orWhere('transaction_id', 'LIKE', "%{$search}%")
                      ->orWhereHas('student', function($sq) use ($search) {
                          $sq->where('first_name', 'LIKE', "%{$search}%")
                             ->orWhere('last_name', 'LIKE', "%{$search}%")
                             ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                             ->orWhere('roll_number', 'LIKE', "%{$search}%")
                             ->orWhere('admission_number', 'LIKE', "%{$search}%");
                      });
                });
            }

            $payments = $query->orderBy('payment_date', 'desc')->get();

            $totalAmount = $payments->sum('amount');
            $byMethod = $payments->groupBy('payment_method')->map(fn($group) => $group->sum('amount'));

            $formattedPayments = $payments->map(fn($p) => [
                'id' => $p->id,
                'receipt_number' => $p->receipt_number,
                'payment_date' => $p->payment_date->format('d M Y'),
                'amount' => (float)$p->amount,
                'payment_method' => $p->payment_method,
                'transaction_id' => $p->transaction_id,
                'student_name' => ($p->student->first_name ?? '') . ' ' . ($p->student->last_name ?? ''),
                'roll_number' => $p->student->roll_number ?? '',
                'program' => $p->student->program->name ?? 'N/A',
                'campus' => $p->student->campus->name ?? 'N/A',
                'received_by' => $p->receiver->name ?? 'N/A',
            ]);

            return $this->sendResponse([
                'payments' => $formattedPayments,
                'total_amount' => (float)$totalAmount,
                'by_method' => $byMethod,
                'count' => $payments->count(),
                'filters' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'campus_id' => $campusId,
                    'payment_method' => $paymentMethod
                ]
            ], 'Collection report generated successfully.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate collection report.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Student Fee Summary Report: Get overall fee position (Total Fee, Paid Fee, Remaining Balance) per student.
     */
    public function studentSummary(Request $request)
    {
        try {
            $campusId        = $request->input('campus_id');
            $programId       = $request->input('program_id');
            $batchId         = $request->input('academic_batch_id');
            $statusFilter    = $request->input('status'); // 'all', 'paid', 'defaulter', 'partial'
            $includeStruckOff = filter_var($request->input('include_struck_off', false), FILTER_VALIDATE_BOOLEAN);
            $search          = trim($request->input('search', ''));

            $query = Student::with([
                'program:id,name',
                'campus:id,name',
                'academicBatch:id,name',
                'academicClass:id,name',
                'programSemester:id,name',
                'studentFees.feeHead'
            ]);

            if (!$includeStruckOff) {
                $query->where(function($q) {
                    $q->whereNotIn(\Illuminate\Support\Facades\DB::raw('LOWER(status)'), ['struck off', 'struck_off'])
                      ->orWhereNull('status');
                });
            }

            if ($campusId && !$request->hasHeader('X-Campus-ID')) {
                $query->where('campus_id', $campusId);
            }
            if ($programId) {
                $query->where('program_id', $programId);
            }
            if ($batchId) {
                $query->where('academic_batch_id', $batchId);
            }
            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('first_name', 'LIKE', "%{$search}%")
                      ->orWhere('last_name', 'LIKE', "%{$search}%")
                      ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                      ->orWhere('roll_number', 'LIKE', "%{$search}%")
                      ->orWhere('admission_number', 'LIKE', "%{$search}%");
                });
            }

            $students = $query->get()->map(function($student) {
                // Exclude carried_forward fees to prevent double-counting with consolidated Arrears
                $fees = $student->studentFees->filter(fn($f) => $f->status !== 'carried_forward');

                // Total Fee is Net Payable = (Base Amount + Fine) - Discount
                $totalFee = $fees->sum(fn($f) => ($f->amount + $f->fine_amount) - $f->discount_amount);
                $discountFee = $fees->sum('discount_amount');
                $paidFee = $fees->sum('paid_amount');
                $remainingFee = $fees->sum('balance_amount');

                $status = 'unpaid';
                if ($totalFee > 0 && $remainingFee == 0) {
                    $status = 'paid';
                } else if ($paidFee > 0 && $remainingFee > 0) {
                    $status = 'partial';
                } else if ($totalFee == 0) {
                    $status = 'no_fees';
                }

                return [
                    'id' => $student->id,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'guardian_name' => $student->guardian_name,
                    'admission_number' => $student->admission_number,
                    'roll_number' => $student->roll_number,
                    'student_status' => $student->status,
                    'program' => $student->program->name ?? 'N/A',
                    'campus' => $student->campus->name ?? 'N/A',
                    'batch' => $student->academicBatch->name ?? 'N/A',
                    'class_semester' => $student->academicClass->name ?? $student->programSemester->name ?? 'N/A',
                    'total_fee' => (float)$totalFee,
                    'discount_fee' => (float)$discountFee,
                    'paid_fee' => (float)$paidFee,
                    'remaining_fee' => (float)$remainingFee,
                    'status' => $status,
                    'fees' => $fees->map(fn($f) => [
                        'fee_head' => $f->feeHead->name ?? 'N/A',
                        'due_date' => $f->due_date ? $f->due_date->format('d M Y') : 'N/A',
                        'amount' => (float)(($f->amount + $f->fine_amount) - $f->discount_amount),
                        'discount_amount' => (float)$f->discount_amount,
                        'paid_amount' => (float)$f->paid_amount,
                        'balance_amount' => (float)$f->balance_amount,
                        'status' => $f->status
                    ])->values()
                ];
            });

            // Filter by fee status if requested
            if ($statusFilter === 'paid') {
                $students = $students->filter(fn($s) => $s['status'] === 'paid');
            } else if ($statusFilter === 'defaulter' || $statusFilter === 'unpaid') {
                $students = $students->filter(fn($s) => $s['remaining_fee'] > 0);
            } else if ($statusFilter === 'partial') {
                $students = $students->filter(fn($s) => $s['status'] === 'partial');
            }

            $students = $students->values();

            $grandTotalFee = $students->sum('total_fee');
            $grandDiscountFee = $students->sum('discount_fee');
            $grandPaidFee = $students->sum('paid_fee');
            $grandRemainingFee = $students->sum('remaining_fee');

            return $this->sendResponse([
                'students' => $students,
                'summary' => [
                    'total_students' => $students->count(),
                    'grand_total_fee' => (float)$grandTotalFee,
                    'grand_discount_fee' => (float)$grandDiscountFee,
                    'grand_paid_fee' => (float)$grandPaidFee,
                    'grand_remaining_fee' => (float)$grandRemainingFee,
                ],
                'filters' => [
                    'campus_id' => $campusId,
                    'program_id' => $programId,
                    'academic_batch_id' => $batchId,
                    'status' => $statusFilter,
                    'search' => $search
                ]
            ], 'Student fee summary report generated successfully.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate student fee summary report.', ['error' => $e->getMessage()], 500);
        }
    }
}
