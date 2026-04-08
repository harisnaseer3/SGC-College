<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class FeeFinePolicy extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'fee_head_id',
        'grace_days',
        'fine_amount',
        'fine_type',
    ];

    public function feeHead()
    {
        return $this->belongsTo(FeeHead::class);
    }
}
