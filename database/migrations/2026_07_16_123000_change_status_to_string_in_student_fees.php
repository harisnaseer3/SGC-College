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
        Schema::table('student_fees', function (Blueprint $blueprint) {
            $blueprint->string('status', 30)->default('unpaid')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_fees', function (Blueprint $blueprint) {
            $blueprint->enum('status', ['unpaid', 'partial', 'paid'])->default('unpaid')->change();
        });
    }
};
