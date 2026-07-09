<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreOrganizationRequest;
use App\Http\Requests\Api\UpdateOrganizationRequest;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class OrganizationController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_organizations', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_organizations', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_organizations', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_organizations', only: ['destroy', 'bulkDelete']),
        ];
    }

    /**
     * Display a listing of the organizations.
     */
    public function index(): JsonResponse
    {
        try {
            $organizations = Organization::paginate(10);
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

    /**
     * Update the specified organization in storage.
     */
    public function update(UpdateOrganizationRequest $request, Organization $organization): JsonResponse
    {
        try {
            $data = $request->validated();

            if ($request->hasFile('logo')) {
                // Delete old logo if it exists
                if ($organization->logo_url) {
                    $oldPath = str_replace('/storage/', '', $organization->logo_url);
                    Storage::disk('public')->delete($oldPath);
                }

                $path = $request->file('logo')->store('logos/organizations', 'public');
                $data['logo_url'] = '/storage/' . $path;
            }

            $organization->update($data);
            
            return $this->sendResponse($organization, 'Organization updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update organization.', ['error' => $e->getMessage()], 500);
        }
    }
}
