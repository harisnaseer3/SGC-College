<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Http\Request;
use App\Models\Backup;
use App\Services\BackupService;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends BaseController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_backups|manage_backups', only: ['index']),
            new Middleware('permission:create_backups|manage_backups', only: ['store', 'upload']),
            new Middleware('permission:download_backups|manage_backups', only: ['download']),
            new Middleware('permission:restore_backups|manage_backups', only: ['restore']),
            new Middleware('permission:delete_backups|manage_backups', only: ['destroy']),
        ];
    }

    protected $backupService;

    public function __construct(BackupService $backupService)
    {
        $this->backupService = $backupService;
    }

    public function index()
    {
        try {
            $backups = Backup::with('creator:id,name')
                ->latest()
                ->get()
                ->map(function ($backup) {
                    $backup->size_human = $this->formatBytes($backup->size);
                    return $backup;
                });

            return $this->sendResponse($backups, 'Backup history retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve backups.', ['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:full,incremental'
        ]);

        try {
            // For production, this should ideally be queued.
            // But we'll run it synchronously for immediate feedback.
            $backup = $this->backupService->createBackup($request->type, auth()->id());
            
            $backup->load('creator:id,name');
            $backup->size_human = $this->formatBytes($backup->size);

            return $this->sendResponse($backup, 'Backup created successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Backup generation failed.', ['error' => $e->getMessage()], 500);
        }
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:zip|max:512000', // max 500MB
        ]);

        try {
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            // Prefix to avoid conflicts
            $fileName = 'uploaded_' . time() . '_' . $originalName;
            
            // Move file to backups folder
            $file->storeAs('backups', $fileName);

            $backup = Backup::create([
                'name' => $fileName,
                'type' => 'full', // assume full for uploaded
                'size' => $file->getSize(),
                'file_path' => "backups/{$fileName}",
                'created_by' => auth()->id(),
                'status' => 'completed',
            ]);

            $backup->load('creator:id,name');
            $backup->size_human = $this->formatBytes($backup->size);

            return $this->sendResponse($backup, 'Backup uploaded successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to upload backup.', ['error' => $e->getMessage()], 500);
        }
    }

    public function download($id)
    {
        try {
            $backup = Backup::findOrFail($id);

            if ($backup->status !== 'completed') {
                return $this->sendError('Backup is not ready for download.', [], 400);
            }

            $path = storage_path('app/' . $backup->file_path);

            if (!file_exists($path)) {
                return $this->sendError('Backup file not found on disk.', [], 404);
            }

            return response()->download($path);
        } catch (\Exception $e) {
            return $this->sendError('Failed to download backup.', ['error' => $e->getMessage()], 500);
        }
    }

    public function restore($id)
    {
        try {
            $backup = Backup::findOrFail($id);

            if ($backup->status !== 'completed') {
                return $this->sendError('Cannot restore from an incomplete backup.', [], 400);
            }

            $this->backupService->restoreBackup($backup);

            return $this->sendResponse([], 'System restored successfully from backup.');
        } catch (\Exception $e) {
            return $this->sendError('System restoration failed.', ['error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $backup = Backup::findOrFail($id);

            $path = storage_path('app/' . $backup->file_path);
            if (file_exists($path)) {
                unlink($path);
            }

            $backup->delete();

            return $this->sendResponse([], 'Backup deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete backup.', ['error' => $e->getMessage()], 500);
        }
    }

    protected function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= (1 << (10 * $pow));

        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
