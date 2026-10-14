<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class Program extends Model
{
    use SoftDeletes;
    use \App\Traits\LogsActivity;
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'name',
        'code',
        'description',
        'duration_years',
        'duration_value',
        'duration_unit',
        'total_semesters',
        'structure_type',
        'requires_batch',
        'branches',
    ];

    protected $casts = [
        'branches' => 'array',
        'requires_batch' => 'boolean',
    ];

    protected $appends = [
        'requires_batch',
    ];

    public function getRequiresBatchAttribute($value = null)
    {
        if (array_key_exists('requires_batch', $this->attributes) && $this->attributes['requires_batch'] !== null) {
            return (bool) $this->attributes['requires_batch'];
        }

        // Auto-detect for short courses if not explicitly set in database
        $name = strtolower($this->name ?? '');
        $isDegree = preg_match('/f\.?s\.?c|matric|degree|bachelor|bs\b|master|inter/i', $name);

        if (!$isDegree) {
            if ($this->duration_unit === 'weeks' || $this->structure_type === 'weekly' || $this->structure_type === 'monthly') {
                return false;
            }

            if ($this->duration_unit === 'months') {
                $val = (int) ($this->duration_value ?? $this->total_semesters ?? 0);
                if ($val <= 12) {
                    return false;
                }
            }

            if (str_contains($name, 'short course') || str_contains($name, 'certificate') || str_contains($name, 'month') || str_contains($name, 'web dev') || str_contains($name, 'bootcamp')) {
                return false;
            }
        }

        return true;
    }

    public function semesters()
    {
        return $this->hasMany(ProgramSemester::class);
    }

    public function campus()
    {
        return $this->belongsTo(Campus::class);
    }
}
