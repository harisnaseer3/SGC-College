<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

try {
    $role = Role::where('name', 'super_admin')->first();
    $guard = $role ? $role->guard_name : 'api';
    
    $perm = Permission::firstOrCreate(['name' => 'manage_recycle_bin', 'guard_name' => $guard]);
    echo "Created permission: {$perm->name} for guard {$guard}\n";

    if ($role) {
        if (!$role->hasPermissionTo('manage_recycle_bin')) {
            $role->givePermissionTo('manage_recycle_bin');
            echo "Granted permission to super_admin.\n";
        } else {
            echo "super_admin already has the permission.\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
