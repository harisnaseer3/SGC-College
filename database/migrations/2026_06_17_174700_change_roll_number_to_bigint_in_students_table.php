<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Change roll_number from integer to bigInteger to support
     * large roll number formats like "24867910015" (11-digit numbers).
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->bigInteger('roll_number')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->integer('roll_number')->nullable()->change();
        });
    }
};
