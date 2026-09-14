<?php

namespace App\Traits;

use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Support\Arr;

trait LogsActivity
{
    /**
     * Boot the trait.
     */
    protected static function bootLogsActivity()
    {
        static::created(function (Model $model) {
            static::logActivity('CREATED', $model);
        });

        static::updated(function (Model $model) {
            static::logActivity('UPDATED', $model);
        });

        static::deleted(function (Model $model) {
            static::logActivity('DELETED', $model);
        });
    }

    /**
     * Get the log module name.
     */
    protected static function getLogModule(): string
    {
        return defined('static::LOG_MODULE') 
            ? static::LOG_MODULE 
            : Str::headline(class_basename(static::class));
    }

    /**
     * Get the description for the activity log.
     */
    protected static function getLogDescription(string $action, Model $model): string
    {
        $module = static::getLogModule();
        // Fallbacks for what to call the row
        $identifier = $model->name ?? $model->title ?? $model->first_name ?? $model->email ?? "ID: {$model->id}";
        $verb = ucfirst(strtolower($action)); // "Created", "Updated", "Deleted"
        
        return "{$verb} {$module}: {$identifier}";
    }

    /**
     * Log the actual activity.
     */
    protected static function logActivity(string $action, Model $model)
    {
        $properties = null;

        if ($action === 'CREATED') {
            $properties = $model->getAttributes();
        } elseif ($action === 'UPDATED') {
            // We ignore if there are no meaningful changes (e.g. only updated_at changed)
            $changes = $model->getChanges();
            unset($changes['updated_at']);

            if (empty($changes)) {
                return;
            }

            $properties = [
                'old' => Arr::only($model->getOriginal(), array_keys($changes)),
                'new' => $changes
            ];
        } elseif ($action === 'DELETED') {
            $properties = $model->getAttributes();
        }

        ActivityLogger::log(
            $action,
            static::getLogModule(),
            static::getLogDescription($action, $model),
            $properties
        );
    }
}
