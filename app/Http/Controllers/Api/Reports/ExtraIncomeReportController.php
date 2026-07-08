<?php

namespace App\Http\Controllers\Api\Reports;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Http\Controllers\Api\BaseController;
use App\Models\ExtraIncome;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ExtraIncomeReportController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_extra_incomes', only: ['byDate']),
        ];
    }

    /**
     * Get extra income list filtered by date range.
     */
    public function byDate(Request $request)
    {
        try {
            $startDate = $request->input('start_date');
            $endDate   = $request->input('end_date');
            $campusId = $request->input('campus_id');

            $query = ExtraIncome::with(['incomeCategory', 'program', 'collectedBy']);

            if ($startDate && $endDate) {
                $query->whereBetween('date', [
                    Carbon::parse($startDate)->startOf('day')->toDateString(),
                    Carbon::parse($endDate)->endOf('day')->toDateString()
                ]);
            }

            if ($campusId && !$request->hasHeader('X-Campus-ID')) {
                $query->where('campus_id', $campusId);
            }

            $incomes = $query->orderBy('date', 'desc')->get();
            $totalAmount = $incomes->sum('amount');

            return $this->sendResponse([
                'incomes' => $incomes,
                'count'    => $incomes->count(),
                'total'    => $totalAmount,
                'filters'  => [
                    'start_date' => $startDate,
                    'end_date'   => $endDate,
                    'campus_id'  => $campusId
                ]
            ], 'Extra Income by date report generated.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate report.', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
        }
    }
}
