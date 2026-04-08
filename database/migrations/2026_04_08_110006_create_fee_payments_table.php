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
        Schema::create('fee_payments', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('organization_id');
            $blueprint->unsignedBigInteger('campus_id');
            $blueprint->unsignedBigInteger('student_id');
            $blueprint->decimal('amount', 15, 2);
            $blueprint->string('payment_method')->default('Cash');
            $blueprint->string('transaction_id')->nullable();
            $blueprint->date('payment_date');
            $blueprint->string('receipt_number')->unique();
            $blueprint->unsignedBigInteger('received_by');
            $blueprint->timestamps();

            $blueprint->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $blueprint->foreign('campus_id')->references('id')->on('campuses')->onDelete('cascade');
            $blueprint->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $blueprint->foreign('received_by')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fee_payments');
    }
};
