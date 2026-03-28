<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Academic\StoreSessionRequest;
use App\Models\AcademicSession;
use Illuminate\Http\JsonResponse;

class AcademicSessionController extends BaseController
{
    public function index(): JsonResponse
    {
        try {
            $sessions = AcademicSession::with('campus')->latest()->get();
            return $this->sendResponse($sessions, 'Academic sessions retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve sessions.', ['error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreSessionRequest $request): JsonResponse
    {
        try {
            $session = AcademicSession::create($request->validated());
            return $this->sendResponse($session, 'Academic session created successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Failed to create session.', ['error' => $e->getMessage()], 500);
        }
    }

    public function show(AcademicSession $academicSession): JsonResponse
    {
        return $this->sendResponse($academicSession->load('campus'), 'Academic session retrieved successfully.');
    }

    public function update(StoreSessionRequest $request, AcademicSession $academicSession): JsonResponse
    {
        try {
            $academicSession->update($request->validated());
            return $this->sendResponse($academicSession, 'Academic session updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update session.', ['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(AcademicSession $academicSession): JsonResponse
    {
        try {
            $academicSession->delete();
            return $this->sendResponse(null, 'Academic session deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete session.', ['error' => $e->getMessage()], 500);
        }
    }
}
