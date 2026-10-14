<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Academic\StoreProgramRequest;
use App\Models\Program;
use App\Models\ProgramSemester;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProgramController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_programs', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_programs', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_programs', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_programs', only: ['destroy', 'bulkDelete']),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
            if ($request->query('all')) {
                $programs = Program::with('campus')->latest()->get();
                return $this->sendResponse($programs, 'Programs retrieved successfully.');
            }
            $programs = Program::with('campus')->latest()->paginate(request('per_page', 10));
            return $this->sendResponse($programs, 'Programs retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve programs.', ['error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreProgramRequest $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $data = $request->validated();
            
            // Sync duration_value/duration_unit and duration_years
            if (!isset($data['duration_unit']) || empty($data['duration_unit'])) {
                $data['duration_unit'] = 'years';
            }
            if (!isset($data['duration_value']) || empty($data['duration_value'])) {
                $data['duration_value'] = $data['duration_years'] ?? 1;
            }
            if (!isset($data['duration_years'])) {
                if ($data['duration_unit'] === 'years') {
                    $data['duration_years'] = (int)$data['duration_value'];
                } elseif ($data['duration_unit'] === 'months') {
                    $data['duration_years'] = (int)ceil($data['duration_value'] / 12);
                } else { // weeks
                    $data['duration_years'] = (int)ceil($data['duration_value'] / 52);
                }
            }

            // Safe fallback if column has not been migrated yet
            if (!Schema::hasColumn('programs', 'requires_batch')) {
                unset($data['requires_batch']);
            }

            $program = Program::create($data);

            $termPrefix = match($program->structure_type) {
                'monthly' => 'Month',
                'weekly' => 'Week',
                'annual' => 'Year',
                default => 'Semester'
            };

            // Automatically create terms/semesters for the program
            for ($i = 1; $i <= $program->total_semesters; $i++) {
                ProgramSemester::create([
                    'program_id' => $program->id,
                    'semester_number' => $i,
                    'name' => "$termPrefix $i"
                ]);
            }

            DB::commit();
            return $this->sendResponse($program->load('semesters'), 'Program created successfully.', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create program.', ['error' => $e->getMessage()], 500);
        }
    }

    public function show(Program $program): JsonResponse
    {
        return $this->sendResponse($program->load(['semesters.courses', 'campus']), 'Program retrieved successfully.');
    }

    public function update(StoreProgramRequest $request, Program $program): JsonResponse
    {
        try {
            $data = $request->validated();

            if (isset($data['duration_unit']) && isset($data['duration_value'])) {
                if ($data['duration_unit'] === 'years') {
                    $data['duration_years'] = (int)$data['duration_value'];
                } elseif ($data['duration_unit'] === 'months') {
                    $data['duration_years'] = (int)ceil($data['duration_value'] / 12);
                } else { // weeks
                    $data['duration_years'] = (int)ceil($data['duration_value'] / 52);
                }
            }

            // Safe fallback if column has not been migrated yet
            if (!Schema::hasColumn('programs', 'requires_batch')) {
                unset($data['requires_batch']);
            }

            $program->update($data);
            return $this->sendResponse($program, 'Program updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update program.', ['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Program $program): JsonResponse
    {
        try {
            $program->delete();
            return $this->sendResponse(null, 'Program deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete program.', ['error' => $e->getMessage()], 500);
        }
    }

    public function assignCourses(\Illuminate\Http\Request $request, Program $program, ProgramSemester $semester): JsonResponse
    {
        try {
            $request->validate([
                'course_ids' => 'required|array',
                'course_ids.*' => 'exists:courses,id'
            ]);

            $semester->courses()->sync($request->course_ids);
            return $this->sendResponse($semester->load('courses'), 'Courses assigned successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to assign courses.', ['error' => $e->getMessage()], 500);
        }
    }
}
