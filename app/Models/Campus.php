<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;

class Campus extends Model
{
    use HasOrganizationScope;
    protected $fillable = [
        'organization_id',
        'name',
        'logo_url',
        'location',
        'code',
        'status',
        'bank_name',
        'account_title',
        'account_number',
        'branch_code',
        'payment_terms',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function resolveRouteBinding($value, $field = null)
    {
        return static::withoutGlobalScope('organization')->where($field ?? $this->getRouteKeyName(), $value)->firstOrFail();
    }

    public function bankAccounts()
    {
        return $this->hasMany(CampusBankAccount::class);
    }
}
