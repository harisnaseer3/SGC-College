<?php

$modules = [
    'users' => \App\Models\User::class,
    'campuses' => \App\Models\Campus::class,
    'students' => \App\Models\Student::class,
]; // test sample

$queries = null;
foreach ($modules as $modName => $modClass) {
    if (!class_exists($modClass)) continue;
    $table = (new $modClass)->getTable();
    $q = \Illuminate\Support\Facades\DB::table($table)
        ->select('id', 'deleted_at', \Illuminate\Support\Facades\DB::raw("'$modName' as module_name"))
        ->whereNotNull('deleted_at');
        
    if (!$queries) {
        $queries = $q;
    } else {
        $queries->unionAll($q);
    }
}

try {
    $paginated = \Illuminate\Support\Facades\DB::table(\Illuminate\Support\Facades\DB::raw("({$queries->toSql()}) as combined_table"))
        ->mergeBindings($queries)
        ->orderBy('deleted_at', 'desc')
        ->paginate(10);
    
    echo "Pagination successful. Total items: " . $paginated->total() . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
