<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProgramSemester extends Model
{
    protected $fillable = [
        'program_id',
        'semester_number',
        'name'
    ];

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function courses()
    {
        return $this->belongsToMany(Course::class, 'course_program_semester');
    }
}
