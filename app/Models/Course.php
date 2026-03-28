<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\HasOrganizationScope;

class Course extends Model
{
    use HasOrganizationScope;

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'credit_hours',
        'description'
    ];

    public function programSemesters()
    {
        return $this->belongsToMany(ProgramSemester::class, 'course_program_semester');
    }
}
