<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentStatusLog extends Model
{
    protected $fillable = [
        'student_id',
        'status',
        'action_date',
        'remarks',
        'metadata',
        'created_by'
    ];

    protected $casts = [
        'action_date' => 'date',
        'metadata' => 'array',
    ];

    /**
     * Get the student that owns the status log.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Get the user who created the log.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
