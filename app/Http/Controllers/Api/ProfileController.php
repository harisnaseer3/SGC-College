<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;

use App\Http\Requests\Api\Profile\UpdateProfileRequest;

class ProfileController extends BaseController
{
    public function show(Request $request)
    {
        return $this->sendResponse($request->user()->load(['organization', 'campus']), 'Profile retrieved successfully.');
    }

    public function update(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());

        return $this->sendResponse($user->load(['organization', 'campus']), 'Profile updated successfully.');
    }
}
