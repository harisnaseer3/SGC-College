<?php

namespace App\Http\Controllers\Api\Reports;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Http\Controllers\Api\BaseController;
use App\Models\Expense;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ExtraExpenseReportController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_expenses', only: ['byDate']),
        ];
    }

    /**
     * Get extra expense list filtered by date range.
     */
    public function byDate(Request $request)
    {
        try {
            $startDate = $request->input('start_date');
            $endDate   = $request->input('end_date');
            $campusId = $request->input('campus_id');

            $query = Expense::with(['category', 'recorder']);

            if ($startDate && $endDate) {
                $query->whereBetween('expense_date', [
                    Carbon::parse($startDate)->startOf('day')->toDateString(),
                    Carbon::parse($endDate)->endOf('day')->toDateString()
                ]);
            }

            if ($campusId && !$request->hasHeader('X-Campus-ID')) {
                $query->where('campus_id', $campusId);
            }

            $expenses = $query->orderBy('expense_date', 'desc')->get();
            $totalAmount = $expenses->sum('amount');

            return $this->sendResponse([
                'expenses' => $expenses,
                'count'    => $expenses->count(),
                'total'    => $totalAmount,
                'filters'  => [
                    'start_date' => $startDate,
                    'end_date'   => $endDate,
                    'campus_id'  => $campusId
                ]
            ], 'Extra Expense by date report generated.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate report.', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
        }
    }
}
