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
        Schema::create('student_fees', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('organization_id');
            $blueprint->unsignedBigInteger('campus_id');
            $blueprint->unsignedBigInteger('student_id');
            $blueprint->unsignedBigInteger('fee_head_id');
            $blueprint->decimal('amount', 15, 2);
            $blueprint->decimal('discount_amount', 15, 2)->default(0);
            $blueprint->decimal('fine_amount', 15, 2)->default(0);
            $blueprint->decimal('paid_amount', 15, 2)->default(0);
            $blueprint->decimal('balance_amount', 15, 2);
            $blueprint->date('due_date');
            $blueprint->enum('status', ['unpaid', 'partial', 'paid'])->default('unpaid');
            $blueprint->timestamps();

            $blueprint->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $blueprint->foreign('campus_id')->references('id')->on('campuses')->onDelete('cascade');
            $blueprint->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $blueprint->foreign('fee_head_id')->references('id')->on('fee_heads')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_fees');
    }
};
