<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Academic\StoreBatchRequest;
use App\Models\AcademicBatch;
use Illuminate\Http\JsonResponse;

class AcademicBatchController extends BaseController
{
    public function index(): JsonResponse
    {
        try {
            $batches = AcademicBatch::with('campus')->latest()->get();
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
