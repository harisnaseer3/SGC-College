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
            new Middleware('permission:view_fee_reports', only: ['defaulters', 'collection']),
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

            $query = Student::whereHas('studentFees', function($q) use ($dueDateBefore) {
                $q->whereIn('status', ['unpaid', 'partial'])
                  ->where('due_date', '<=', Carbon::parse($dueDateBefore)->toDateString());
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

            $students = $query->get()->map(function($student) use ($dueDateBefore) {
                $fees = $student->studentFees()
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->where('due_date', '<=', Carbon::parse($dueDateBefore)->toDateString())
                    ->with('feeHead')
                    ->get();

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
}
