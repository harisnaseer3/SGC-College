<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'harisnaseer3@gmail.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('superadmin'),
            ]
        );

        $admin->assignRole('super_admin');
    }
}
