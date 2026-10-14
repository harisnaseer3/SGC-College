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
        Schema::table('programs', function (Blueprint $table) {
            $table->unsignedInteger('duration_value')->nullable()->after('duration_years');
            $table->string('duration_unit', 20)->default('years')->after('duration_value'); // weeks, months, years
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->dropColumn(['duration_value', 'duration_unit']);
        });
    }
};
