<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'theme_config',
        'status',
    ];

    protected $casts = [
        'theme_config' => 'array',
    ];

    public function campuses()
    {
        return $this->hasMany(Campus::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
