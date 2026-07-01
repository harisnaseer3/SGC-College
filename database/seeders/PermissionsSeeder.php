<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Grouped permissions
        $permissions = [
            'dashboard' => ['view_dashboard', 'view_stats'],
            
            'admissions' => ['view_admissions', 'create_admissions', 'edit_admissions', 'delete_admissions', 'change_admission_status', 'import_admissions'],
            
            'academic' => [
                'view_programs', 'create_programs', 'edit_programs', 'delete_programs',
                'view_courses', 'create_courses', 'edit_courses', 'delete_courses',
                'view_academic_batches', 'create_academic_batches', 'edit_academic_batches', 'delete_academic_batches',
            ],
            
            'organizations' => [
                'view_organizations', 'create_organizations', 'edit_organizations', 'delete_organizations',
                'view_campuses', 'create_campuses', 'edit_campuses', 'delete_campuses',
            ],
            
            'users' => [
                'view_users', 'create_users', 'edit_users', 'delete_users',
                'view_roles', 'create_roles', 'edit_roles', 'delete_roles', 'manage_role_permissions',
            ],
            
            'fees' => [
                'view_fee_heads', 'create_fee_heads', 'edit_fee_heads', 'delete_fee_heads',
                'view_fee_structures', 'create_fee_structures', 'edit_fee_structures', 'delete_fee_structures',
                'view_fee_fine_policies', 'create_fee_fine_policies', 'edit_fee_fine_policies', 'delete_fee_fine_policies',
                'view_student_fees', 'create_student_fees', 'edit_student_fees', 'delete_student_fees',
                'pay_student_fees', 'split_student_fees', 'apply_fines',
                'view_fee_receipts', 'create_fee_receipts', 'print_fee_receipts', 'delete_fee_receipts', 'manage_fee_receipts',
            ],

            'extra_income' => [
                'view_income_categories', 'create_income_categories', 'edit_income_categories', 'delete_income_categories',
                'view_extra_incomes', 'create_extra_incomes', 'edit_extra_incomes', 'delete_extra_incomes',
            ],
            
            'reports' => ['view_admission_reports', 'view_fee_reports']
        ];

        // Create Permissions
        foreach ($permissions as $module => $modulePermissions) {
            foreach ($modulePermissions as $permissionName) {
                Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
            }
        }
    }
}
