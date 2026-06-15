<?php

namespace App\Http\Controllers\Api;

use App\Models\Student;
use App\Models\StudentStatusLog;
use App\Http\Requests\Api\Admission\StoreStudentStatusRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Services\FeeService;

class StudentStatusController extends BaseController
{
    protected $feeService;

    public function __construct(FeeService $feeService)
    {
        $this->feeService = $feeService;
    }

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

            if ($student->status === 'Enrolled') {
                $this->feeService->assignInitialFees($student);
            }

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
     * Bulk update status for multiple students.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkStatus(Request $request): JsonResponse
    {
        $request->validate([
            'student_ids'      => 'required|array|min:1',
            'student_ids.*'    => 'integer|exists:students,id',
            'status'           => 'required|string|in:Enrolled,Struck Off,Passed Out,Promoted,Transferred,Active,Pending',
            'action_date'      => 'required|date',
            'remarks'          => 'nullable|string|max:1000',
            'target_campus_id' => 'nullable|integer|exists:campuses,id',
        ]);

        $results   = ['succeeded' => [], 'failed' => []];
        $status    = $request->status;
        $actionDate   = $request->action_date;
        $remarks   = $request->remarks ?? '';
        $targetCampusId = $request->target_campus_id;

        foreach ($request->student_ids as $studentId) {
            DB::beginTransaction();
            try {
                $student  = Student::with('programSemester')->findOrFail($studentId);
                $metadata = [];

                // Promotion: advance semester
                if ($status === 'Promoted') {
                    $currentSemester = $student->programSemester;
                    if (!$currentSemester) {
                        throw new \Exception('No semester assigned.');
                    }
                    $nextSemester = \App\Models\ProgramSemester::where('program_id', $student->program_id)
                        ->where('semester_number', $currentSemester->semester_number + 1)
                        ->first();
                    if (!$nextSemester) {
                        throw new \Exception("Already in final semester ({$currentSemester->semester_number}).");
                    }
                    $student->update(['program_semester_id' => $nextSemester->id]);
                    $metadata['previous_semester_id'] = $currentSemester->id;
                    $metadata['next_semester_id']     = $nextSemester->id;
                }

                // Transfer: move campus
                if ($status === 'Transferred' && $targetCampusId) {
                    $metadata['previous_campus_id'] = $student->campus_id;
                    $student->update(['campus_id' => $targetCampusId]);
                }

                // Log history
                StudentStatusLog::create([
                    'student_id'  => $student->id,
                    'status'      => $status,
                    'action_date' => $actionDate,
                    'remarks'     => $remarks,
                    'metadata'    => $metadata,
                    'created_by'  => Auth::id(),
                ]);

                // Update student status
                $student->update(['status' => $status]);

                if ($status === 'Enrolled') {
                    $this->feeService->assignInitialFees($student);
                }

                DB::commit();
                $results['succeeded'][] = $student->id;
            } catch (\Exception $e) {
                DB::rollBack();
                $results['failed'][] = [
                    'student_id' => $studentId,
                    'reason'     => $e->getMessage(),
                ];
            }
        }

        $total     = count($request->student_ids);
        $succeeded = count($results['succeeded']);
        $failed    = count($results['failed']);

        return $this->sendResponse(
            $results,
            "{$succeeded} of {$total} students updated successfully." . ($failed ? " {$failed} failed." : '')
        );
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
