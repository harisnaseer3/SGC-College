<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\HasOrganizationScope;

class Section extends Model
{
    use HasOrganizationScope;

    protected $fillable = ['organization_id', 'academic_class_id', 'name'];

    public function academicClass()
    {
        return $this->belongsTo(AcademicClass::class);
    }

    public function students()
    {
        return $this->hasMany(Student::class);
    }
}
