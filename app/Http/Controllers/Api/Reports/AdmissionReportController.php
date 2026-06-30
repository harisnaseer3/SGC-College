<?php

namespace App\Http\Controllers\Api\Reports;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Http\Controllers\Api\BaseController;
use App\Models\Student;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AdmissionReportController extends \App\Http\Controllers\Api\BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_admission_reports', only: ['byDate']),
        ];
    }

    /**
     * Get admission list filtered by date range.
     */
    public function byDate(Request $request)
    {
        try {
            $startDate = $request->input('start_date');
            $endDate   = $request->input('end_date');
            
            // The HasCampusScope global scope already filters by X-Campus-ID header.
            $campusId = $request->input('campus_id');

            $query = Student::with(['program:id,name', 'campus:id,name', 'academicBatch:id,name']);

            if ($startDate && $endDate) {
                $query->whereBetween('admission_date', [
                    Carbon::parse($startDate)->startOf('day')->toDateString(),
                    Carbon::parse($endDate)->endOf('day')->toDateString()
                ]);
            }

            if ($campusId && !$request->hasHeader('X-Campus-ID')) {
                $query->where('campus_id', $campusId);
            }

            $students = $query->orderBy('admission_date', 'desc')->get();

            return $this->sendResponse([
                'students' => $students,
                'count'    => $students->count(),
                'filters'  => [
                    'start_date' => $startDate,
                    'end_date'   => $endDate,
                    'campus_id'  => $campusId
                ]
            ], 'Admission by date report generated.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate report.', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
        }
    }
}
