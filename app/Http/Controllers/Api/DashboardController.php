<?php

namespace App\Http\Controllers\Api;

use App\Models\Student;
use App\Models\User;
use App\Models\Campus;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseController
{
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
            ], 'Dashboard stats retrieved.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to load dashboard stats.', ['error' => $e->getMessage()], 500);
        }
    }
}
