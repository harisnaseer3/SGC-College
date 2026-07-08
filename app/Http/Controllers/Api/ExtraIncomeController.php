<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\ExtraIncome;
use App\Http\Requests\Api\ExtraIncome\StoreExtraIncomeRequest;
use Illuminate\Http\Request;

class ExtraIncomeController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_extra_incomes', only: ['index', 'show']),
            new Middleware('permission:create_extra_incomes', only: ['store']),
            new Middleware('permission:edit_extra_incomes', only: ['update']),
            new Middleware('permission:delete_extra_incomes', only: ['destroy']),
        ];
    }

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
        
        $year = date('y');
        $program = \App\Models\Program::find($data['program_id']);
        $programStr = $program ? $program->name : 'PROG';
        $programStr = strtoupper(str_replace(' ', '', $programStr));
        
        // Find max number for this year and program
        $latest = ExtraIncome::where('program_id', $data['program_id'])
            ->whereYear('created_at', date('Y'))
            ->orderBy('id', 'desc')
            ->first();
            
        $nextNumber = 1;
        if ($latest && $latest->form_number) {
            $parts = explode('-', $latest->form_number);
            if (count($parts) >= 2 && is_numeric($parts[1])) {
                $nextNumber = intval($parts[1]) + 1;
            } else {
                $nextNumber = ExtraIncome::where('program_id', $data['program_id'])->whereYear('created_at', date('Y'))->count() + 1;
            }
        }
        
        $data['form_number'] = $year . '-' . str_pad($nextNumber, 2, '0', STR_PAD_LEFT) . '-' . $programStr;
        
        $extraIncome = ExtraIncome::create($data);
        $extraIncome->load(['incomeCategory', 'collectedBy']);
        
        return $this->sendResponse($extraIncome, 'Extra Income recorded successfully.', 201);
    }

    public function show(ExtraIncome $extraIncome)
    {
        $extraIncome->load(['incomeCategory', 'collectedBy', 'organization', 'campus']);
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
