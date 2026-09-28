<?php
$models = ['User', 'Campus', 'Organization', 'Program', 'ProgramSemester', 'Course', 'AcademicBatch', 'AcademicClass', 'Section', 'FeeHead', 'FeeStructure', 'FeeStructureItem', 'FeeFinePolicy', 'StudentFee', 'GeneratedVoucher', 'FeePayment', 'SuspenseEntry', 'IncomeCategory', 'ExtraIncome', 'ExpenseCategory', 'Expense', 'CampusBankAccount'];

foreach ($models as $model) {
    $path = __DIR__ . "/app/Models/{$model}.php";
    if (file_exists($path)) {
        $content = file_get_contents($path);
        
        // Skip if it already uses it
        if (strpos($content, 'use SoftDeletes;') !== false || strpos($content, 'use \Illuminate\Database\Eloquent\SoftDeletes;') !== false) {
            echo "Skipping $model (already has soft deletes)\n";
            continue;
        }

        // 1. Add import statement
        if (strpos($content, 'use Illuminate\Database\Eloquent\SoftDeletes;') === false) {
             $content = preg_replace('/(namespace App\\\\Models;)/', "$1\n\nuse Illuminate\Database\Eloquent\SoftDeletes;", $content);
        }
        
        // 2. Add use statement inside the class block
        // Find the beginning of the class body (i.e. 'class X extends Y {')
        // We'll use a regex to match 'class $model ... {' and insert 'use SoftDeletes;' right after it.
        $pattern = '/(class\s+'.$model.'\s+extends\s+\w+\s*(?:implements\s+[^{]+)?\s*\{)(?!\s*use\s+SoftDeletes;)/mi';
        
        $newContent = preg_replace($pattern, "$1\n    use SoftDeletes;\n", $content);
        
        if ($newContent !== $content) {
            file_put_contents($path, $newContent);
            echo "Successfully updated $model\n";
        } else {
            echo "Failed to match class body block in $model\n";
        }
    } else {
        echo "File not found: $model\n";
    }
}
echo "Done.";
