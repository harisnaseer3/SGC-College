<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

use App\Http\Requests\Api\Profile\UpdatePasswordRequest;
use App\Http\Requests\Api\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\Auth\ResetPasswordRequest;

class PasswordController extends BaseController
{
    public function update(UpdatePasswordRequest $request)
    {
        try {
            $request->user()->update([
                'password' => Hash::make($request->validated(['password'])),
            ]);

            return $this->sendResponse([], 'Password changed successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to change password.', ['error' => $e->getMessage()], 500);
        }
    }

    public function forgot(ForgotPasswordRequest $request)
    {
        try {
            // Logic for sending email would go here
            return $this->sendResponse([], 'If an account exists for this email, a reset link has been sent.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to process forgot password request.', ['error' => $e->getMessage()], 500);
        }
    }

    public function reset(ResetPasswordRequest $request)
    {
        try {
            // Logic for resetting password would go here
            return $this->sendResponse([], 'Your password has been reset.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to reset password.', ['error' => $e->getMessage()], 500);
        }
    }
}
 