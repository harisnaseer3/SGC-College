<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('suspense_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campus_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('campus_bank_account_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('deposit_date');
            $table->string('reference_number')->nullable();
            $table->enum('status', ['PENDING', 'RECONCILED'])->default('PENDING');
            $table->foreignId('reconciled_payment_id')->nullable()->constrained('fee_payments')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('suspense_entries');
    }
};
