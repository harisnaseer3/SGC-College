<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->foreignId('program_id')->after('academic_class_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('program_semester_id')->after('program_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('academic_session_id')->after('program_semester_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['program_id']);
            $table->dropForeign(['program_semester_id']);
            $table->dropForeign(['academic_session_id']);
            $table->dropColumn(['program_id', 'program_semester_id', 'academic_session_id']);
        });
    }
};
