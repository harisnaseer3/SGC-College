<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Student;

$students = Student::all();
echo "Total Students: " . $students->count() . "\n";
foreach ($students as $student) {
    echo "ID: {$student->id}, Name: {$student->first_name} {$student->last_name}, Date: {$student->admission_date}, Campus: {$student->campus_id}\n";
}
