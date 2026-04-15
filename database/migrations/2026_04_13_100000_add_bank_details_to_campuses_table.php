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
        Schema::table('campuses', function (Blueprint $table) {
            $table->string('bank_name')->nullable()->after('status');
            $table->string('account_title')->nullable()->after('bank_name');
            $table->string('account_number')->nullable()->after('account_title');
            $table->string('branch_code')->nullable()->after('account_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campuses', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'account_title', 'account_number', 'branch_code']);
        });
    }
};
