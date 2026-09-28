<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class RecycleBinController extends BaseController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:manage_recycle_bin'),
        ];
    }

    protected $modules = [
        'users' => \App\Models\User::class,
        'campuses' => \App\Models\Campus::class,
        'organizations' => \App\Models\Organization::class,
        'programs' => \App\Models\Program::class,
        'program_semesters' => \App\Models\ProgramSemester::class,
        'courses' => \App\Models\Course::class,
        'academic_batches' => \App\Models\AcademicBatch::class,
        'academic_classes' => \App\Models\AcademicClass::class,
        'sections' => \App\Models\Section::class,
        'fee_heads' => \App\Models\FeeHead::class,
        'fee_structures' => \App\Models\FeeStructure::class,
        'fee_structure_items' => \App\Models\FeeStructureItem::class,
        'fee_fine_policies' => \App\Models\FeeFinePolicy::class,
        'student_fees' => \App\Models\StudentFee::class,
        'generated_vouchers' => \App\Models\GeneratedVoucher::class,
        'fee_payments' => \App\Models\FeePayment::class,
        'suspense_entries' => \App\Models\SuspenseEntry::class,
        'income_categories' => \App\Models\IncomeCategory::class,
        'extra_incomes' => \App\Models\ExtraIncome::class,
        'expense_categories' => \App\Models\ExpenseCategory::class,
        'expenses' => \App\Models\Expense::class,
        'campus_bank_accounts' => \App\Models\CampusBankAccount::class,
        'students' => \App\Models\Student::class,
    ];

    /**
     * Retrieve all soft-deleted records for a supported module.
     */
    public function index(Request $request)
    {
        $module = $request->input('module', 'all');

        if ($module !== 'all' && !array_key_exists($module, $this->modules)) {
            return $this->sendError('Invalid module specified.', [], 400);
        }

        try {
            if ($module === 'all') {
                $queries = null;
                foreach ($this->modules as $modName => $modClass) {
                    $table = (new $modClass)->getTable();
                    $q = DB::table($table)
                        ->select('id', 'deleted_at', DB::raw("'$modName' as module_name"))
                        ->whereNotNull('deleted_at');
                    
                    if ($request->filled('search')) {
                        $search = $request->input('search');
                        $searchable = ['name', 'title', 'description', 'first_name', 'last_name', 'voucher_number', 'reference_number', 'email', 'admission_number'];
                        $actualColumns = Schema::getColumnListing($table);
                        $columnsToSearch = array_intersect($searchable, $actualColumns);

                        if (count($columnsToSearch) > 0) {
                            $q->where(function($sub) use ($search, $columnsToSearch) {
                                $first = true;
                                foreach ($columnsToSearch as $col) {
                                    if ($first) { $sub->where($col, 'like', "%{$search}%"); $first = false; }
                                    else { $sub->orWhere($col, 'like', "%{$search}%"); }
                                }
                            });
                        } else {
                            $q->whereRaw('1 = 0');
                        }
                    }

                    if (!$queries) {
                        $queries = $q;
                    } else {
                        $queries->unionAll($q);
                    }
                }

                $paginated = DB::table(DB::raw("({$queries->toSql()}) as combined_table"))
                    ->mergeBindings($queries)
                    ->orderBy('deleted_at', 'desc')
                    ->paginate($request->input('per_page', 10));

                $grouped = [];
                foreach ($paginated->items() as $item) {
                    $grouped[$item->module_name][] = $item->id;
                }
                
                $loadedRecords = [];
                foreach ($grouped as $modName => $ids) {
                    $modClass = $this->modules[$modName];
                    $models = $modClass::onlyTrashed()->whereIn('id', $ids)->get()->keyBy('id');
                    foreach ($models as $id => $m) {
                        $m->module_name = $modName; 
                        $loadedRecords["$modName-$id"] = $m;
                    }
                }

                $finalItems = collect($paginated->items())->map(function($item) use ($loadedRecords) {
                    return $loadedRecords["{$item->module_name}-{$item->id}"] ?? null;
                })->filter()->values();

                $paginated->setCollection($finalItems);

                return $this->sendResponse($paginated, 'All recycle bin records retrieved.');
            }

            // Single module branch
            $modelClass = $this->modules[$module];
            $query = $modelClass::onlyTrashed()->latest('deleted_at');

            // Generic search
            if ($request->filled('search')) {
                $search = $request->input('search');
                $table = (new $modelClass)->getTable();
                
                $searchable = ['name', 'title', 'description', 'first_name', 'last_name', 'voucher_number', 'reference_number', 'email', 'admission_number'];
                $actualColumns = Schema::getColumnListing($table);
                $columnsToSearch = array_intersect($searchable, $actualColumns);

                if (count($columnsToSearch) > 0) {
                    $query->where(function($q) use ($search, $columnsToSearch) {
                        $first = true;
                        foreach ($columnsToSearch as $col) {
                            if ($first) {
                                $q->where($col, 'like', "%{$search}%");
                                $first = false;
                            } else {
                                $q->orWhere($col, 'like', "%{$search}%");
                            }
                        }
                    });
                }
            }

            $records = $query->paginate($request->input('per_page', 10));
            $records->getCollection()->transform(function($record) use ($module) {
                $record->module_name = $module;
                return $record;
            });

            return $this->sendResponse($records, ucfirst(str_replace('_', ' ', $module)) . ' recycle bin retrieved.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve recycle bin.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Restore a specific soft-deleted record.
     */
    public function restore(Request $request)
    {
        $request->validate([
            'module' => 'required|string',
            'id' => 'required|integer'
        ]);

        $module = $request->input('module');
        if (!array_key_exists($module, $this->modules)) {
            return $this->sendError('Invalid module specified.', [], 400);
        }

        $modelClass = $this->modules[$module];

        try {
            $record = $modelClass::onlyTrashed()->findOrFail($request->input('id'));
            $record->restore();

            return $this->sendResponse([], 'Record restored successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to restore record.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Permanently delete a specific soft-deleted record.
     */
    public function forceDelete(Request $request)
    {
        $request->validate([
            'module' => 'required|string',
            'id' => 'required|integer',
            'pin' => 'required|string'
        ]);

        if ($request->input('pin') !== '42747') {
            return $this->sendError('Invalid Security PIN', ['pin' => 'Incorrect 5-digit PIN entered.'], 422);
        }

        $module = $request->input('module');
        if (!array_key_exists($module, $this->modules)) {
            return $this->sendError('Invalid module specified.', [], 400);
        }

        $modelClass = $this->modules[$module];

        try {
            $record = $modelClass::onlyTrashed()->findOrFail($request->input('id'));
            $record->forceDelete();

            return $this->sendResponse([], 'Record permanently deleted.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to permanently delete record.', ['error' => $e->getMessage()], 500);
        }
    }
}
