<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class Student extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'academic_class_id',
        'section_id',
        'admission_number',
        'first_name',
        'last_name',
        'email',
        'phone',
        'date_of_birth',
        'address',
        'guardian_name',
        'guardian_phone',
        'admission_date',
        'status',
        'program_id',
        'program_semester_id',
        'academic_batch_id',
        'intake_session',
    ];

    public function campus()
    {
        return $this->belongsTo(Campus::class);
    }

    public function academicClass()
    {
        return $this->belongsTo(AcademicClass::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function programSemester()
    {
        return $this->belongsTo(ProgramSemester::class);
    }

    public function academicBatch()
    {
        return $this->belongsTo(AcademicBatch::class);
    }
}
