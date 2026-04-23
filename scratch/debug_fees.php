<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

use App\Models\Student;
use App\Models\FeeStructure;

$student = Student::first();
echo "Sample Student: " . ($student ? $student->first_name . " (Status: " . $student->status . ", Campus: " . $student->campus_id . ", Program: " . $student->program_id . ", Batch: " . $student->academic_batch_id . ")" : "None") . "\n";

$structures = FeeStructure::all();
echo "Total Fee Structures: " . $structures->count() . "\n";
foreach ($structures as $s) {
    echo "- Name: " . $s->name . " (Campus: " . $s->campus_id . ", Program: " . ($s->program_id ?? 'All') . ", Batch: " . ($s->academic_batch_id ?? 'All') . ")\n";
}
