<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HasCampusScope
{
    protected static function bootHasCampusScope()
    {
        static::creating(function ($model) {
            $user = auth()->user();
            if ($user && empty($model->campus_id)) {
                if (!$user->hasAnyRole(['super_admin', 'org_admin'], 'web')) {
                    $model->campus_id = $user->campus_id;
                } elseif (request()->hasHeader('X-Campus-ID')) {
                    $model->campus_id = request()->header('X-Campus-ID');
                }
            }
        });

        static::addGlobalScope('campus', function (Builder $builder) {
            $user = auth()->user();
            if ($user) {
                if (!$user->hasAnyRole(['super_admin', 'org_admin'], 'web') && $user->campus_id) {
                    $builder->where($builder->getModel()->getTable() . '.campus_id', $user->campus_id);
                } elseif ($user->hasAnyRole(['super_admin', 'org_admin'], 'web') && request()->hasHeader('X-Campus-ID')) {
                    $builder->where($builder->getModel()->getTable() . '.campus_id', request()->header('X-Campus-ID'));
                }
            }
        });
    }
}
