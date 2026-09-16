<?php

namespace App\Http\Controllers\Api;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends BaseController
{
    /**
     * Display a listing of system activity logs.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Authorization: Only super_admin or org_admin can view activity logs
            if (!$currentUser->hasAnyRole(['super_admin', 'org_admin'], 'web') && !$currentUser->can('view_activity_logs')) {
                return $this->sendError('Unauthorized', ['error' => 'Only administrators can view activity logs.'], 403);
            }

            $query = ActivityLog::with('user')->latest();

            // Filter by search query (description, user_name, user_email, ip_address)
            if ($request->filled('search')) {
                $search = trim($request->input('search'));
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                      ->orWhere('user_name', 'like', "%{$search}%")
                      ->orWhere('user_email', 'like', "%{$search}%")
                      ->orWhere('ip_address', 'like', "%{$search}%");
                });
            }

            // Filter by module
            if ($request->filled('module')) {
                $query->where('module', $request->input('module'));
            }

            // Filter by action
            if ($request->filled('action')) {
                $query->where('action', strtoupper($request->input('action')));
            }

            // Filter by user_id
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }

            // Filter by date range
            if ($request->filled('date_from')) {
                $query->whereDate('created_at', '>=', $request->input('date_from'));
            }
            if ($request->filled('date_to')) {
                $query->whereDate('created_at', '<=', $request->input('date_to'));
            }

            $perPage = (int) $request->input('per_page', 15);
            $logs = $query->paginate($perPage);

            return $this->sendResponse($logs, 'Activity logs retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve activity logs.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified activity log item.
     */
    /**
     * Display the specified activity log item.
     */
    public function show(ActivityLog $activityLog): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            if (!$currentUser->hasAnyRole(['super_admin', 'org_admin'], 'web') && !$currentUser->can('view_activity_logs')) {
                return $this->sendError('Unauthorized', [], 403);
            }

            return $this->sendResponse($activityLog->load('user'), 'Activity log details retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve activity log.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Revert / Undo action recorded in an activity log entry.
     */
    public function undo(Request $request, ActivityLog $activityLog): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            if (!$currentUser->hasAnyRole(['super_admin', 'org_admin'], 'web') && !$currentUser->can('view_activity_logs')) {
                return $this->sendError('Unauthorized', [], 403);
            }

            // Verify 5-digit PIN / password
            $pin = $request->input('pin');
            if ($pin !== '42747') {
                return $this->sendError('Invalid Security PIN', ['pin' => 'Incorrect 5-digit PIN entered.'], 422);
            }

            if (str_contains($activityLog->description, '[UNDONE]')) {
                return $this->sendError('Action Already Undone', ['log' => 'This activity log has already been undone.'], 400);
            }

            \Illuminate\Support\Facades\DB::beginTransaction();

            $restoredEntityName = null;
            $properties = $activityLog->properties ?? [];

            // Execute restoration depending on action and module
            if (strtoupper($activityLog->action) === 'DELETED') {
                $attributes = $properties;
                // Handle if wrapped inside properties keys
                if (isset($properties['old_attributes'])) $attributes = $properties['old_attributes'];
                if (isset($properties['deleted_record'])) $attributes = $properties['deleted_record'];
                if (isset($properties['attributes'])) $attributes = $properties['attributes'];
                
                if (!empty($attributes) && is_array($attributes)) {
                    $moduleKey = strtolower(trim($activityLog->module));
                    $modelClass = match ($moduleKey) {
                        'generated voucher', 'generatedvoucher' => \App\Models\GeneratedVoucher::class,
                        'student fee', 'studentfee', 'fees', 'fee' => \App\Models\StudentFee::class,
                        'fee payment', 'feepayment', 'receipt', 'payment' => \App\Models\FeePayment::class,
                        'expense', 'expenses' => \App\Models\Expense::class,
                        'extra income', 'extraincome', 'income' => \App\Models\ExtraIncome::class,
                        'student', 'admissions' => \App\Models\Student::class,
                        'user', 'users' => \App\Models\User::class,
                        'fee head', 'feehead' => \App\Models\FeeHead::class,
                        'fee structure', 'feestructure' => \App\Models\FeeStructure::class,
                        'academic batch', 'batch' => \App\Models\AcademicBatch::class,
                        'organization' => \App\Models\Organization::class,
                        'role' => \Spatie\Permission\Models\Role::class,
                        default => null
                    };

                    if ($modelClass && class_exists($modelClass)) {
                        $id = $attributes['id'] ?? null;
                        $restored = false;

                        if ($id && method_exists($modelClass, 'withTrashed')) {
                            $trashed = $modelClass::withTrashed()->find($id);
                            if ($trashed && method_exists($trashed, 'restore')) {
                                $trashed->restore();
                                $restored = true;
                            }
                        }

                        if (!$restored) {
                            // Re-create record with original ID if missing
                            unset($attributes['created_at'], $attributes['updated_at']);
                            $modelClass::create($attributes);
                            $restored = true;
                        }

                        $restoredEntityName = class_basename($modelClass);
                    }
                }
            } elseif (strtoupper($activityLog->action) === 'UPDATED' && !empty($properties['old'])) {
                // Revert updated attributes back to old values
                $oldValues = $properties['old'];
                $moduleKey = strtolower(trim($activityLog->module));
                $modelClass = match ($moduleKey) {
                    'generated voucher', 'generatedvoucher' => \App\Models\GeneratedVoucher::class,
                    'student fee', 'studentfee', 'fees', 'fee' => \App\Models\StudentFee::class,
                    'fee payment', 'feepayment', 'receipt', 'payment' => \App\Models\FeePayment::class,
                    'expense', 'expenses' => \App\Models\Expense::class,
                    'extra income', 'extraincome', 'income' => \App\Models\ExtraIncome::class,
                    'student', 'admissions' => \App\Models\Student::class,
                    'user', 'users' => \App\Models\User::class,
                    default => null
                };

                if ($modelClass && class_exists($modelClass)) {
                    // Try to identify row by ID from description or properties
                    $id = $properties['new']['id'] ?? $properties['old']['id'] ?? null;
                    if (!$id && preg_match('/ID:\s*(\d+)/i', $activityLog->description, $matches)) {
                        $id = $matches[1];
                    }

                    if ($id) {
                        $record = $modelClass::find($id);
                        if ($record) {
                            $record->update($oldValues);
                            $restoredEntityName = class_basename($modelClass) . " #$id (Reverted Updates)";
                        }
                    }
                }
            }

            // Mark log as UNDONE
            $activityLog->update([
                'description' => $activityLog->description . ' [UNDONE by ' . $currentUser->name . ']'
            ]);

            // Log the undo action itself
            ActivityLog::create([
                'user_id' => $currentUser->id,
                'user_name' => $currentUser->name,
                'user_email' => $currentUser->email,
                'module' => $activityLog->module,
                'action' => 'RESTORED',
                'description' => 'Undone activity log #' . $activityLog->id . ($restoredEntityName ? " (Restored $restoredEntityName)" : '') . ': ' . $activityLog->description,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'properties' => ['original_log_id' => $activityLog->id]
            ]);

            \Illuminate\Support\Facades\DB::commit();

            return $this->sendResponse($activityLog, 'Action undone successfully.' . ($restoredEntityName ? " $restoredEntityName record restored." : ''));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollback();
            return $this->sendError('Failed to undo activity log.', ['error' => $e->getMessage()], 500);
        }
    }
}
