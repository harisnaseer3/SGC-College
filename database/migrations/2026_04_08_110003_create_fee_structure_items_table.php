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
        Schema::create('fee_structure_items', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('fee_structure_id');
            $blueprint->unsignedBigInteger('fee_head_id');
            $blueprint->decimal('amount', 15, 2);
            $blueprint->timestamps();

            $blueprint->foreign('fee_structure_id')->references('id')->on('fee_structures')->onDelete('cascade');
            $blueprint->foreign('fee_head_id')->references('id')->on('fee_heads')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fee_structure_items');
    }
};
