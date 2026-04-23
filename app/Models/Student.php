<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class Student extends Model
{
    use HasOrganizationScope, HasCampusScope, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'academic_class_id',
        'section_id',
        'admission_number',
        'roll_number',
        'first_name',
        'last_name',
        'email',
        'phone',
        'date_of_birth',
        'address',
        'guardian_name',
        'guardian_phone',
        'guardian_cnic',
        'admission_date',
        'status',
        'program_id',
        'program_semester_id',
        'academic_batch_id',
        'intake_session',
        'student_cnic',
        'gender',
        'is_transfer',
        'religion',
        'student_picture',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($student) {
            // Determine organization_id for sequence generation
            $orgId = $student->organization_id;
            if (empty($orgId)) {
                $user = auth()->user();
                if ($user && !$user->hasRole('super_admin')) {
                    $orgId = $user->organization_id;
                } elseif ($user && $user->hasRole('super_admin')) {
                    $orgId = request()->header('X-Organization-ID');
                }
            }

            // Auto-generate admission_number per organization starting from 1001
            if (empty($student->admission_number) && $orgId) {
                $max = static::withoutGlobalScopes()
                    ->where('organization_id', $orgId)
                    ->max(\DB::raw('CAST(admission_number AS UNSIGNED)'));
                $student->admission_number = $max ? $max + 1 : 1001;
            }

            // Auto-generate roll_number per campus starting from 100
            if (empty($student->roll_number)) {
                $max = static::where('campus_id', $student->campus_id)->max('roll_number');
                $student->roll_number = $max ? $max + 1 : 100;
            }

            // Default status
            if (empty($student->status)) {
                $student->status = 'Pending';
            }
        });
    }

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

    /**
     * Get the status history logs for the student.
     */
    public function statusLogs()
    {
        return $this->hasMany(StudentStatusLog::class)->orderBy('action_date', 'desc');
    }

    public function studentFees()
    {
        return $this->hasMany(StudentFee::class);
    }
}
