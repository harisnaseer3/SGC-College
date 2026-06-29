<?php

namespace App\Http\Controllers\Api;

use App\Models\IncomeCategory;
use App\Http\Requests\Api\ExtraIncome\StoreIncomeCategoryRequest;
use Illuminate\Http\Request;

class IncomeCategoryController extends BaseController
{
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
