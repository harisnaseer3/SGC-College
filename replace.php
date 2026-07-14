<?php
$files = glob('c:/laragon/www/CollegeSGC/app/Http/Controllers/Api/*.php');
foreach ($files as $file) {
    $content = file_get_contents($file);
    if (preg_match('/paginate\([0-9]+\)/', $content)) {
        $content = preg_replace('/paginate\([0-9]+\)/', "paginate(request('per_page', 10))", $content);
        file_put_contents($file, $content);
        echo "Updated $file\n";
    }
}
echo "Done\n";
