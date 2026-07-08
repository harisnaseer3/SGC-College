<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class ExtraIncome extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'program_id',
        'income_category_id',
        'amount',
        'date',
        'payment_method',
        'form_number',
        'collected_by',
        'remarks',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function incomeCategory()
    {
        return $this->belongsTo(IncomeCategory::class);
    }

    public function collectedBy()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function campus()
    {
        return $this->belongsTo(Campus::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }
}
