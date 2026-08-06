<?php

namespace App\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

trait CompressesImages
{
    /**
     * Compress image uploads (JPEG/PNG/WEBP) or store PDFs directly.
     *
     * @param UploadedFile $file
     * @param string $directory Directory inside storage/app/public (e.g. 'receipts', 'logos')
     * @param int $maxDimension Maximum width/height in pixels (default: 1600)
     * @param int $quality JPEG quality percentage (default: 75)
     * @return string Relative path stored in public disk (e.g. 'receipts/filename.jpg')
     */
    public function compressAndStoreFile(UploadedFile $file, string $directory = 'attachments', int $maxDimension = 1600, int $quality = 75): string
    {
        $extension = strtolower($file->getClientOriginalExtension());

        // Non-image files like PDF/DOCX are stored directly
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
            return $file->store($directory, 'public');
        }

        $filename = $directory . '/' . time() . '_' . Str::random(8) . '.jpg';
        $fullDestinationPath = storage_path('app/public/' . $filename);

        // Ensure target directory exists inside storage/app/public
        $targetDir = storage_path('app/public/' . $directory);
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        try {
            $imageContent = file_get_contents($file->getRealPath());
            $srcImage = @imagecreatefromstring($imageContent);

            if (!$srcImage) {
                return $file->store($directory, 'public');
            }

            $origWidth = imagesx($srcImage);
            $origHeight = imagesy($srcImage);

            if ($origWidth > $maxDimension || $origHeight > $maxDimension) {
                if ($origWidth > $origHeight) {
                    $newWidth = $maxDimension;
                    $newHeight = (int)round(($origHeight / $origWidth) * $maxDimension);
                } else {
                    $newHeight = $maxDimension;
                    $newWidth = (int)round(($origWidth / $origHeight) * $maxDimension);
                }
            } else {
                $newWidth = $origWidth;
                $newHeight = $origHeight;
            }

            $dstImage = imagecreatetruecolor($newWidth, $newHeight);

            // Fill white background for transparent PNGs
            $white = imagecolorallocate($dstImage, 255, 255, 255);
            imagefill($dstImage, 0, 0, $white);

            imagecopyresampled($dstImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

            // Save compressed JPEG
            imagejpeg($dstImage, $fullDestinationPath, $quality);

            imagedestroy($srcImage);
            imagedestroy($dstImage);

            return $filename;
        } catch (\Exception $e) {
            Log::warning("System-wide image compression failed for file {$file->getClientOriginalName()}, storing uncompressed file: " . $e->getMessage());
            return $file->store($directory, 'public');
        }
    }
}
