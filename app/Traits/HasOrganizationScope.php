<?php

namespace App\Traits;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Builder;

trait HasOrganizationScope
{
    protected static function bootHasOrganizationScope()
    {
        static::creating(function ($model) {
            $user = auth()->user();
            if (!empty($model->organization_id)) {
                return;
            }
            if ($user && empty($model->organization_id) && !$user->hasRole('super_admin')) {
                $model->organization_id = $user->organization_id;
            } elseif ($user && $user->hasRole('super_admin') && request()->hasHeader('X-Organization-ID')) {
                $model->organization_id = request()->header('X-Organization-ID');
            }
        });

        static::addGlobalScope('organization', function (Builder $builder) {
            $user = auth()->user();
            if ($user && !$user->hasRole('super_admin')) {
                if ($user->organization_id) {
                    $builder->where($builder->getModel()->getTable() . '.organization_id', $user->organization_id);
                }
            } elseif ($user && $user->hasRole('super_admin')) {
                if (request()->hasHeader('X-Organization-ID')) {
                    $builder->where($builder->getModel()->getTable() . '.organization_id', request()->header('X-Organization-ID'));
                }
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
