<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Implicitly grant "Super Admin" role all permissions
        // This works in the app by using gate-related functions like auth()->user->can() and @can()
        Gate::before(function ($user, $ability) {
            return $user->hasRole('super_admin') ? true : null;
        });

        // Ensure requires_batch exists and short courses are marked as rolling
        try {
            if (Schema::hasTable('programs')) {
                if (!Schema::hasColumn('programs', 'requires_batch')) {
                    Schema::table('programs', function ($table) {
                        $table->boolean('requires_batch')->default(true)->after('structure_type');
                    });
                }
                
                // Set short courses (duration in weeks or months <= 6) to requires_batch = false
                DB::table('programs')
                    ->where(function ($query) {
                        $query->whereIn('duration_unit', ['weeks', 'months'])
                              ->where(function ($sub) {
                                  $sub->where('duration_value', '<=', 6)
                                      ->orWhere('total_semesters', '<=', 6);
                              });
                    })
                    ->where(function ($q) {
                        $q->whereNull('requires_batch')
                          ->orWhere('requires_batch', true);
                    })
                    ->where('name', 'not like', '%F.S.C%')
                    ->where('name', 'not like', '%FSc%')
                    ->where('name', 'not like', '%Degree%')
                    ->update(['requires_batch' => false]);

                // Ensure annual programs (like F.S.C, Matric, FA, ICS) have structure_type = 'annual'
                DB::table('programs')
                    ->where(function ($q) {
                        $q->where('name', 'like', '%F.S.C%')
                          ->orWhere('name', 'like', '%FSc%')
                          ->orWhere('name', 'like', '%Matric%')
                          ->orWhere('name', 'like', '%FA%')
                          ->orWhere('name', 'like', '%ICS%')
                          ->orWhere('name', 'like', '%I.Com%')
                          ->orWhere('name', 'like', '%Annual%');
                    })
                    ->where(function ($q) {
                        $q->whereNull('structure_type')
                          ->orWhere('structure_type', '!=', 'annual');
                    })
                    ->update(['structure_type' => 'annual']);

                // Ensure short courses have structure_type = 'monthly' or 'weekly'
                DB::table('programs')
                    ->where(function ($q) {
                        $q->where('duration_unit', 'months')
                          ->orWhere('name', 'like', '%web dev%')
                          ->orWhere('name', 'like', '%short course%')
                          ->orWhere('name', 'like', '%certificate%');
                    })
                    ->where('name', 'not like', '%F.S.C%')
                    ->where('name', 'not like', '%FSc%')
                    ->where('name', 'not like', '%Degree%')
                    ->where(function ($q) {
                        $q->whereNull('structure_type')
                          ->orWhere('structure_type', 'semester');
                    })
                    ->update(['structure_type' => 'monthly']);

                // Synchronize ProgramSemester names according to program structure_type
                if (Schema::hasTable('program_semesters')) {
                    $programsToSync = DB::table('programs')
                        ->whereIn('structure_type', ['annual', 'monthly', 'weekly'])
                        ->select('id', 'structure_type')
                        ->get();

                    foreach ($programsToSync as $prog) {
                        $prefix = match($prog->structure_type) {
                            'annual'  => 'Year',
                            'monthly' => 'Month',
                            'weekly'  => 'Week',
                            default   => 'Semester'
                        };

                        $sems = DB::table('program_semesters')
                            ->where('program_id', $prog->id)
                            ->get();

                        foreach ($sems as $sem) {
                            $expectedName = "{$prefix} {$sem->semester_number}";
                            if ($sem->name !== $expectedName && (str_starts_with($sem->name, 'Semester') || empty($sem->name))) {
                                DB::table('program_semesters')
                                    ->where('id', $sem->id)
                                    ->update(['name' => $expectedName]);
                            }
                        }
                    }
                }
            }

            // Auto-restore any soft-deleted GeneratedVoucher that has active student fees
            if (Schema::hasTable('generated_vouchers') && Schema::hasTable('student_fees')) {
                DB::table('generated_vouchers')
                    ->whereNotNull('deleted_at')
                    ->whereExists(function($q) {
                        $q->select(DB::raw(1))
                          ->from('student_fees')
                          ->whereColumn('student_fees.voucher_number', 'generated_vouchers.voucher_number');
                    })
                    ->update(['deleted_at' => null]);
            }
        } catch (\Throwable $e) {
            // Ignore during early setup
        }
    }
}
