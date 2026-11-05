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

            // 1. If user has an organization_id assigned, use it
            if ($user && !empty($user->organization_id)) {
                $model->organization_id = $user->organization_id;
                return;
            }

            // 2. If organization_id is passed via header, use it
            if (request()->hasHeader('X-Organization-ID') && request()->header('X-Organization-ID')) {
                $model->organization_id = request()->header('X-Organization-ID');
                return;
            }

            // 3. Fallback: Derive organization_id from campus_id if available on model, user, or header
            $campusId = $model->campus_id
                ?? ($user ? $user->campus_id : null)
                ?? request()->header('X-Campus-ID');

            if ($campusId) {
                $campusOrgId = \App\Models\Campus::withoutGlobalScopes()->where('id', $campusId)->value('organization_id');
                if ($campusOrgId) {
                    $model->organization_id = $campusOrgId;
                }
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
