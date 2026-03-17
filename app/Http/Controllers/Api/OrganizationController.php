<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreOrganizationRequest;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;

class OrganizationController extends BaseController
{
    /**
     * Display a listing of the organizations.
     */
    public function index(): JsonResponse
    {
        try {
            $organizations = Organization::all();
            return $this->sendResponse($organizations, 'Organizations retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve organizations.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created organization in storage.
     */
    public function store(StoreOrganizationRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();

            if ($request->hasFile('logo')) {
                $path = $request->file('logo')->store('logos/organizations', 'public');
                $data['logo_url'] = '/storage/' . $path;
            }

            $organization = Organization::create($data);
            
            return $this->sendResponse($organization, 'Organization created successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Failed to create organization.', ['error' => $e->getMessage()], 500);
        }
    }

    public function show(Organization $organization): JsonResponse
    {
        try {
            return $this->sendResponse($organization, 'Organization retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve organization.', ['error' => $e->getMessage()], 500);
        }
    }
}
