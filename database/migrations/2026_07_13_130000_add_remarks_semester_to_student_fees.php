<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    public function up()
    {
        Schema::table('student_fees', function (Blueprint $table) {
            $table->string('remarks')->nullable()->after('voucher_number');
            $table->integer('semester_number')->nullable()->after('remarks');
        });

        // Seed existing data
        $fees = DB::table('student_fees')->get();
        foreach ($fees as $fee) {
            $student = DB::table('students')->where('id', $fee->student_id)->first();
            if ($student) {
                $semNumber = 1;
                if ($student->admission_date) {
                    $admissionDate = Carbon::parse($student->admission_date)->startOfMonth();
                    $startMonth = $admissionDate->month >= 7 ? 7 : 1;
                    $standardizedAdmission = $admissionDate->copy()->month($startMonth)->startOfMonth();
                    $targetDate = Carbon::parse($fee->due_date)->startOfMonth();

                    if ($targetDate->gte($standardizedAdmission)) {
                        $diffInMonths = $standardizedAdmission->diffInMonths($targetDate);
                        $semNumber = (int) floor($diffInMonths / 6) + 1;
                    }
                }
                DB::table('student_fees')->where('id', $fee->id)->update(['semester_number' => $semNumber]);
            }
        }
    }

    public function down()
    {
        Schema::table('student_fees', function (Blueprint $table) {
            $table->dropColumn(['remarks', 'semester_number']);
        });
    }
};
