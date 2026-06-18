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
        'registration_no',
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

            // Auto-generate admission_number with format: ORG-PROG-YEAR-SEQ
            if (empty($student->admission_number) && $orgId) {
                $org = Organization::find($orgId);
                $orgCode = $org ? strtoupper($org->slug ?: substr($org->name, 0, 3)) : 'ORG';

                $program = Program::find($student->program_id);
                $programCode = 'PROG';
                if ($program) {
                    $programCode = strtoupper(str_replace(' ', '-', $program->name));
                    $programCode = preg_replace('/[^A-Z0-9\-]/', '', $programCode);
                }

                $batch = AcademicBatch::find($student->academic_batch_id);
                $batchYear = date('y');
                if ($batch && preg_match('/(\d{4})/', $batch->name, $matches)) {
                    $batchYear = substr($matches[1], -2);
                }

                $prefix = "{$orgCode}-{$programCode}-{$batchYear}-";

                // Find the maximum existing sequence number for this prefix
                $maxAdmissionNumber = static::withoutGlobalScopes()
                    ->where('organization_id', $orgId)
                    ->where('admission_number', 'LIKE', "{$prefix}%")
                    ->max('admission_number');

                $nextSequence = 1;
                if ($maxAdmissionNumber) {
                    $parts = explode('-', $maxAdmissionNumber);
                    $lastPart = end($parts);
                    if (is_numeric($lastPart)) {
                        $nextSequence = (int)$lastPart + 1;
                    }
                }

                $student->admission_number = $prefix . str_pad($nextSequence, 3, '0', STR_PAD_LEFT);
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
