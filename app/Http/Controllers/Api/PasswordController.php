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
        $request->user()->update([
            'password' => Hash::make($request->validated(['password'])),
        ]);

        return $this->sendResponse([], 'Password changed successfully.');
    }

    public function forgot(ForgotPasswordRequest $request)
    {
        return $this->sendResponse([], 'If an account exists for this email, a reset link has been sent.');
    }

    public function reset(ResetPasswordRequest $request)
    {
        return $this->sendResponse([], 'Your password has been reset.');
    }
}
 