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
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ProgramController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\AcademicBatchController;
use App\Http\Controllers\Api\Reports\AdmissionReportController;
use App\Http\Controllers\Api\StudentFeeController;
use App\Http\Controllers\Api\StudentImportController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordController::class, 'forgot']);
Route::post('/reset-password', [PasswordController::class, 'reset']);

// ERP API Endpoints for System Amounts & Statistics
Route::middleware('external_api_auth')->prefix('v1/erp')->group(function () {
    Route::get('/stats', [\App\Http\Controllers\Api\ExternalApiController::class, 'stats']);
    Route::get('/amounts', [\App\Http\Controllers\Api\ExternalApiController::class, 'amounts']);
});

Route::middleware('auth:api')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Dashboard
    Route::get('/dashboard/stats', [App\Http\Controllers\Api\DashboardController::class, 'stats']);

    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/password', [PasswordController::class, 'update']);

    Route::get('/admissions/form-data', [App\Http\Controllers\Api\AdmissionController::class, 'getFormData']);
    Route::get('/admissions/import/template', [StudentImportController::class, 'template']);
    Route::post('/admissions/import/preview', [StudentImportController::class, 'preview']);
    Route::post('/admissions/import', [StudentImportController::class, 'import']);
    Route::delete('/admissions/bulk-delete', [App\Http\Controllers\Api\AdmissionController::class, 'bulkDelete']);
    Route::apiResource('admissions', App\Http\Controllers\Api\AdmissionController::class);
    Route::post('/admissions/bulk-status', [App\Http\Controllers\Api\StudentStatusController::class, 'bulkStatus']);
    Route::post('/admissions/{student}/status', [App\Http\Controllers\Api\StudentStatusController::class, 'store']);
    Route::get('/admissions/{student}/status-history', [App\Http\Controllers\Api\StudentStatusController::class, 'index']);

    // Organization & Campus Routes
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{organization}', [OrganizationController::class, 'show']);
    Route::post('/organizations', [OrganizationController::class, 'store']);
    Route::put('/organizations/{organization}', [OrganizationController::class, 'update']);
    Route::get('/organizations/{organization}/campuses', [CampusController::class, 'index']);
    Route::post('/organizations/{organization}/campuses', [CampusController::class, 'store']);
    Route::put('/organizations/{organization}/campuses/{campus}', [CampusController::class, 'update']);
    Route::delete('/organizations/{organization}/campuses/{campus}', [CampusController::class, 'destroy']);

    // User & Role Routes
    Route::patch('users/{user}/toggle-status', [UserController::class, 'toggleStatus']);
    Route::apiResource('users', UserController::class);
    Route::get('activity-logs', [\App\Http\Controllers\Api\ActivityLogController::class, 'index']);
    Route::get('activity-logs/{activityLog}', [\App\Http\Controllers\Api\ActivityLogController::class, 'show']);
    Route::apiResource('roles', RoleController::class);
    Route::post('roles/{role}/permissions', [RoleController::class, 'assignPermissions']);
    Route::get('permissions', [PermissionController::class, 'index']);

    // Academic Module Routes
    Route::apiResource('programs', ProgramController::class);
    Route::apiResource('courses', CourseController::class);
    Route::apiResource('academic-batches', AcademicBatchController::class);
    Route::post('programs/{program}/semesters/{semester}/courses', [ProgramController::class, 'assignCourses']);

    // Reports
    Route::get('/reports/admissions/by-date', [AdmissionReportController::class, 'byDate']);
    Route::get('/reports/extra-income/by-date', [\App\Http\Controllers\Api\Reports\ExtraIncomeReportController::class, 'byDate']);
    Route::get('/reports/extra-expense/by-date', [\App\Http\Controllers\Api\Reports\ExtraExpenseReportController::class, 'byDate']);
    Route::get('/reports/fees/defaulters', [\App\Http\Controllers\Api\Reports\FeeReportController::class, 'defaulters']);
    Route::get('/reports/fees/collection', [\App\Http\Controllers\Api\Reports\FeeReportController::class, 'collection']);
    Route::get('/reports/fees/student-summary', [\App\Http\Controllers\Api\Reports\FeeReportController::class, 'studentSummary']);

    // Fee Module Routes
    Route::apiResource('fee-heads', App\Http\Controllers\Api\FeeHeadController::class);
    Route::apiResource('fee-structures', App\Http\Controllers\Api\FeeStructureController::class);
    Route::apiResource('fee-fine-policies', App\Http\Controllers\Api\FeeFinePolicyController::class);
    Route::get('student-fees', [StudentFeeController::class, 'index']);
    Route::post('student-fees/generate', [StudentFeeController::class, 'generate']);
    Route::post('student-fees/apply-fines', [StudentFeeController::class, 'applyFines']);
    Route::get('student-fees/ledger/{student}', [StudentFeeController::class, 'studentLedger']);
    Route::put('student-fees/{studentFee}', [StudentFeeController::class, 'update']);
    Route::post('student-fees/split/{studentFee}', [StudentFeeController::class, 'split']);
    Route::post('student-fees/revert-split/{studentFee}', [StudentFeeController::class, 'revertSplit']);
    Route::post('student-fees/assign/{student}', [StudentFeeController::class, 'manualAssign']);
    Route::get('student-fees/vouchers/bulk', [StudentFeeController::class, 'bulkVouchers']);
    Route::get('student-fees/vouchers-list', [StudentFeeController::class, 'vouchersList']);
    Route::post('student-fees/vouchers/generate', [StudentFeeController::class, 'generateVoucher']);
    Route::delete('student-fees/vouchers', [StudentFeeController::class, 'bulkDestroyVouchers']);
    Route::delete('student-fees/vouchers/{voucher}', [StudentFeeController::class, 'destroyVoucher']);
    Route::get('student-fees/voucher/{student}', [StudentFeeController::class, 'voucher']);
    Route::post('student-fees/deposit', [StudentFeeController::class, 'deposit']);
    Route::get('student-fees/payments', [StudentFeeController::class, 'allPayments']);
    Route::get('student-fees/payments/{payment}', [StudentFeeController::class, 'showPayment']);
    Route::delete('student-fees/payments', [StudentFeeController::class, 'bulkDestroyPayments']);
    Route::delete('student-fees/payments/{payment}', [StudentFeeController::class, 'destroyPayment']);
    Route::get('student-fees/voucher-lookup/{voucherNumber}', [StudentFeeController::class, 'findByVoucher']);
    
    // Extra Income Module Routes
    Route::apiResource('income-categories', App\Http\Controllers\Api\IncomeCategoryController::class);
    Route::apiResource('extra-incomes', App\Http\Controllers\Api\ExtraIncomeController::class);

    // Extra Expense Management
    Route::apiResource('expense-categories', App\Http\Controllers\Api\ExpenseCategoryController::class);
    Route::apiResource('expenses', App\Http\Controllers\Api\ExpenseController::class);
    Route::patch('expenses/{expense}/status', [App\Http\Controllers\Api\ExpenseController::class, 'updateStatus']);
    Route::post('expenses/bulk-status', [App\Http\Controllers\Api\ExpenseController::class, 'bulkStatus']);

    // System Backups
    Route::get('backups', [App\Http\Controllers\Api\BackupController::class, 'index']);
    Route::post('backups', [App\Http\Controllers\Api\BackupController::class, 'store']);
    Route::post('backups/upload', [App\Http\Controllers\Api\BackupController::class, 'upload']);
    Route::get('backups/{backup}/download', [App\Http\Controllers\Api\BackupController::class, 'download']);
    Route::post('backups/{backup}/restore', [App\Http\Controllers\Api\BackupController::class, 'restore']);
    Route::delete('backups/{backup}', [App\Http\Controllers\Api\BackupController::class, 'destroy']);
});
