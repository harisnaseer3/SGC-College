<?php

namespace App\Traits;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Builder;

trait HasOrganizationScope
{
    protected static function bootHasOrganizationScope()
    {
        static::creating(function ($model) {
            if (empty($model->organization_id) && session()->has('organization_id')) {
                $model->organization_id = session()->get('organization_id');
            }
        });

        static::addGlobalScope('organization', function (Builder $builder) {
            if (session()->has('organization_id')) {
                $builder->where('organization_id', session()->get('organization_id'));
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
