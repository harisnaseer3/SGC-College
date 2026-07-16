<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use App\Models\GeneratedVoucher;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            // Find students who have multiple vouchers
            $studentsWithMultiple = GeneratedVoucher::select('student_id')
                ->groupBy('student_id')
                ->havingRaw('COUNT(*) > 1')
                ->pluck('student_id');

            foreach ($studentsWithMultiple as $studentId) {
                // Get all vouchers for this student sorted by semester number
                $vouchers = GeneratedVoucher::where('student_id', $studentId)
                    ->orderBy('semester_number', 'asc')
                    ->get();

                // All vouchers except the latest one should be marked carried_forward if they are unpaid or partial
                $totalCount = $vouchers->count();
                for ($i = 0; $i < $totalCount - 1; $i++) {
                    $voucher = $vouchers[$i];
                    if (in_array($voucher->status, ['unpaid', 'partial'])) {
                        $voucher->status = 'carried_forward';
                        $voucher->save();
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error("Failed to mark older vouchers carried_forward: " . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
