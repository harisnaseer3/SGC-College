<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HasCampusScope
{
    protected static function bootHasCampusScope()
    {
        static::creating(function ($model) {
            $user = auth()->user();
            if ($user && empty($model->campus_id) && !$user->hasRole('Super Admin')) {
                $model->campus_id = $user->campus_id;
            }
        });

        static::addGlobalScope('campus', function (Builder $builder) {
            $user = auth()->user();
            if ($user && !$user->hasRole('Super Admin') && $user->campus_id) {
                $builder->where($builder->getModel()->getTable() . '.campus_id', $user->campus_id);
            }
        });
    }
}
