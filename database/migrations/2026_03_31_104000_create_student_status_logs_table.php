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
        Schema::create('student_status_logs', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('student_id')->constrained()->onDelete('cascade');
            $blueprint->string('status'); // e.g. Struck Off, Passed Out, etc.
            $blueprint->date('action_date');
            $blueprint->text('remarks')->nullable();
            $blueprint->json('metadata')->nullable(); // For transfer destinations, etc.
            $blueprint->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $blueprint->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_status_logs');
    }
};
