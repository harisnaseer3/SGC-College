<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    /**
     * Log a user or system activity.
     */
    public static function log(string $action, string $module, string $description, ?array $properties = null, $user = null): ?ActivityLog
    {
        try {
            $user = $user ?? Auth::user();

            return ActivityLog::create([
                'user_id' => $user ? $user->id : null,
                'user_name' => $user ? $user->name : 'Guest/System',
                'user_email' => $user ? $user->email : null,
                'action' => strtoupper($action),
                'module' => $module,
                'description' => $description,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'properties' => $properties,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to log activity: ' . $e->getMessage());
            return null;
        }
    }
}
