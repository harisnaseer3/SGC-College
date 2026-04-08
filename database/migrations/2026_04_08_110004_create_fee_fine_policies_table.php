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
        Schema::create('fee_fine_policies', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('organization_id');
            $blueprint->unsignedBigInteger('campus_id');
            $blueprint->unsignedBigInteger('fee_head_id');
            $blueprint->integer('grace_days')->default(0);
            $blueprint->decimal('fine_amount', 15, 2);
            $blueprint->enum('fine_type', ['fixed', 'percentage'])->default('fixed');
            $blueprint->timestamps();

            $blueprint->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $blueprint->foreign('campus_id')->references('id')->on('campuses')->onDelete('cascade');
            $blueprint->foreign('fee_head_id')->references('id')->on('fee_heads')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fee_fine_policies');
    }
};
