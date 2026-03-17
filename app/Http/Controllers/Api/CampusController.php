<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCampusRequest;
use App\Models\Organization;
use App\Models\Campus;
use Illuminate\Http\JsonResponse;

class CampusController extends BaseController
{
    /**
     * Display a listing of the campuses for a specific organization.
     */
    public function index(Organization $organization): JsonResponse
    {
        try {
            $campuses = $organization->campuses;
            return $this->sendResponse($campuses, 'Campuses retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve campuses.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created campus under a specific organization.
     */
    public function store(StoreCampusRequest $request, Organization $organization): JsonResponse
    {
        try {
            $data = $request->validated();

            if ($request->hasFile('logo')) {
                $path = $request->file('logo')->store('logos/campuses', 'public');
                $data['logo_url'] = '/storage/' . $path;
            }

            // Remove 'logo' from data if it exists to avoid potential issues even if not in fillable
            unset($data['logo']);

            $campus = $organization->campuses()->create($data);
            
            return $this->sendResponse($campus, 'Campus created successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Server Error', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }
}
