<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Requests\Api\StoreUserRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_users', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_users', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_users', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_users', only: ['destroy', 'bulkDelete']),
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $users = User::with(['roles', 'campus'])->paginate(request('per_page', 10));
            return $this->sendResponse($users, 'Users retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve users.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            $currentUser = $request->user();
            $data = $request->validated();
            
            // Security check: only Super Admin can create Super Admins
            if ($data['role'] === 'super_admin' && !$currentUser->hasRole('super_admin', 'web')) {
                return $this->sendError('Unauthorized', ['role' => 'Only Super Admins can create other Super Admins.'], 403);
            }

            $data['password'] = Hash::make($data['password']);
            
            if ($data['role'] === 'super_admin') {
                $data['organization_id'] = null;
                $data['campus_id'] = null;
            }

            $user = User::create($data);
            
            // Explicitly assign role using the 'web' guard format
            // since the API route uses the 'api' guard but roles are seeded for 'web'
            $role = Role::findByName($data['role'], 'web');
            $user->assignRole($role);

            return $this->sendResponse($user->load(['roles', 'campus']), 'User created successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Failed to create user.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            if (!$currentUser->hasRole('super_admin', 'web') && $user->campus_id !== $currentUser->campus_id) {
                return $this->sendError('Unauthorized', [], 403);
            }

            return $this->sendResponse($user->load(['roles', 'campus']), 'User retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve user.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();
        if (!$currentUser->hasRole('super_admin', 'web') && $user->campus_id !== $currentUser->campus_id) {
            return $this->sendError('Unauthorized', [], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'sometimes|string|min:8|confirmed|nullable',
            'role' => 'sometimes|string|exists:roles,name',
            'campus_id' => 'required_unless:role,super_admin,org_admin|nullable|exists:campuses,id',
        ]);

        if (isset($data['role']) && $data['role'] === 'super_admin' && !$currentUser->hasRole('super_admin', 'web')) {
            return $this->sendError('Unauthorized', ['role' => 'Only Super Admins can assign Super Admin role.'], 403);
        }

        if (isset($data['role']) && $data['role'] === 'super_admin') {
            $data['organization_id'] = null;
            $data['campus_id'] = null;
        }

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        if (isset($data['role'])) {
            // Explicitly sync role using the 'web' guard format
            $role = Role::findByName($data['role'], 'web');
            $user->syncRoles([$role]);
        }

        return $this->sendResponse($user->load(['roles', 'campus']), 'User updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            if (!$currentUser->hasRole('super_admin', 'web') && $user->campus_id !== $currentUser->campus_id) {
                return $this->sendError('Unauthorized', [], 403);
            }

            $user->delete();
            return $this->sendResponse(null, 'User deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete user.', ['error' => $e->getMessage()], 500);
        }
    }
}
