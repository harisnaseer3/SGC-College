<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\Student;
use App\Models\User;
use App\Models\Campus;
use App\Models\Program;
use App\Models\StudentFee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_stats|view_dashboard|view_admissions', only: ['stats']),
        ];
    }

    public function stats()
    {
        try {
            // --- Core counts ---
            $totalStudents  = Student::count();
            $enrolledCount  = Student::where('status', 'Enrolled')->count();
            $pendingCount   = Student::where('status', 'Pending')->count();
            $totalUsers     = User::count();
            $totalCampuses  = Campus::count();
            $totalPrograms  = Program::count();

            // --- Voucher counts (filtered by month) ---
            $voucherMonth = request('voucher_month', now()->format('Y-m'));
            
            $stats = \App\Models\GeneratedVoucher::query()
                ->when($voucherMonth, fn($q) => $q->where('due_date', 'like', $voucherMonth . '%'))
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('SUM(CASE WHEN status = "paid" THEN 1 ELSE 0 END) as paid')
                ->selectRaw('SUM(CASE WHEN status = "partial" THEN 1 ELSE 0 END) as partial')
                ->selectRaw('SUM(CASE WHEN status = "unpaid" THEN 1 ELSE 0 END) as unpaid')
                ->selectRaw('SUM(CASE WHEN status = "carried_forward" THEN 1 ELSE 0 END) as carried_forward')
                ->selectRaw('SUM(CASE WHEN status != "paid" AND status != "carried_forward" AND due_date < ? THEN 1 ELSE 0 END) as overdue', [now()->startOfDay()])
                ->first();

            $totalVouchers   = (int) ($stats->total ?? 0);
            $paidVouchers    = (int) ($stats->paid ?? 0);
            $partialVouchers = (int) ($stats->partial ?? 0);
            $unpaidVouchers  = (int) ($stats->unpaid ?? 0);
            $carriedForwardVouchers = (int) ($stats->carried_forward ?? 0);
            $overdueVouchers = (int) ($stats->overdue ?? 0);

            // --- Gender breakdown ---
            $genderBreakdown = Student::select('gender', DB::raw('count(*) as total'))
                ->whereNotNull('gender')
                ->groupBy('gender')
                ->pluck('total', 'gender');

            // --- Intake session breakdown ---
            $intakeBreakdown = Student::select('intake_session', DB::raw('count(*) as total'))
                ->whereNotNull('intake_session')
                ->groupBy('intake_session')
                ->pluck('total', 'intake_session');

            // --- Students per program (top 6) ---
            $studentsByProgram = Student::select('program_id', DB::raw('count(*) as total'))
                ->with('program:id,name')
                ->whereNotNull('program_id')
                ->groupBy('program_id')
                ->orderByDesc('total')
                ->limit(6)
                ->get()
                ->map(fn($s) => [
                    'name'  => $s->program->name ?? 'Unknown',
                    'total' => $s->total,
                ]);

            // --- Recent admissions (last 8) ---
            $recentAdmissions = Student::with(['program:id,name', 'campus:id,name', 'academicBatch:id,name'])
                ->latest()
                ->limit(8)
                ->get(['id', 'first_name', 'last_name', 'admission_number', 'program_id', 'campus_id', 'academic_batch_id', 'intake_session', 'status', 'student_picture', 'created_at']);

            // --- Monthly admissions for current year ---
            $monthlyAdmissions = Student::select(
                    DB::raw('MONTH(created_at) as month'),
                    DB::raw('COUNT(*) as total')
                )
                ->whereYear('created_at', now()->year)
                ->groupBy(DB::raw('MONTH(created_at)'))
                ->orderBy('month')
                ->get()
                ->keyBy('month')
                ->map(fn($r) => $r->total);

            $months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            $monthlyData = collect(range(1, 12))->map(fn($m) => [
                'month' => $months[$m - 1],
                'total' => $monthlyAdmissions->get($m, 0),
            ]);

            // --- Status breakdown ---
            $statusBreakdown = Student::select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status');

            // --- Monthly & Semester-wise Fee Analytics with Unique Calculation ---
            $intakeSession = request('fee_intake_session');
            $batchId = request('fee_batch_id');

            // Exclude carried_forward vouchers to prevent double-counting of rolled-over dues
            $vouchersQuery = \App\Models\GeneratedVoucher::where('status', '!=', 'carried_forward');
            
            if ($intakeSession || $batchId) {
                $vouchersQuery->whereHas('student', function ($query) use ($intakeSession, $batchId) {
                    if ($intakeSession) {
                        $query->where('intake_session', $intakeSession);
                    }
                    if ($batchId) {
                        $query->where('academic_batch_id', $batchId);
                    }
                });
            }

            $minDate = (clone $vouchersQuery)->min('due_date');
            $maxDate = (clone $vouchersQuery)->max('due_date');
            
            $monthlyFeeAnalytics = collect();
            if ($minDate && $maxDate) {
                $start = \Carbon\Carbon::parse($minDate)->startOfMonth();
                $end = \Carbon\Carbon::parse($maxDate)->startOfMonth();
                // Ensure at least the current month is shown if start/end are the same
                if ($end->lt(now()->startOfMonth())) {
                    $end = now()->startOfMonth();
                }
                
                $allVouchers = (clone $vouchersQuery)->get();
                $vouchersByMonth = $allVouchers->groupBy(function($v) {
                    return \Carbon\Carbon::parse($v->due_date)->format('M Y');
                });

                while ($start->lte($end)) {
                    $monthName = $start->format('M Y');
                    $monthVouchers = $vouchersByMonth->get($monthName, collect());

                    $totalExpected = 0.00;
                    $totalArrears = 0.00;
                    $totalReceived = 0.00;
                    $totalBalance = 0.00;

                    foreach ($monthVouchers as $v) {
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

                    $monthlyFeeAnalytics->push([
                        'name'        => $monthName,
                        'current_fee' => $totalExpected,
                        'arrears'     => $totalArrears,
                        'receivable'  => $totalExpected + $totalArrears,
                        'received'    => $totalReceived,
                        'pending'     => $totalBalance,
                    ]);

                    $start->addMonth();
                }
            }

            $vouchersWithSemester = (clone $vouchersQuery)->whereNotNull('semester_number')->get();
            $semesterFeesData = $vouchersWithSemester->groupBy('semester_number')
                ->sortBy(fn($v, $key) => (int)$key)
                ->map(function($semVouchers, $semNumber) {
                    $totalExpected = 0.00;
                    $totalArrears = 0.00;
                    $totalReceived = 0.00;
                    $totalBalance = 0.00;

                    foreach ($semVouchers as $v) {
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

                    return [
                        'name'        => 'Semester ' . $semNumber,
                        'current_fee' => $totalExpected,
                        'arrears'     => $totalArrears,
                        'receivable'  => $totalExpected + $totalArrears,
                        'received'    => $totalReceived,
                        'pending'     => $totalBalance,
                    ];
                })->values();

            $academicBatches = \App\Models\AcademicBatch::select('id', 'name')->orderBy('name', 'desc')->get();

            return $this->sendResponse([
                'counts' => [
                    'students'  => $totalStudents,
                    'enrolled'  => $enrolledCount,
                    'pending'   => $pendingCount,
                    'promoted'  => $statusBreakdown->get('Promoted', 0),
                    'transferred' => $statusBreakdown->get('Transferred', 0),
                    'passed_out' => $statusBreakdown->get('Passed Out', 0),
                    'struck_off' => $statusBreakdown->get('Struck Off', 0),
                    'users'     => $totalUsers,
                    'campuses'  => $totalCampuses,
                    'programs'  => $totalPrograms,
                    'vouchers_total'   => $totalVouchers,
                    'vouchers_paid'    => $paidVouchers,
                    'vouchers_unpaid'  => $unpaidVouchers,
                    'vouchers_carried_forward' => $carriedForwardVouchers,
                    'vouchers_overdue' => $overdueVouchers,
                ],
                'status_breakdown'    => $statusBreakdown,
                'debug' => [
                    'unscoped_students' => Student::withoutGlobalScopes()->count(),
                    'campus_id_header' => request()->header('X-Campus-ID'),
                    'user_id' => auth()->id(),
                    'user_roles' => auth()->user()?->getRoleNames(),
                ],
                'academic_batches'    => $academicBatches,
                'gender_breakdown'    => $genderBreakdown,
                'intake_breakdown'    => $intakeBreakdown,
                'students_by_program' => $studentsByProgram,
                'recent_admissions'   => $recentAdmissions,
                'monthly_admissions'  => $monthlyData,
                'fee_analytics'       => [
                    'monthly'  => $monthlyFeeAnalytics,
                    'semester' => $semesterFeesData,
                ]
            ], 'Dashboard stats retrieved.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to load dashboard stats.', ['error' => $e->getMessage()], 500);
        }
    }
}
