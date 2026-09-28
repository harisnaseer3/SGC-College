<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

use Illuminate\Database\Eloquent\Model;

class CampusBankAccount extends Model
{
    use SoftDeletes;

    use \App\Traits\LogsActivity;

    protected $fillable = [
        'campus_id',
        'bank_name',
        'account_title',
        'account_number',
        'branch_code',
        'is_active',
    ];

    public function campus()
    {
        return $this->belongsTo(Campus::class);
    }
}
