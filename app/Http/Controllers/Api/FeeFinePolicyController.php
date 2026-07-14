<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\FeeFinePolicy;

class FeeFinePolicyController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_fee_fine_policies', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_fee_fine_policies', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_fee_fine_policies', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_fee_fine_policies', only: ['destroy', 'bulkDelete']),
        ];
    }


    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $policies = FeeFinePolicy::with('feeHead')->paginate(request('per_page', 10));
        return $this->sendResponse($policies, 'Fine policies retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(\App\Http\Requests\Api\Fees\StoreFeeFinePolicyRequest $request)
    {
        try {
            $policy = FeeFinePolicy::create($request->validated());
            return $this->sendResponse($policy->load('feeHead'), 'Fee fine policy created successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(FeeFinePolicy $feeFinePolicy)
    {
        return $this->sendResponse($feeFinePolicy->load('feeHead'), 'Fee fine policy retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(\App\Http\Requests\Api\Fees\UpdateFeeFinePolicyRequest $request, FeeFinePolicy $feeFinePolicy)
    {
        try {
            $feeFinePolicy->update($request->validated());
            return $this->sendResponse($feeFinePolicy->load('feeHead'), 'Fee fine policy updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FeeFinePolicy $feeFinePolicy)
    {
        try {
            $feeFinePolicy->delete();
            return $this->sendResponse([], 'Fee fine policy deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }
}
