<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class Program extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'name',
        'code',
        'description',
        'duration_years',
        'total_semesters'
    ];

    public function semesters()
    {
        return $this->hasMany(ProgramSemester::class);
    }

    public function campus()
    {
        return $this->belongsTo(Campus::class);
    }
}
