<?php

namespace App\Http\Controllers\Api;

use App\Models\ExtraIncome;
use App\Http\Requests\Api\ExtraIncome\StoreExtraIncomeRequest;
use Illuminate\Http\Request;

class ExtraIncomeController extends BaseController
{
    public function index(Request $request)
    {
        $query = ExtraIncome::with(['incomeCategory', 'collectedBy'])->latest();
        
        if ($request->has('category_id')) {
            $query->where('income_category_id', $request->category_id);
        }
        
        $incomes = $query->get();
        
        return $this->sendResponse($incomes, 'Extra Incomes retrieved successfully.');
    }

    public function store(StoreExtraIncomeRequest $request)
    {
        $data = $request->validated();
        $data['collected_by'] = auth()->id();
        
        $extraIncome = ExtraIncome::create($data);
        $extraIncome->load(['incomeCategory', 'collectedBy']);
        
        return $this->sendResponse($extraIncome, 'Extra Income recorded successfully.', 201);
    }

    public function show(ExtraIncome $extraIncome)
    {
        $extraIncome->load(['incomeCategory', 'collectedBy']);
        return $this->sendResponse($extraIncome, 'Extra Income retrieved successfully.');
    }

    public function update(StoreExtraIncomeRequest $request, ExtraIncome $extraIncome)
    {
        $extraIncome->update($request->validated());
        $extraIncome->load(['incomeCategory', 'collectedBy']);
        return $this->sendResponse($extraIncome, 'Extra Income updated successfully.');
    }

    public function destroy(ExtraIncome $extraIncome)
    {
        $extraIncome->delete();
        return $this->sendResponse([], 'Extra Income deleted successfully.');
    }
}
