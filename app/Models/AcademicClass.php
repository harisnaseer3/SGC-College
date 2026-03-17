<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\HasOrganizationScope;

class AcademicClass extends Model
{
    use HasOrganizationScope;

    protected $fillable = ['organization_id', 'name', 'code'];

    public function sections()
    {
        return $this->hasMany(Section::class);
    }

    public function students()
    {
        return $this->hasMany(Student::class);
    }
}
