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
        $tables = [
            'users', 
            'campuses', 
            'organizations', 
            'programs', 
            'program_semesters', 
            'courses', 
            'academic_batches', 
            'academic_classes', 
            'sections', 
            'fee_heads', 
            'fee_structures', 
            'fee_structure_items', 
            'fee_fine_policies', 
            'student_fees', 
            'generated_vouchers', 
            'fee_payments', 
            'suspense_entries', 
            'income_categories', 
            'extra_incomes', 
            'expense_categories', 
            'expenses', 
            'campus_bank_accounts'
        ];

        foreach ($tables as $t) {
            // Check to avoid errors if column already exists or table doesn't exist
            if (Schema::hasTable($t) && !Schema::hasColumn($t, 'deleted_at')) {
                Schema::table($t, function (Blueprint $table) {
                    $table->softDeletes();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'users', 'campuses', 'organizations', 'programs', 'program_semesters', 'courses', 'academic_batches', 'academic_classes', 'sections', 'fee_heads', 'fee_structures', 'fee_structure_items', 'fee_fine_policies', 'student_fees', 'generated_vouchers', 'fee_payments', 'suspense_entries', 'income_categories', 'extra_incomes', 'expense_categories', 'expenses', 'campus_bank_accounts'
        ];

        foreach ($tables as $t) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, 'deleted_at')) {
                Schema::table($t, function (Blueprint $table) {
                    $table->dropSoftDeletes();
                });
            }
        }
    }
};
