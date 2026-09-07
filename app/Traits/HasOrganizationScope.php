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
                if (request()->header('X-Organization-ID')) {
                    $builder->where($builder->getModel()->getTable() . '.organization_id', request()->header('X-Organization-ID'));
                } elseif (request()->header('X-Campus-ID')) {
                    // If campus ID is explicitly selected by Super Admin, derive organization_id from campus or bypass organization filter since campus_id is already globally scoped
                    $campusId = request()->header('X-Campus-ID');
                    $campusOrgId = \App\Models\Campus::withoutGlobalScopes()->where('id', $campusId)->value('organization_id');
                    if ($campusOrgId) {
                        $builder->where($builder->getModel()->getTable() . '.organization_id', $campusOrgId);
                    }
                }
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
