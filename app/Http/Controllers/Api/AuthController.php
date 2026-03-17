<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

use App\Http\Requests\Api\Auth\RegisterRequest;
use App\Http\Requests\Api\Auth\LoginRequest;

class AuthController extends BaseController
{
    public function register(RegisterRequest $request)
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'organization_id' => $validated['organization_id'],
            'campus_id' => $validated['campus_id'] ?? null,
        ]);

        $token = $user->createToken('auth_token')->accessToken;

        return $this->sendResponse([
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 'User registered successfully.', 201);
    }

    public function login(LoginRequest $request)
    {
        $validated = $request->validated();

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return $this->sendError('Unauthorized.', ['error' => 'The provided credentials are incorrect.'], 401);
        }

        $token = $user->createToken('auth_token')->accessToken;

        // Set organization context in session if user has one
        if ($user->organization_id) {
            session(['organization_id' => $user->organization_id]);
        }

        return $this->sendResponse([
            'user' => $user->load(['organization', 'campus']),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 'User logged in successfully.');
    }

    public function logout(Request $request)
    {
        $request->user()->token()->revoke();

        return $this->sendResponse([], 'Logged out successfully');
    }
}
