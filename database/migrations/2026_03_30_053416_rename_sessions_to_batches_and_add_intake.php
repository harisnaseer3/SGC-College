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
        Schema::rename('academic_sessions', 'academic_batches');
        Schema::table('students', function (Blueprint $table) {
            $table->renameColumn('academic_session_id', 'academic_batch_id');
            $table->string('intake_session')->nullable()->after('academic_batch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('intake_session');
            $table->renameColumn('academic_batch_id', 'academic_session_id');
        });
        Schema::rename('academic_batches', 'academic_sessions');
    }
};
