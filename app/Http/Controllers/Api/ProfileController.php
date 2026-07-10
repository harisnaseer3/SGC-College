<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;

use App\Http\Requests\Api\Profile\UpdateProfileRequest;

class ProfileController extends BaseController
{
    public function show(Request $request)
    {
        try {
            $user = $request->user()->load(['organization', 'campus', 'roles', 'permissions']);
            $user->permissions_list = $user->getAllPermissions()->pluck('name');
            return $this->sendResponse($user, 'Profile retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve profile.', ['error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateProfileRequest $request)
    {
        try {
            $user = $request->user();
            $user->update($request->validated());

            $user->load(['organization', 'campus', 'roles', 'permissions']);
            $user->permissions_list = $user->getAllPermissions()->pluck('name');
            return $this->sendResponse($user, 'Profile updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update profile.', ['error' => $e->getMessage()], 500);
        }
    }
}
