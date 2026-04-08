<?php

namespace App\Http\Controllers\Api;

use App\Models\FeeHead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FeeHeadController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $heads = FeeHead::all();
        return $this->sendResponse($heads, 'Fee heads retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'frequency' => 'required|in:one_time,monthly,semester',
            'frequency_name' => 'nullable|string|max:255',
            'priority' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors()->toArray(), 422);
        }

        $head = FeeHead::create($request->all());

        return $this->sendResponse($head, 'Fee head created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(FeeHead $feeHead)
    {
        return $this->sendResponse($feeHead, 'Fee head retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, FeeHead $feeHead)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'frequency' => 'required|in:one_time,monthly,semester',
            'frequency_name' => 'nullable|string|max:255',
            'priority' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors()->toArray(), 422);
        }

        $feeHead->update($request->all());

        return $this->sendResponse($feeHead, 'Fee head updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FeeHead $feeHead)
    {
        $feeHead->delete();
        return $this->sendResponse([], 'Fee head deleted successfully.');
    }
}
