<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class FeeStructure extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'name',
        'program_id',
        'academic_batch_id',
    ];

    public function items()
    {
        return $this->hasMany(FeeStructureItem::class);
    }

    public function feeHeads()
    {
        return $this->belongsToMany(FeeHead::class, 'fee_structure_items')
                    ->withPivot('amount')
                    ->withTimestamps();
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function academicBatch()
    {
        return $this->belongsTo(AcademicBatch::class);
    }
}
