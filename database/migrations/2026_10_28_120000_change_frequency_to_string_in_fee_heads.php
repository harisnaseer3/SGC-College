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
        Schema::table('fee_heads', function (Blueprint $blueprint) {
            $blueprint->string('frequency', 30)->default('monthly')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fee_heads', function (Blueprint $blueprint) {
            $blueprint->enum('frequency', ['one_time', 'monthly', 'semester'])->default('monthly')->change();
        });
    }
};
