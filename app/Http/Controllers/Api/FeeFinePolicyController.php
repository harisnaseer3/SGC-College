<?php

namespace App\Http\Controllers\Api;

use App\Models\FeeFinePolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

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
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fee_head_id' => 'required|exists:fee_heads,id',
            'grace_days' => 'required|integer|min:0',
            'fine_amount' => 'required|numeric|min:0',
            'fine_type' => 'required|in:fixed,percentage',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $policy = FeeFinePolicy::create($request->all());

        return $this->sendResponse($policy->load('feeHead'), 'Fee fine policy created successfully.');
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
    public function update(Request $request, FeeFinePolicy $feeFinePolicy)
    {
        $validator = Validator::make($request->all(), [
            'fee_head_id' => 'required|exists:fee_heads,id',
            'grace_days' => 'required|integer|min:0',
            'fine_amount' => 'required|numeric|min:0',
            'fine_type' => 'required|in:fixed,percentage',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $feeFinePolicy->update($request->all());

        return $this->sendResponse($feeFinePolicy->load('feeHead'), 'Fee fine policy updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FeeFinePolicy $feeFinePolicy)
    {
        $feeFinePolicy->delete();
        return $this->sendResponse([], 'Fee fine policy deleted successfully.');
    }
}
