<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;

use App\Http\Requests\Api\Profile\UpdateProfileRequest;

class ProfileController extends BaseController
{
    public function show(Request $request)
    {
        try {
            return $this->sendResponse($request->user()->load(['organization', 'campus', 'roles']), 'Profile retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve profile.', ['error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateProfileRequest $request)
    {
        try {
            $user = $request->user();
            $user->update($request->validated());

            return $this->sendResponse($user->load(['organization', 'campus', 'roles']), 'Profile updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update profile.', ['error' => $e->getMessage()], 500);
        }
    }
}
