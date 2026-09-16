<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;
use Exception;

class CreateBackupCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'backup:create {--type=full : Type of backup (full or incremental)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate an automated system backup (database & storage files)';

    /**
     * Execute the console command.
     */
    public function handle(BackupService $backupService)
    {
        $type = $this->option('type') ?: 'full';
        $this->info("Starting {$type} system backup...");

        try {
            // Null userId represents automated system cron
            $backup = $backupService->createBackup($type, null);
            $this->info("Backup created successfully: {$backup->name}");
            return Command::SUCCESS;
        } catch (Exception $e) {
            $this->error("Backup creation failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
