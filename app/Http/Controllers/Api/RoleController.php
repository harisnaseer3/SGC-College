<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;

use Spatie\Permission\Models\Role;

class RoleController extends BaseController
{
    public function index(): JsonResponse
    {
        try {
            $user = auth()->user();
            $query = Role::query();

            $excludedRoles = [];
            if ($user && !$user->hasRole('super_admin', 'web')) {
                $excludedRoles[] = 'super_admin';
                
                if (!$user->hasRole('org_admin', 'web')) {
                    $excludedRoles[] = 'org_admin';
                }
            }

            if (!empty($excludedRoles)) {
                $query->whereNotIn('name', $excludedRoles);
            }

            $roles = $query->get()->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'label' => ucwords(str_replace('_', ' ', $role->name))
                ];
            });

            return $this->sendResponse($roles, 'Roles retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve roles.', ['error' => $e->getMessage()], 500);
        }
    }
}
