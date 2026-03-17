<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Campus extends Model
{
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
