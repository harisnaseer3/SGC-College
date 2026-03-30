<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('student_cnic')->nullable()->after('admission_number');
            $table->string('gender')->nullable()->after('last_name'); // Male, Female, Other
            $table->integer('roll_number')->nullable()->after('admission_number');
            $table->boolean('is_transfer')->default(false)->after('intake_session');
            $table->string('religion')->nullable()->after('address');
            $table->string('student_picture')->nullable()->after('religion');
            $table->string('guardian_cnic')->nullable()->after('guardian_name');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'student_cnic',
                'gender',
                'roll_number',
                'is_transfer',
                'religion',
                'student_picture',
                'guardian_cnic',
            ]);
        });
    }
};
