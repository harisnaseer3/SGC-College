<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCampusRequest;
use App\Http\Requests\Api\UpdateCampusRequest;
use App\Models\Organization;
use App\Models\Campus;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class CampusController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_campuses', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_campuses', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_campuses', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_campuses', only: ['destroy', 'bulkDelete']),
        ];
    }

    /**
     * Check if the authenticated user is a super admin.
     */
    private function isSuperAdmin(): bool
    {
        return auth()->user()->hasRole('super_admin', 'web');
    }

    /**
     * Display a listing of the campuses for a specific organization.
     */
    public function index(Organization $organization): JsonResponse
    {
        try {
            $user = auth()->user();

            if (!$user->hasRole('super_admin', 'web') && $user->organization_id !== $organization->id) {
                return $this->sendError('Unauthorized access to this organization.', [], 403);
            }

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
            if (!$this->isSuperAdmin()) {
                return $this->sendError('Only super admins can create campuses.', [], 403);
            }

            $data = $request->validated();

            if ($request->hasFile('logo')) {
                $path = $request->file('logo')->store('logos/campuses', 'public');
                $data['logo_url'] = '/storage/' . $path;
            }

            unset($data['logo']);

            $campus = $organization->campuses()->create($data);

            return $this->sendResponse($campus, 'Campus created successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Server Error', [
                'error' => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine()
            ], 500);
        }
    }

    /**
     * Update the specified campus.
     */
    public function update(UpdateCampusRequest $request, Organization $organization, Campus $campus): JsonResponse
    {
        try {
            if (!$this->isSuperAdmin()) {
                return $this->sendError('Only super admins can update campuses.', [], 403);
            }

            if ($campus->organization_id !== $organization->id) {
                return $this->sendError('Campus does not belong to this organization.', [], 403);
            }

            $data = $request->validated();

            if ($request->hasFile('logo')) {
                // Delete old logo if stored locally
                if ($campus->logo_url && str_starts_with($campus->logo_url, '/storage/')) {
                    $oldPath = str_replace('/storage/', '', $campus->logo_url);
                    Storage::disk('public')->delete($oldPath);
                }

                $path = $request->file('logo')->store('logos/campuses', 'public');
                $data['logo_url'] = '/storage/' . $path;
            }

            unset($data['logo']);

            $campus->update($data);

            return $this->sendResponse($campus->fresh(), 'Campus updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Server Error', [
                'error' => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine()
            ], 500);
        }
    }

    /**
     * Remove the specified campus.
     */
    public function destroy(Organization $organization, Campus $campus): JsonResponse
    {
        try {
            if (!$this->isSuperAdmin()) {
                return $this->sendError('Only super admins can delete campuses.', [], 403);
            }

            if ($campus->organization_id !== $organization->id) {
                return $this->sendError('Campus does not belong to this organization.', [], 403);
            }

            // Delete logo file if stored locally
            if ($campus->logo_url && str_starts_with($campus->logo_url, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $campus->logo_url);
                Storage::disk('public')->delete($oldPath);
            }

            $campus->delete();

            return $this->sendResponse([], 'Campus deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Server Error', [
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
