<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\StudentFee;
use Carbon\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        // Consolidate existing monthly student fees into semester-wise fees
        $fees = StudentFee::all();

        // Group by student_id, fee_head_id, and semester (July-Dec vs Jan-June)
        $grouped = $fees->groupBy(function ($fee) {
            $date = Carbon::parse($fee->due_date);
            $semester = $date->month >= 7 ? '1' : '2';
            return "{$fee->student_id}-{$fee->fee_head_id}-{$date->year}-{$semester}";
        });

        foreach ($grouped as $key => $group) {
            if ($group->count() > 1) {
                // Determine target due date: July 10 or Jan 10 of that year
                $firstFee = $group->first();
                $date = Carbon::parse($firstFee->due_date);
                $targetMonth = $date->month >= 7 ? 7 : 1;
                $targetDueDate = Carbon::createFromDate($date->year, $targetMonth, 10)->toDateString();

                // Sum up fields
                $totalAmount = $group->sum('amount');
                $totalFine = $group->sum('fine_amount');
                $totalDiscount = $group->sum('discount_amount');
                $totalPaid = $group->sum('paid_amount');

                // Keep the first record, update it, and delete the rest
                $keep = $group->shift();
                
                $keep->amount = $totalAmount;
                $keep->fine_amount = $totalFine;
                $keep->discount_amount = $totalDiscount;
                $keep->paid_amount = $totalPaid;
                $keep->due_date = $targetDueDate;
                $keep->save(); // saving boot event will automatically recalculate balance and status!

                // Delete remaining in the group
                foreach ($group as $item) {
                    $item->delete();
                }
            } else {
                // If only one record exists in that semester, update its due date to the semester's standard due date
                $fee = $group->first();
                $date = Carbon::parse($fee->due_date);
                $targetMonth = $date->month >= 7 ? 7 : 1;
                $targetDueDate = Carbon::createFromDate($date->year, $targetMonth, 10)->toDateString();
                if ($fee->due_date->toDateString() !== $targetDueDate) {
                    $fee->due_date = $targetDueDate;
                    $fee->save();
                }
            }
        }
    }

    public function down(): void
    {
        // Cannot cleanly reverse consolidation back into monthly fees
    }
};
