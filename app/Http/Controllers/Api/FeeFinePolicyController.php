<?php

namespace App\Http\Controllers\Api;

use App\Models\FeeFinePolicy;

class FeeFinePolicyController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $policies = FeeFinePolicy::with('feeHead')->get();
        return $this->sendResponse($policies, 'Fee fine policies retrieved successfully.');
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
