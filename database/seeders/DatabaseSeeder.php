<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Organizations
        $orgs = [
            ['name' => 'Tenacious', 'slug' => 'tenacious'],
            ['name' => 'Tiges', 'slug' => 'tiges'],
            ['name' => 'CICON', 'slug' => 'cicon'],
        ];

        foreach ($orgs as $orgData) {
            $org = \App\Models\Organization::create($orgData);

            // Create some campuses for each org
            $campus = \App\Models\Campus::create([
                'organization_id' => $org->id,
                'name' => $org->name . ' Main Campus',
                'code' => strtoupper(substr($org->name, 0, 3)) . '-MC',
            ]);

            // Create Academic Classes
            $classes = ['Class 11', 'Class 12', 'BS Computer Science', 'BBA'];
            foreach ($classes as $className) {
                $class = \App\Models\AcademicClass::create([
                    'organization_id' => $org->id,
                    'name' => $className,
                    'code' => strtoupper(substr($className, 0, 3)),
                ]);

                // Create Sections
                foreach (['Section A', 'Section B'] as $sectionName) {
                    \App\Models\Section::create([
                        'organization_id' => $org->id,
                        'academic_class_id' => $class->id,
                        'name' => $sectionName,
                    ]);
                }
            }
        }

        $this->call([
            PermissionsSeeder::class,
            RoleSeeder::class,
            SuperAdminSeeder::class,
        ]);
    }
}
