<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExpenseController extends BaseController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_expenses', only: ['index', 'show']),
            new Middleware('permission:create_expenses', only: ['store']),
            new Middleware('permission:edit_expenses', only: ['update']),
            new Middleware('permission:delete_expenses', only: ['destroy']),
            new Middleware('permission:change_expense_status', only: ['updateStatus']),
        ];
    }

    public function index(Request $request)
    {
        $query = Expense::with(['category', 'recorder', 'organization', 'campus'])->latest('expense_date');

        if ($request->has('category_id') && $request->category_id) {
            $query->where('expense_category_id', $request->category_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('expense_date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('expense_date', '<=', $request->end_date);
        }

        $total = (clone $query)->sum('amount');
        $expenses = $query->latest()->paginate(10);
        
        return response()->json([
            'success' => true,
            'message' => 'Expenses retrieved successfully.',
            'data' => $expenses,
            'total_amount' => $total
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount'              => 'required|numeric|min:0.01',
            'quantity'            => 'nullable|string|max:100',
            'supplier'            => 'nullable|string|max:255',
            'expense_date'        => 'required|date',
            'title'               => 'required|string|max:255',
            'description'         => 'nullable|string',
            'attachment'          => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120'
        ]);

        $validated['recorded_by'] = auth()->id();
        $validated['status'] = 'pending';

        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('expenses', 'public');
            $validated['attachment_url'] = Storage::url($path);
        }

        $expense = Expense::create($validated);
        $expense->load(['category', 'recorder']);

        return $this->sendResponse($expense, 'Expense recorded successfully.', 201);
    }

    public function show(Expense $expense)
    {
        $expense->load(['category', 'recorder', 'organization', 'campus']);
        return $this->sendResponse($expense, 'Expense retrieved successfully.');
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount'              => 'required|numeric|min:0.01',
            'quantity'            => 'nullable|string|max:100',
            'supplier'            => 'nullable|string|max:255',
            'expense_date'        => 'required|date',
            'title'               => 'required|string|max:255',
            'description'         => 'nullable|string',
            'attachment'          => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120'
        ]);

        if ($request->hasFile('attachment')) {
            if ($expense->attachment_url) {
                $oldPath = str_replace('/storage/', '', $expense->attachment_url);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('attachment')->store('expenses', 'public');
            $validated['attachment_url'] = Storage::url($path);
        }

        $expense->update($validated);
        $expense->load(['category', 'recorder']);

        return $this->sendResponse($expense, 'Expense updated successfully.');
    }

    public function updateStatus(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,in_progress,reimbursed'
        ]);

        $expense->update(['status' => $validated['status']]);
        return $this->sendResponse($expense, 'Expense status updated successfully.');
    }

    public function destroy(Expense $expense)
    {
        if ($expense->attachment_url) {
            $oldPath = str_replace('/storage/', '', $expense->attachment_url);
            Storage::disk('public')->delete($oldPath);
        }
        
        $expense->delete();
        return $this->sendResponse([], 'Expense deleted successfully.');
    }
}
