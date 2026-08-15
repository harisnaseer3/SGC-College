<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

use App\Http\Requests\Api\Auth\RegisterRequest;
use App\Http\Requests\Api\Auth\LoginRequest;

use App\Services\ActivityLogger;

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

            ActivityLogger::log('REGISTER', 'Auth', "User registered account for {$user->email}", null, $user);

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
                ActivityLogger::log('FAILED_LOGIN', 'Auth', "Failed login attempt for email: {$validated['email']}");
                return $this->sendError('Unauthorized.', ['error' => 'The provided credentials are incorrect.'], 401);
            }

            if (isset($user->is_active) && !$user->is_active) {
                ActivityLogger::log('BLOCKED_LOGIN', 'Auth', "Attempted login on disabled account: {$validated['email']}", null, $user);
                return $this->sendError('Account Disabled.', ['error' => 'Your account has been disabled. Please contact your administrator.'], 403);
            }

            $token = $user->createToken('auth_token')->accessToken;

            $loadedUser = $user->load(['organization', 'campus', 'roles', 'permissions']);
            $loadedUser->permissions_list = $user->getAllPermissions()->pluck('name');

            ActivityLogger::log('LOGIN', 'Auth', "User {$user->name} ({$user->email}) logged in successfully", null, $user);

            return $this->sendResponse([
                'user' => $loadedUser,
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
                ActivityLogger::log('LOGOUT', 'Auth', "User {$user->name} logged out", null, $user);
                $user->token()->revoke();
            }
            return $this->sendResponse([], 'Logged out successfully');
        } catch (\Exception $e) {
            return $this->sendError('Logout failed.', ['error' => $e->getMessage()], 500);
        }
    }
}
