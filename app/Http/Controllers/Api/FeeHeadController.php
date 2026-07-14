<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\FeeHead;

class FeeHeadController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_fee_heads', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_fee_heads', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_fee_heads', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_fee_heads', only: ['destroy', 'bulkDelete']),
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $heads = FeeHead::paginate(request('per_page', 10));
        return $this->sendResponse($heads, 'Fee heads retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(\App\Http\Requests\Api\Fees\StoreFeeHeadRequest $request)
    {
        try {
            $head = FeeHead::create($request->validated());
            return $this->sendResponse($head, 'Fee head created successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
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
    public function update(\App\Http\Requests\Api\Fees\UpdateFeeHeadRequest $request, FeeHead $feeHead)
    {
        try {
            $feeHead->update($request->validated());
            return $this->sendResponse($feeHead, 'Fee head updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FeeHead $feeHead)
    {
        try {
            $feeHead->delete();
            return $this->sendResponse([], 'Fee head deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }
}
