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
        Schema::table('extra_incomes', function (Blueprint $table) {
            $table->dropColumn('receipt_number');
            $table->string('form_number')->nullable()->after('payment_method');
            $table->foreignId('program_id')->nullable()->after('income_category_id')->constrained('programs')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('extra_incomes', function (Blueprint $table) {
            $table->dropForeign(['program_id']);
            $table->dropColumn('program_id');
            $table->dropColumn('form_number');
            $table->string('receipt_number')->nullable();
        });
    }
};
