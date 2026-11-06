<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class Student extends Model
{
    use \App\Traits\LogsActivity;

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
        'program_branch',
        'academic_batch_id',
        'intake_session',
        'student_cnic',
        'gender',
        'is_transfer',
        'religion',
        'qualifications',
        'student_picture',
        'attachments',
    ];

    protected $casts = [
        'attachments' => 'array',
        'qualifications' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($student) {
            static::populateAdmissionNumber($student);

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

        static::updating(function ($student) {
            if (empty($student->admission_number)) {
                static::populateAdmissionNumber($student);
            }
        });
    }

    /**
     * Auto-generate admission_number with format: ORG-PROG-YEAR-SEQ when empty.
     */
    public static function populateAdmissionNumber(self $student): void
    {
        // Determine organization_id for sequence generation
        $orgId = $student->organization_id;
        if (empty($orgId)) {
            $user = auth()->user();
            if ($user && !$user->hasRole('super_admin')) {
                $orgId = $user->organization_id;
            } elseif ($user && $user->hasRole('super_admin')) {
                $orgId = request()->header('X-Organization-ID');
            }
            if (empty($orgId) && !empty($student->campus_id)) {
                $orgId = Campus::withoutGlobalScopes()->where('id', $student->campus_id)->value('organization_id');
            }
        }

        if (empty($student->admission_number) && $orgId) {
            $org = Organization::withoutGlobalScopes()->find($orgId);
            $orgCode = $org ? strtoupper($org->slug ?: substr($org->name, 0, 3)) : 'ORG';

            $program = Program::withoutGlobalScopes()->find($student->program_id);
            $programCode = 'PROG';
            if ($program) {
                $programCode = strtoupper(str_replace(' ', '-', $program->name));
                $programCode = preg_replace('/[^A-Z0-9\-]/', '', $programCode);
            }

            $batch = $student->academic_batch_id
                ? AcademicBatch::withoutGlobalScopes()->find($student->academic_batch_id)
                : null;

            $batchYear = null;
            if ($batch && preg_match('/(\d{4})/', $batch->name, $matches)) {
                $batchYear = substr($matches[1], -2);
            } elseif (!empty($student->admission_date)) {
                try {
                    $batchYear = \Carbon\Carbon::parse($student->admission_date)->format('y');
                } catch (\Exception $e) {
                    $batchYear = date('y');
                }
            } else {
                $batchYear = date('y');
            }

            $prefix = "{$orgCode}-{$programCode}-{$batchYear}-";

            // Find the maximum existing sequence number for this prefix (including soft-deleted students)
            $query = static::withoutGlobalScopes()
                ->withTrashed()
                ->where('organization_id', $orgId)
                ->where('admission_number', 'LIKE', "{$prefix}%");

            if ($student->id) {
                $query->where('id', '!=', $student->id);
            }

            $existingNumbers = $query->pluck('admission_number');

            $maxSequence = 0;
            foreach ($existingNumbers as $admNo) {
                $parts = explode('-', $admNo);
                $lastPart = end($parts);
                if (is_numeric($lastPart)) {
                    $maxSequence = max($maxSequence, (int)$lastPart);
                }
            }

            $nextSequence = $maxSequence + 1;
            $student->admission_number = $prefix . str_pad($nextSequence, 3, '0', STR_PAD_LEFT);
        }
    }

    /**
     * Re-aligns an auto-generated admission_number's year segment if the student's batch or admission_date year changes.
     */
    public function syncAdmissionNumberYear(): void
    {
        if (empty($this->admission_number)) {
            return;
        }

        // Only update auto-generated numbers matching prefix-YY-NNN
        if (!preg_match('/^(.+)-(\d{2})-(\d+)$/', $this->admission_number, $m)) {
            return;
        }

        $basePrefix = $m[1];
        $currentYearCode = $m[2];

        $batch = $this->academic_batch_id
            ? AcademicBatch::withoutGlobalScopes()->find($this->academic_batch_id)
            : null;

        $targetYear = null;
        if ($batch && preg_match('/(\d{4})/', $batch->name, $matches)) {
            $targetYear = substr($matches[1], -2);
        } elseif (!empty($this->admission_date)) {
            try {
                $targetYear = \Carbon\Carbon::parse($this->admission_date)->format('y');
            } catch (\Exception $e) {
                return;
            }
        }

        if (!$targetYear || $targetYear === $currentYearCode) {
            return;
        }

        $newPrefix = "{$basePrefix}-{$targetYear}-";

        $existingNumbers = static::withoutGlobalScopes()
            ->withTrashed()
            ->where('organization_id', $this->organization_id)
            ->where('id', '!=', $this->id)
            ->where('admission_number', 'LIKE', "{$newPrefix}%")
            ->pluck('admission_number');

        $maxSequence = 0;
        foreach ($existingNumbers as $admNo) {
            $parts = explode('-', $admNo);
            $lastPart = end($parts);
            if (is_numeric($lastPart)) {
                $maxSequence = max($maxSequence, (int)$lastPart);
            }
        }

        $nextSequence = $maxSequence + 1;
        $this->admission_number = $newPrefix . str_pad($nextSequence, 3, '0', STR_PAD_LEFT);
        $this->saveQuietly();
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

    /**
     * Get the struck off date if the student is currently struck off.
     */
    public function getStruckOffDateAttribute()
    {
        if (strtolower($this->status) !== 'struck off' && strtolower($this->status) !== 'struck_off') {
            return null;
        }

        $log = $this->statusLogs()->where('status', 'Struck Off')->orderBy('action_date', 'desc')->first();
        return $log ? $log->action_date : null;
    }
}
