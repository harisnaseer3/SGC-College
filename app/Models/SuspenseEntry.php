<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuspenseEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'campus_id',
        'campus_bank_account_id',
        'amount',
        'deposit_date',
        'reference_number',
        'status',
        'reconciled_payment_id',
        'notes',
        'created_by',
    ];

    public function campus()
    {
        return $this->belongsTo(Campus::class, 'campus_id');
    }

    public function campusBankAccount()
    {
        return $this->belongsTo(CampusBankAccount::class, 'campus_bank_account_id');
    }

    public function feePayment()
    {
        return $this->belongsTo(FeePayment::class, 'reconciled_payment_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
