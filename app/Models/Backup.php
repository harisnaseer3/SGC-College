<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Backup extends Model
{
    use \App\Traits\LogsActivity;

    protected $fillable = [
        'name',
        'type',
        'size',
        'file_path',
        'created_by',
        'status',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
