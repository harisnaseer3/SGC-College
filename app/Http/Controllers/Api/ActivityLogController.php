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
}
