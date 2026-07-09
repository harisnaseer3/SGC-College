<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use Illuminate\Http\JsonResponse;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_roles', only: ['index', 'show']),
            new Middleware('permission:create_roles', only: ['store']),
            new Middleware('permission:edit_roles', only: ['update']),
            new Middleware('permission:delete_roles', only: ['destroy']),
            new Middleware('permission:manage_role_permissions', only: ['assignPermissions']),
        ];
    }

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

            $roles = $query->paginate(10);

            $roles->getCollection()->transform(function ($role) {
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
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'permissions' => 'nullable|array'
        ]);

        try {
            $role = Role::create([
                'name' => strtolower(str_replace(' ', '_', $request->name)),
                'guard_name' => 'web'
            ]);

            if ($request->has('permissions')) {
                $role->syncPermissions($request->permissions);
            }

            return $this->sendResponse($role, 'Role created successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to create role.', ['error' => $e->getMessage()], 500);
        }
    }

    public function show(Role $role): JsonResponse
    {
        $role->load('permissions');
        return $this->sendResponse($role, 'Role details retrieved successfully.');
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        if ($role->name === 'super_admin') {
            return $this->sendError('Cannot modify super admin role.', [], 403);
        }

        $request->validate([
            'name' => 'required|string|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array'
        ]);

        try {
            $role->update([
                'name' => strtolower(str_replace(' ', '_', $request->name))
            ]);

            if ($request->has('permissions')) {
                $role->syncPermissions($request->permissions);
            }

            return $this->sendResponse($role, 'Role updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update role.', ['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Role $role): JsonResponse
    {
        if (in_array($role->name, ['super_admin', 'student', 'teacher', 'registrar'])) {
            return $this->sendError('Cannot delete system default roles.', [], 403);
        }

        try {
            $role->delete();
            return $this->sendResponse([], 'Role deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete role.', ['error' => $e->getMessage()], 500);
        }
    }

    public function assignPermissions(Request $request, Role $role): JsonResponse
    {
        if ($role->name === 'super_admin') {
            return $this->sendError('Super admin already has all permissions natively.', [], 403);
        }

        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,name'
        ]);

        try {
            $role->syncPermissions($request->permissions);
            return $this->sendResponse($role->load('permissions'), 'Permissions assigned successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to assign permissions.', ['error' => $e->getMessage()], 500);
        }
    }
}
