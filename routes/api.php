<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\CampusController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordController::class, 'forgot']);
Route::post('/reset-password', [PasswordController::class, 'reset']);

Route::middleware('auth:api')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/password', [PasswordController::class, 'update']);

    Route::get('/admissions', [App\Http\Controllers\Api\AdmissionController::class, 'index']);
    Route::post('/admissions', [App\Http\Controllers\Api\AdmissionController::class, 'store']);
    Route::get('/admissions/form-data', [App\Http\Controllers\Api\AdmissionController::class, 'getFormData']);

    // Organization & Campus Routes
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{organization}', [OrganizationController::class, 'show']);
    Route::post('/organizations', [OrganizationController::class, 'store']);
    Route::get('/organizations/{organization}/campuses', [CampusController::class, 'index']);
    Route::post('/organizations/{organization}/campuses', [CampusController::class, 'store']);

    // User & Role Routes
    Route::apiResource('users', UserController::class);
    Route::get('roles', [RoleController::class, 'index']);
});
