<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryController extends BaseController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_expense_categories', only: ['index', 'show']),
            new Middleware('permission:create_expense_categories', only: ['store']),
            new Middleware('permission:edit_expense_categories', only: ['update']),
            new Middleware('permission:delete_expense_categories', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        if ($request->query('all')) {
            $categories = ExpenseCategory::latest()->get();
            return $this->sendResponse($categories, 'Expense Categories retrieved successfully.');
        }
        $categories = ExpenseCategory::latest()->paginate(request('per_page', 10));
        return $this->sendResponse($categories, 'Expense Categories retrieved successfully.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string'
        ]);

        $category = ExpenseCategory::create($validated);
        return $this->sendResponse($category, 'Expense category created successfully.', 201);
    }

    public function show(ExpenseCategory $expenseCategory)
    {
        return $this->sendResponse($expenseCategory, 'Expense category retrieved successfully.');
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string'
        ]);

        $expenseCategory->update($validated);
        return $this->sendResponse($expenseCategory, 'Expense category updated successfully.');
    }

    public function destroy(ExpenseCategory $expenseCategory)
    {
        // Prevent deletion if used by expenses
        if (\App\Models\Expense::where('expense_category_id', $expenseCategory->id)->exists()) {
            return $this->sendError('Cannot delete category because it is used by one or more expenses.', [], 400);
        }

        $expenseCategory->delete();
        return $this->sendResponse([], 'Expense category deleted successfully.');
    }
}
