<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class FeeHead extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'name',
        'frequency',
        'description',
    ];

    public function structures()
    {
        return $this->belongsToMany(FeeStructure::class, 'fee_structure_items')
                    ->withPivot('amount')
                    ->withTimestamps();
    }
}
