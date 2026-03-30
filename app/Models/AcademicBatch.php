<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class AcademicBatch extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'name',
        'is_active'
    ];

    public function campus()
    {
        return $this->belongsTo(Campus::class);
    }
}
