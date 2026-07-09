<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Academic\StoreBatchRequest;
use App\Models\AcademicBatch;
use Illuminate\Http\JsonResponse;

class AcademicBatchController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_academic_batches', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_academic_batches', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_academic_batches', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_academic_batches', only: ['destroy', 'bulkDelete']),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
            if ($request->query('all')) {
                $batches = AcademicBatch::with('campus')->latest()->get();
                return $this->sendResponse($batches, 'Academic batches retrieved successfully.');
            }
            $batches = AcademicBatch::with('campus')->latest()->paginate(10);
            return $this->sendResponse($batches, 'Academic batches retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve batches.', ['error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreBatchRequest $request): JsonResponse
    {
        try {
            $batch = AcademicBatch::create($request->validated());
            return $this->sendResponse($batch, 'Academic batch created successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Failed to create batch.', ['error' => $e->getMessage()], 500);
        }
    }

    public function show(AcademicBatch $academicBatch): JsonResponse
    {
        return $this->sendResponse($academicBatch->load('campus'), 'Academic batch retrieved successfully.');
    }

    public function update(StoreBatchRequest $request, AcademicBatch $academicBatch): JsonResponse
    {
        try {
            $academicBatch->update($request->validated());
            return $this->sendResponse($academicBatch, 'Academic batch updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update batch.', ['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(AcademicBatch $academicBatch): JsonResponse
    {
        try {
            $academicBatch->delete();
            return $this->sendResponse(null, 'Academic batch deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete batch.', ['error' => $e->getMessage()], 500);
        }
    }
}
