<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$controller = new App\Http\Controllers\Api\PermissionController();
$res = json_decode(json_encode($controller->index()->getData()), true);
$data = $res['data'];

echo "MODULES IN PERMISSION API:\n";
foreach ($data as $module => $perms) {
    echo "Module: [{$module}]\n";
    foreach ($perms as $p) {
        echo "  - {$p['name']} ({$p['label']})\n";
    }
}
