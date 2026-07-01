<?php

namespace App\Services;

use App\Models\Backup;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use ZipArchive;
use Exception;

class BackupService
{
    /**
     * Create a new backup record and start the backup process.
     */
    public function createBackup($type, $userId)
    {
        $date = now()->format('Y-m-d_H-i-s');
        $fileName = "backup_{$type}_{$date}.zip";

        $backup = Backup::create([
            'name' => $fileName,
            'type' => $type,
            'created_by' => $userId,
            'status' => 'pending',
            'file_path' => "backups/{$fileName}"
        ]);

        try {
            $this->generateBackup($backup);
            return $backup;
        } catch (Exception $e) {
            $backup->update(['status' => 'failed']);
            Log::error("Backup failed: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Generate the actual backup file.
     */
    protected function generateBackup(Backup $backup)
    {
        $backupDir = storage_path('app/backups');
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $tempSqlFile = $backupDir . '/' . str_replace('.zip', '.sql', $backup->name);
        $zipFilePath = $backupDir . '/' . $backup->name;

        // 1. Dump Database
        $this->dumpDatabase($tempSqlFile);

        // 2. Create Zip
        $zip = new ZipArchive();
        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            
            // Add the SQL dump to the zip
            $zip->addFile($tempSqlFile, basename($tempSqlFile));

            // Determine if we need to filter by modification date for incremental
            $lastBackupDate = null;
            if ($backup->type === 'incremental') {
                $lastBackup = Backup::where('status', 'completed')
                    ->where('id', '!=', $backup->id)
                    ->latest()
                    ->first();
                if ($lastBackup) {
                    $lastBackupDate = $lastBackup->created_at->timestamp;
                }
            }

            // Add public storage files
            $publicStoragePath = storage_path('app/public');
            if (is_dir($publicStoragePath)) {
                $files = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($publicStoragePath),
                    \RecursiveIteratorIterator::LEAVES_ONLY
                );

                foreach ($files as $name => $file) {
                    if (!$file->isDir()) {
                        $filePath = $file->getRealPath();
                        
                        // For incremental, skip files older than last backup
                        if ($backup->type === 'incremental' && $lastBackupDate) {
                            if ($file->getMTime() < $lastBackupDate) {
                                continue;
                            }
                        }

                        $relativePath = 'storage/app/public/' . substr($filePath, strlen($publicStoragePath) + 1);
                        $zip->addFile($filePath, $relativePath);
                    }
                }
            }

            $zip->close();
        } else {
            throw new Exception("Could not create ZIP archive at {$zipFilePath}");
        }

        // Clean up temp SQL file
        if (file_exists($tempSqlFile)) {
            unlink($tempSqlFile);
        }

        // Update DB record
        $backup->update([
            'status' => 'completed',
            'size' => filesize($zipFilePath)
        ]);
    }

    /**
     * Dump the MySQL database to a file.
     */
    protected function dumpDatabase($outputPath)
    {
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port');
        $username = config('database.connections.mysql.username');
        $password = config('database.connections.mysql.password');
        $database = config('database.connections.mysql.database');

        $mysqldumpPath = 'C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin\\mysqldump.exe'; 
        if (!file_exists($mysqldumpPath)) {
            $mysqldumpPath = 'mysqldump'; // Fallback to PATH
        }

        $command = sprintf(
            '"%s" --host="%s" --port="%s" --user="%s" --password="%s" "%s" > "%s"',
            $mysqldumpPath,
            $host,
            $port,
            $username,
            $password,
            $database,
            $outputPath
        );

        // If no password is set
        if (empty($password)) {
            $command = sprintf(
                '"%s" --host="%s" --port="%s" --user="%s" "%s" > "%s"',
                $mysqldumpPath,
                $host,
                $port,
                $username,
                $database,
                $outputPath
            );
        }

        // Add 2>&1 to capture errors
        $command .= ' 2>&1';

        exec($command, $output, $returnVar);

        if ($returnVar !== 0) {
            throw new Exception("Database dump failed: " . implode("\n", $output));
        }
    }

    /**
     * Restore a backup.
     */
    public function restoreBackup(Backup $backup)
    {
        $zipFilePath = storage_path('app/' . $backup->file_path);
        if (!file_exists($zipFilePath)) {
            throw new Exception("Backup file not found.");
        }

        $extractPath = storage_path('app/backups/temp_restore_' . time());
        if (!is_dir($extractPath)) {
            mkdir($extractPath, 0755, true);
        }

        $zip = new ZipArchive();
        if ($zip->open($zipFilePath) === true) {
            $zip->extractTo($extractPath);
            $zip->close();
        } else {
            throw new Exception("Failed to open ZIP archive.");
        }

        // 1. Restore Database
        $sqlFiles = glob($extractPath . '/*.sql');
        if (empty($sqlFiles)) {
            $this->cleanUp($extractPath);
            throw new Exception("No SQL file found in backup.");
        }
        $sqlFile = $sqlFiles[0];

        $this->loadDatabase($sqlFile);

        // 2. Restore Files (Only if they exist in the backup)
        $backupPublicStorage = $extractPath . '/storage/app/public';
        if (is_dir($backupPublicStorage)) {
            $currentPublicStorage = storage_path('app/public');
            
            // For full backups, we could optionally clear the current directory first.
            // But usually safely copying over works well.
            $this->recursiveCopy($backupPublicStorage, $currentPublicStorage);
        }

        $this->cleanUp($extractPath);
    }

    protected function loadDatabase($sqlFilePath)
    {
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port');
        $username = config('database.connections.mysql.username');
        $password = config('database.connections.mysql.password');
        $database = config('database.connections.mysql.database');

        $mysqlPath = 'C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin\\mysql.exe';
        if (!file_exists($mysqlPath)) {
            $mysqlPath = 'mysql';
        }

        $command = sprintf(
            '"%s" --host="%s" --port="%s" --user="%s" --password="%s" "%s" < "%s"',
            $mysqlPath,
            $host,
            $port,
            $username,
            $password,
            $database,
            $sqlFilePath
        );

        if (empty($password)) {
            $command = sprintf(
                '"%s" --host="%s" --port="%s" --user="%s" "%s" < "%s"',
                $mysqlPath,
                $host,
                $port,
                $username,
                $database,
                $sqlFilePath
            );
        }
        
        $command .= ' 2>&1';

        exec($command, $output, $returnVar);

        if ($returnVar !== 0) {
            throw new Exception("Database restore failed: " . implode("\n", $output));
        }
    }

    protected function recursiveCopy($src, $dst)
    {
        $dir = opendir($src);
        if (!is_dir($dst)) {
            mkdir($dst, 0755, true);
        }
        while (false !== ($file = readdir($dir))) {
            if (($file != '.') && ($file != '..')) {
                if (is_dir($src . '/' . $file)) {
                    $this->recursiveCopy($src . '/' . $file, $dst . '/' . $file);
                } else {
                    copy($src . '/' . $file, $dst . '/' . $file);
                }
            }
        }
        closedir($dir);
    }

    protected function cleanUp($dir)
    {
        if (!is_dir($dir)) {
            return;
        }
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            (is_dir("$dir/$file")) ? $this->cleanUp("$dir/$file") : unlink("$dir/$file");
        }
        rmdir($dir);
    }
}
