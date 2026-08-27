<?php

namespace App\Http\Controllers\Api;

use App\Models\Student;
use App\Models\GeneratedVoucher;
use App\Models\FeePayment;
use App\Models\ExtraIncome;
use App\Models\Expense;
use App\Models\Campus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExternalApiController extends BaseController
{
    /**
     * Get detailed amounts and statistics for external integration.
     */
    public function stats(Request $request)
    {
        try {
            $campusId      = $request->input('campus_id');
            $startDate     = $request->input('start_date');
            $endDate       = $request->input('end_date');
            $month         = $request->input('month');
            $intakeSession = $request->input('intake_session');
            $batchId       = $request->input('academic_batch_id');

            // If month is specified (e.g. "2026-08"), override start/end date
            if ($month && preg_match('/^\d{4}-\d{2}$/', $month)) {
                $startDate = Carbon::parse($month . '-01')->startOfMonth()->toDateString();
                $endDate   = Carbon::parse($month . '-01')->endOfMonth()->toDateString();
            }

            // --- 1. Generated Vouchers & Fee Financials ---
            $vouchersQuery = GeneratedVoucher::query()
                ->where('status', '!=', 'carried_forward');

            if ($campusId) {
                $vouchersQuery->where('campus_id', $campusId);
            }
            if ($startDate && $endDate) {
                $vouchersQuery->whereBetween('due_date', [$startDate, $endDate]);
            }
            if ($intakeSession || $batchId) {
                $vouchersQuery->whereHas('student', function ($q) use ($intakeSession, $batchId) {
                    if ($intakeSession) {
                        $q->where('intake_session', $intakeSession);
                    }
                    if ($batchId) {
                        $q->where('academic_batch_id', $batchId);
                    }
                });
            }

            $vouchers = (clone $vouchersQuery)->get();

            $totalBilledFee    = 0.00;
            $totalArrearsFee   = 0.00;
            $totalOutstanding  = 0.00;
            $totalCollectedFee = 0.00;

            foreach ($vouchers as $v) {
                $currentExpected    = (float)$v->amount + (float)$v->fine_amount - (float)$v->discount_amount;
                $currentArrears     = (float)$v->arrears_amount;
                $currentReceivable  = $currentExpected + $currentArrears;
                $currentBalance     = (float)$v->balance_amount;
                $currentReceived    = max(0.00, $currentReceivable - $currentBalance);

                $totalBilledFee    += $currentExpected;
                $totalArrearsFee   += $currentArrears;
                $totalOutstanding  += $currentBalance;
                $totalCollectedFee += $currentReceived;
            }

            // --- 2. Voucher Counts ---
            $voucherCountsQuery = GeneratedVoucher::query();
            if ($campusId) {
                $voucherCountsQuery->where('campus_id', $campusId);
            }
            if ($startDate && $endDate) {
                $voucherCountsQuery->whereBetween('due_date', [$startDate, $endDate]);
            }

            $voucherStats = $voucherCountsQuery
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('SUM(CASE WHEN status = "paid" THEN 1 ELSE 0 END) as paid')
                ->selectRaw('SUM(CASE WHEN status = "partial" THEN 1 ELSE 0 END) as partial')
                ->selectRaw('SUM(CASE WHEN status = "unpaid" THEN 1 ELSE 0 END) as unpaid')
                ->selectRaw('SUM(CASE WHEN status = "carried_forward" THEN 1 ELSE 0 END) as carried_forward')
                ->selectRaw('SUM(CASE WHEN status != "paid" AND status != "carried_forward" AND due_date < ? THEN 1 ELSE 0 END) as overdue', [now()->startOfDay()])
                ->first();

            // --- 3. Extra Income ---
            $incomeQuery = ExtraIncome::query();
            if ($campusId) {
                $incomeQuery->where('campus_id', $campusId);
            }
            if ($startDate && $endDate) {
                $incomeQuery->whereBetween('date', [$startDate, $endDate]);
            }
            $totalExtraIncome = (float) $incomeQuery->sum('amount');

            // --- 4. Extra Expenses ---
            $expenseQuery = Expense::query();
            if ($campusId) {
                $expenseQuery->where('campus_id', $campusId);
            }
            if ($startDate && $endDate) {
                $expenseQuery->whereBetween('expense_date', [$startDate, $endDate]);
            }
            $totalExtraExpense = (float) $expenseQuery->sum('amount');

            // --- 5. Revenue & Net Cashflow ---
            $totalRevenue = $totalCollectedFee + $totalExtraIncome;
            $netCashflow  = $totalRevenue - $totalExtraExpense;

            // --- 6. Student Statistics ---
            $studentQuery = Student::query();
            if ($campusId) {
                $studentQuery->where('campus_id', $campusId);
            }
            if ($intakeSession) {
                $studentQuery->where('intake_session', $intakeSession);
            }
            if ($batchId) {
                $studentQuery->where('academic_batch_id', $batchId);
            }

            $studentCounts = (clone $studentQuery)
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status');

            $genderBreakdown = (clone $studentQuery)
                ->select('gender', DB::raw('count(*) as total'))
                ->whereNotNull('gender')
                ->groupBy('gender')
                ->pluck('total', 'gender');

            // Count new admissions created in the date range if filtered
            $newAdmissionsQuery = (clone $studentQuery);
            if ($startDate && $endDate) {
                $newAdmissionsQuery->whereBetween('created_at', [
                    Carbon::parse($startDate)->startOfDay(),
                    Carbon::parse($endDate)->endOfDay()
                ]);
            }
            $newAdmissionsCount = $newAdmissionsQuery->count();

            // --- 7. Campus Breakdown ---
            $campuses = Campus::select('id', 'name', 'code')->get()->map(function ($c) use ($startDate, $endDate) {
                $cVal = GeneratedVoucher::where('campus_id', $c->id)
                    ->where('status', '!=', 'carried_forward')
                    ->when($startDate && $endDate, fn($q) => $q->whereBetween('due_date', [$startDate, $endDate]))
                    ->get();

                $cBilled = 0.00;
                $cOutstanding = 0.00;
                $cCollected = 0.00;
                foreach ($cVal as $v) {
                    $exp = (float)$v->amount + (float)$v->fine_amount - (float)$v->discount_amount;
                    $rec = $exp + (float)$v->arrears_amount;
                    $bal = (float)$v->balance_amount;
                    $cBilled += $exp;
                    $cOutstanding += $bal;
                    $cCollected += max(0.00, $rec - $bal);
                }

                $cIncome = (float) ExtraIncome::where('campus_id', $c->id)
                    ->when($startDate && $endDate, fn($q) => $q->whereBetween('date', [$startDate, $endDate]))
                    ->sum('amount');

                $cExpense = (float) Expense::where('campus_id', $c->id)
                    ->when($startDate && $endDate, fn($q) => $q->whereBetween('expense_date', [$startDate, $endDate]))
                    ->sum('amount');

                $enrolledStudents = Student::where('campus_id', $c->id)->where('status', 'Enrolled')->count();

                return [
                    'campus_id'         => $c->id,
                    'campus_name'       => $c->name,
                    'campus_code'       => $c->code,
                    'total_billed_fee'  => round($cBilled, 2),
                    'total_collected'   => round($cCollected, 2),
                    'total_outstanding' => round($cOutstanding, 2),
                    'extra_income'      => round($cIncome, 2),
                    'extra_expense'     => round($cExpense, 2),
                    'net_revenue'       => round(($cCollected + $cIncome) - $cExpense, 2),
                    'enrolled_students' => $enrolledStudents,
                ];
            });

            return $this->sendResponse([
                'financial_summary' => [
                    'total_billed_fee'      => round($totalBilledFee, 2),
                    'total_arrears_fee'     => round($totalArrearsFee, 2),
                    'total_collected_fee'   => round($totalCollectedFee, 2),
                    'total_outstanding_fee' => round($totalOutstanding, 2),
                    'total_extra_income'    => round($totalExtraIncome, 2),
                    'total_extra_expense'   => round($totalExtraExpense, 2),
                    'total_revenue'         => round($totalRevenue, 2),
                    'net_cashflow'          => round($netCashflow, 2),
                    'currency'              => 'PKR',
                ],
                'voucher_stats' => [
                    'total'           => (int)($voucherStats->total ?? 0),
                    'paid'            => (int)($voucherStats->paid ?? 0),
                    'partial'         => (int)($voucherStats->partial ?? 0),
                    'unpaid'          => (int)($voucherStats->unpaid ?? 0),
                    'carried_forward' => (int)($voucherStats->carried_forward ?? 0),
                    'overdue'         => (int)($voucherStats->overdue ?? 0),
                ],
                'student_stats' => [
                    'total'                  => (int) $studentCounts->sum(),
                    'enrolled'               => (int) ($studentCounts->get('Enrolled', 0)),
                    'pending'                => (int) ($studentCounts->get('Pending', 0)),
                    'promoted'               => (int) ($studentCounts->get('Promoted', 0)),
                    'transferred'            => (int) ($studentCounts->get('Transferred', 0)),
                    'passed_out'             => (int) ($studentCounts->get('Passed Out', 0)),
                    'struck_off'             => (int) ($studentCounts->get('Struck Off', 0)),
                    'new_admissions_in_period' => (int) $newAdmissionsCount,
                    'gender_breakdown'       => $genderBreakdown,
                ],
                'campus_breakdown' => $campuses,
                'filters' => [
                    'campus_id'      => $campusId,
                    'start_date'     => $startDate,
                    'end_date'       => $endDate,
                    'month'          => $month,
                    'intake_session' => $intakeSession,
                    'batch_id'       => $batchId,
                ],
                'timestamp' => now()->toIso8601String(),
            ], 'External system statistics retrieved successfully.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to fetch external stats.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Compact amounts endpoint focused purely on financial balances.
     */
    public function amounts(Request $request)
    {
        try {
            $campusId  = $request->input('campus_id');
            $startDate = $request->input('start_date');
            $endDate   = $request->input('end_date');
            $month     = $request->input('month');

            if ($month && preg_match('/^\d{4}-\d{2}$/', $month)) {
                $startDate = Carbon::parse($month . '-01')->startOfMonth()->toDateString();
                $endDate   = Carbon::parse($month . '-01')->endOfMonth()->toDateString();
            }

            $vouchersQuery = GeneratedVoucher::where('status', '!=', 'carried_forward');

            if ($campusId) {
                $vouchersQuery->where('campus_id', $campusId);
            }
            if ($startDate && $endDate) {
                $vouchersQuery->whereBetween('due_date', [$startDate, $endDate]);
            }

            $vouchers = $vouchersQuery->get();

            $totalBilledFee    = 0.00;
            $totalOutstanding  = 0.00;
            $totalCollectedFee = 0.00;

            foreach ($vouchers as $v) {
                $exp = (float)$v->amount + (float)$v->fine_amount - (float)$v->discount_amount;
                $rec = $exp + (float)$v->arrears_amount;
                $bal = (float)$v->balance_amount;

                $totalBilledFee    += $exp;
                $totalOutstanding  += $bal;
                $totalCollectedFee += max(0.00, $rec - $bal);
            }

            $incomeQuery = ExtraIncome::query();
            $expenseQuery = Expense::query();

            if ($campusId) {
                $incomeQuery->where('campus_id', $campusId);
                $expenseQuery->where('campus_id', $campusId);
            }
            if ($startDate && $endDate) {
                $incomeQuery->whereBetween('date', [$startDate, $endDate]);
                $expenseQuery->whereBetween('expense_date', [$startDate, $endDate]);
            }

            $totalExtraIncome  = (float) $incomeQuery->sum('amount');
            $totalExtraExpense = (float) $expenseQuery->sum('amount');
            $totalRevenue      = $totalCollectedFee + $totalExtraIncome;
            $netCashflow       = $totalRevenue - $totalExtraExpense;

            return $this->sendResponse([
                'billed_fee'      => round($totalBilledFee, 2),
                'collected_fee'   => round($totalCollectedFee, 2),
                'outstanding_fee' => round($totalOutstanding, 2),
                'extra_income'    => round($totalExtraIncome, 2),
                'extra_expense'   => round($totalExtraExpense, 2),
                'total_revenue'   => round($totalRevenue, 2),
                'net_cashflow'    => round($netCashflow, 2),
                'currency'        => 'PKR',
                'timestamp'       => now()->toIso8601String(),
            ], 'External amounts retrieved successfully.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to fetch external amounts.', ['error' => $e->getMessage()], 500);
        }
    }
}
