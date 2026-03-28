<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Academic\StoreProgramRequest;
use App\Models\Program;
use App\Models\ProgramSemester;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ProgramController extends BaseController
{
    public function index(): JsonResponse
    {
        try {
            $programs = Program::with('campus')->latest()->get();
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
            $program = Program::create($data);

            // Automatically create semesters for the program
            for ($i = 1; $i <= $program->total_semesters; $i++) {
                ProgramSemester::create([
                    'program_id' => $program->id,
                    'semester_number' => $i,
                    'name' => "Semester $i"
                ]);
            }

            DB::commit();
            return $this->sendResponse($program->load('semesters'), 'Program created successfully with semesters.', 201);
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
            $program->update($request->validated());
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

            return $this->sendResponse($semester->load('courses'), 'Courses assigned to semester successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to assign courses.', ['error' => $e->getMessage()], 500);
        }
    }
}
