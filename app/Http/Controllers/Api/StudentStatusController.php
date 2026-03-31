<?php

namespace App\Http\Controllers\Api;

use App\Models\Student;
use App\Models\StudentStatusLog;
use App\Http\Requests\Api\Admission\StoreStudentStatusRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class StudentStatusController extends BaseController
{
    /**
     * Store a new student status change in history and update the student record.
     *
     * @param StoreStudentStatusRequest $request
     * @param Student $student
     * @return JsonResponse
     */
    public function store(StoreStudentStatusRequest $request, Student $student): JsonResponse
    {
        try {
            DB::beginTransaction();

            $validated = $request->validated();
            $metadata = $validated['metadata'] ?? [];

            // 1. Handle Promotion Logic
            if ($validated['status'] === 'Promoted') {
                $currentSemester = $student->programSemester;
                if (!$currentSemester) {
                    throw new \Exception('Student does not have a current semester assigned.');
                }

                $nextSemester = \App\Models\ProgramSemester::where('program_id', $student->program_id)
                    ->where('semester_number', $currentSemester->semester_number + 1)
                    ->first();

                if (!$nextSemester) {
                    throw new \Exception("This student is already in the final semester ({$currentSemester->semester_number}) of their program.");
                }

                $student->update([
                    'program_semester_id' => $nextSemester->id
                ]);

                $metadata['previous_semester_id'] = $currentSemester->id;
                $metadata['next_semester_id'] = $nextSemester->id;
            }

            // 2. Handle Transfer Logic
            if ($validated['status'] === 'Transferred' && !empty($validated['target_campus_id'])) {
                $metadata['previous_campus_id'] = $student->campus_id;
                $student->update([
                    'campus_id' => $validated['target_campus_id']
                ]);
            }

            // 3. Create the History Log
            StudentStatusLog::create([
                'student_id'  => $student->id,
                'status'      => $validated['status'],
                'action_date' => $validated['action_date'],
                'remarks'     => $validated['remarks'],
                'metadata'    => $metadata,
                'created_by'  => Auth::id(),
            ]);

            // 4. Update the Student's current status (denormalized for performance)
            $student->update([
                'status' => $validated['status']
            ]);

            DB::commit();

            return $this->sendResponse(
                $student->load(['statusLogs', 'programSemester', 'campus']), 
                "Student successfully " . ($validated['status'] === 'Promoted' ? 'Promoted to ' . $student->programSemester->name : 'Updated to ' . $validated['status'])
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError(
                'Operation failed.', 
                ['error' => [$e->getMessage()]], 
                422
            );
        }
    }

    /**
     * Get status history for a specific student.
     *
     * @param Student $student
     * @return JsonResponse
     */
    public function index(Student $student): JsonResponse
    {
        try {
            $history = $student->statusLogs()->with('creator:id,name')->get();
            return $this->sendResponse($history, 'Status history retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to retrieve status history.', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }
}
