<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;

use Spatie\Permission\Models\Role;

class RoleController extends BaseController
{
    public function index(): JsonResponse
    {
        $roles = Role::all()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'label' => ucwords(str_replace('_', ' ', $role->name))
            ];
        });

        return $this->sendResponse($roles, 'Roles retrieved successfully.');
    }
}
