<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

class PermissionController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_roles|manage_role_permissions', only: ['index']),
        ];
    }

    public function index(): JsonResponse
    {
        try {
            $permissions = Permission::all();
            
            // Group permissions naturally by the first word (like view_admissions -> view, but we want by module like Admissions)
            // It's better to group by the suffix if they follow {action}_{module} format.
            $grouped = [];
            foreach ($permissions as $permission) {
                // Split by first underscore to get action and module
                $parts = explode('_', $permission->name, 2);
                $module = isset($parts[1]) ? $parts[1] : 'general';
                
                // Exceptions where module name is compound
                if (in_array($module, ['fee_heads', 'fee_structures', 'fee_fine_policies', 'student_fees', 'admission_reports', 'fee_reports', 'income_categories', 'extra_incomes', 'academic_batches', 'role_permissions'])) {
                    // special handling if needed, they'll just group under 'student_fees' which is fine
                }
                
                // Map 'pay_student_fees' etc correctly
                if ($permission->name === 'pay_student_fees') $module = 'student_fees';
                if ($permission->name === 'split_student_fees') $module = 'student_fees';
                if ($permission->name === 'apply_fines') $module = 'student_fees';
                if ($permission->name === 'manage_role_permissions') $module = 'roles';
                if ($permission->name === 'change_admission_status') $module = 'admissions';
                if ($permission->name === 'import_admissions') $module = 'admissions';
                if ($permission->name === 'view_stats') $module = 'dashboard';

                if (!isset($grouped[$module])) {
                    $grouped[$module] = [];
                }
                
                $grouped[$module][] = [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'label' => ucwords(str_replace('_', ' ', $permission->name))
                ];
            }

            return $this->sendResponse($grouped, 'Permissions retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve permissions.', ['error' => $e->getMessage()], 500);
        }
    }
}
