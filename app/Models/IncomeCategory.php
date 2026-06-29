<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class IncomeCategory extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'name',
        'description',
    ];

    public function extraIncomes()
    {
        return $this->hasMany(ExtraIncome::class);
    }
}
