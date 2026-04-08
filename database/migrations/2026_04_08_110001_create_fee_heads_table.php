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
        Schema::create('fee_heads', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('organization_id');
            $blueprint->unsignedBigInteger('campus_id');
            $blueprint->string('name');
            $blueprint->enum('frequency', ['one_time', 'monthly', 'semester'])->default('monthly');
            $blueprint->text('description')->nullable();
            $blueprint->timestamps();

            $blueprint->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $blueprint->foreign('campus_id')->references('id')->on('campuses')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fee_heads');
    }
};
