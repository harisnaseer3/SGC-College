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
        Schema::table('fee_heads', function (Blueprint $table) {
            // Drop the existing foreign key before modifying the column
            $table->dropForeign(['campus_id']);
            $table->unsignedBigInteger('campus_id')->nullable()->change();
            // Re-add as nullable FK
            $table->foreign('campus_id')->references('id')->on('campuses')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fee_heads', function (Blueprint $table) {
            $table->dropForeign(['campus_id']);
            $table->unsignedBigInteger('campus_id')->nullable(false)->change();
            $table->foreign('campus_id')->references('id')->on('campuses')->onDelete('cascade');
        });
    }
};
