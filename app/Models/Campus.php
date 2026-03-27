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
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
