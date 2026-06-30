<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\IncomeCategory;
use App\Http\Requests\Api\ExtraIncome\StoreIncomeCategoryRequest;
use Illuminate\Http\Request;

class IncomeCategoryController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_income_categories', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_income_categories', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_income_categories', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_income_categories', only: ['destroy', 'bulkDelete']),
        ];
    }

    public function index()
    {
        $categories = IncomeCategory::latest()->get();
        return $this->sendResponse($categories, 'Income Categories retrieved successfully.');
    }

    public function store(StoreIncomeCategoryRequest $request)
    {
        $category = IncomeCategory::create($request->validated());
        return $this->sendResponse($category, 'Income Category created successfully.', 201);
    }

    public function show(IncomeCategory $incomeCategory)
    {
        return $this->sendResponse($incomeCategory, 'Income Category retrieved successfully.');
    }

    public function update(StoreIncomeCategoryRequest $request, IncomeCategory $incomeCategory)
    {
        $incomeCategory->update($request->validated());
        return $this->sendResponse($incomeCategory, 'Income Category updated successfully.');
    }

    public function destroy(IncomeCategory $incomeCategory)
    {
        $incomeCategory->delete();
        return $this->sendResponse([], 'Income Category deleted successfully.');
    }
}
