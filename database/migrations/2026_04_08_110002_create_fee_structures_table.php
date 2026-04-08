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
        Schema::create('fee_structures', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('organization_id');
            $blueprint->unsignedBigInteger('campus_id');
            $blueprint->string('name')->nullable();
            $blueprint->unsignedBigInteger('program_id')->nullable();
            $blueprint->unsignedBigInteger('academic_batch_id')->nullable();
            $blueprint->timestamps();

            $blueprint->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $blueprint->foreign('campus_id')->references('id')->on('campuses')->onDelete('cascade');
            $blueprint->foreign('program_id')->references('id')->on('programs')->onDelete('set null');
            $blueprint->foreign('academic_batch_id')->references('id')->on('academic_batches')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fee_structures');
    }
};
