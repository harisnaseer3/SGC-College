<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Traits\HasOrganizationScope;
use App\Traits\HasCampusScope;

class Expense extends Model
{
    use HasOrganizationScope, HasCampusScope;

    protected $fillable = [
        'organization_id',
        'campus_id',
        'bill_no',
        'expense_category_id',
        'amount',
        'quantity',
        'supplier',
        'expense_date',
        'title',
        'description',
        'attachment_url',
        'status',
        'recorded_by',
    ];

    protected $casts = [
        'expense_date' => 'date',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function campus()
    {
        return $this->belongsTo(Campus::class);
    }

    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
