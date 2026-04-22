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
        try {
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
        } catch (\Exception $e) {
            return $this->sendError('Registration failed.', ['error' => $e->getMessage()], 500);
        }
    }

    public function login(LoginRequest $request)
    {
        try {
            $validated = $request->validated();

            $user = User::where('email', $validated['email'])->first();

            if (!$user || !Hash::check($validated['password'], $user->password)) {
                return $this->sendError('Unauthorized.', ['error' => 'The provided credentials are incorrect.'], 401);
            }

            $token = $user->createToken('auth_token')->accessToken;

            return $this->sendResponse([
                'user' => $user->load(['organization', 'campus', 'roles']),
                'access_token' => $token,
                'token_type' => 'Bearer',
            ], 'User logged in successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Login failed.', ['error' => $e->getMessage()], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            $user = $request->user();
            if ($user && $user->token()) {
                $user->token()->revoke();
            }
            return $this->sendResponse([], 'Logged out successfully');
        } catch (\Exception $e) {
            return $this->sendError('Logout failed.', ['error' => $e->getMessage()], 500);
        }
    }
}
