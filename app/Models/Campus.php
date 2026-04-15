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
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
