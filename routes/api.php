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
use App\Http\Controllers\Api\ProgramController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\AcademicBatchController;
use App\Http\Controllers\Api\Reports\AdmissionReportController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordController::class, 'forgot']);
Route::post('/reset-password', [PasswordController::class, 'reset']);

Route::middleware('auth:api')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Dashboard
    Route::get('/dashboard/stats', [App\Http\Controllers\Api\DashboardController::class, 'stats']);

    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/password', [PasswordController::class, 'update']);

    Route::get('/admissions/form-data', [App\Http\Controllers\Api\AdmissionController::class, 'getFormData']);
    Route::apiResource('admissions', App\Http\Controllers\Api\AdmissionController::class);
    Route::post('/admissions/{student}/status', [App\Http\Controllers\Api\StudentStatusController::class, 'store']);
    Route::get('/admissions/{student}/status-history', [App\Http\Controllers\Api\StudentStatusController::class, 'index']);

    // Organization & Campus Routes
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{organization}', [OrganizationController::class, 'show']);
    Route::post('/organizations', [OrganizationController::class, 'store']);
    Route::get('/organizations/{organization}/campuses', [CampusController::class, 'index']);
    Route::post('/organizations/{organization}/campuses', [CampusController::class, 'store']);

    // User & Role Routes
    Route::apiResource('users', UserController::class);
    Route::get('roles', [RoleController::class, 'index']);

    // Academic Module Routes
    Route::apiResource('programs', ProgramController::class);
    Route::apiResource('courses', CourseController::class);
    Route::apiResource('academic-batches', AcademicBatchController::class);
    Route::post('programs/{program}/semesters/{semester}/courses', [ProgramController::class, 'assignCourses']);

    // Reports
    Route::get('/reports/admissions/by-date', [AdmissionReportController::class, 'byDate']);

    // Fee Module Routes
    Route::apiResource('fee-heads', App\Http\Controllers\Api\FeeHeadController::class);
    Route::apiResource('fee-structures', App\Http\Controllers\Api\FeeStructureController::class);
    Route::apiResource('fee-fine-policies', App\Http\Controllers\Api\FeeFinePolicyController::class);
    Route::get('student-fees', [App\Http\Controllers\Api\StudentFeeController::class, 'index']);
    Route::post('student-fees/generate', [App\Http\Controllers\Api\StudentFeeController::class, 'generate']);
    Route::post('student-fees/apply-fines', [App\Http\Controllers\Api\StudentFeeController::class, 'applyFines']);
    Route::get('student-fees/voucher/{student}', [App\Http\Controllers\Api\StudentFeeController::class, 'voucher']);
});
