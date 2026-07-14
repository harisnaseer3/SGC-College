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
            new Middleware('permission:view_stats', only: ['stats']),
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
            
            $voucherQuery = StudentFee::query();
            if ($voucherMonth) {
                $voucherQuery->where('due_date', 'like', $voucherMonth . '%');
            }

            $totalVouchers   = (clone $voucherQuery)->count();
            $paidVouchers    = (clone $voucherQuery)->where('status', 'paid')->count();
            $unpaidVouchers  = (clone $voucherQuery)->where('status', 'unpaid')->count();
            $partialVouchers = (clone $voucherQuery)->where('status', 'partial')->count();
            $overdueVouchers = (clone $voucherQuery)->whereIn('status', ['unpaid', 'partial'])
                                         ->where('due_date', '<', now()->startOfDay())
                                         ->count();

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

            // --- Monthly Fee Analytics (Current Year) ---
            $monthlyFeesData = StudentFee::select(
                    DB::raw('MONTH(due_date) as month'),
                    DB::raw('SUM(COALESCE(amount, 0) + COALESCE(fine_amount, 0) - COALESCE(discount_amount, 0)) as expected'),
                    DB::raw('SUM(COALESCE(paid_amount, 0)) as collected')
                )
                ->whereYear('due_date', now()->year)
                ->groupBy(DB::raw('MONTH(due_date)'))
                ->orderBy('month')
                ->get()
                ->keyBy('month');

            $monthlyFeeAnalytics = collect(range(1, 12))->map(function($m) use ($months, $monthlyFeesData) {
                $receivable = (float) ($monthlyFeesData->get($m)->expected ?? 0);
                $received   = (float) ($monthlyFeesData->get($m)->collected ?? 0);
                return [
                    'name'       => $months[$m - 1],
                    'receivable' => $receivable,
                    'received'   => $received,
                    'pending'    => max(0, $receivable - $received),
                ];
            });

            // --- Semester-wise Fee Analytics ---
            $semesterFeesData = StudentFee::select(
                    'semester_number',
                    DB::raw('SUM(COALESCE(amount, 0) + COALESCE(fine_amount, 0) - COALESCE(discount_amount, 0)) as expected'),
                    DB::raw('SUM(COALESCE(paid_amount, 0)) as collected')
                )
                ->whereNotNull('semester_number')
                ->groupBy('semester_number')
                ->orderBy('semester_number')
                ->get()
                ->map(function($row) {
                    $receivable = (float) ($row->expected ?? 0);
                    $received   = (float) ($row->collected ?? 0);
                    return [
                        'name'       => 'Semester ' . $row->semester_number,
                        'receivable' => $receivable,
                        'received'   => $received,
                        'pending'    => max(0, $receivable - $received),
                    ];
                })->values();

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
                    'vouchers_partial' => $partialVouchers,
                    'vouchers_overdue' => $overdueVouchers,
                ],
                'status_breakdown'    => $statusBreakdown,
                'debug' => [
                    'unscoped_students' => Student::withoutGlobalScopes()->count(),
                    'campus_id_header' => request()->header('X-Campus-ID'),
                    'user_id' => auth()->id(),
                    'user_roles' => auth()->user()?->getRoleNames(),
                ],
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
