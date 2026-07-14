<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Models\AcademicClass;
use App\Models\Campus;
use App\Models\Section;
use App\Models\Student;
use App\Models\Program;
use App\Models\AcademicBatch;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Admission\StoreStudentRequest;
use App\Services\FeeService;

class AdmissionController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_admissions', only: ['index', 'show', 'getFormData']),
            new Middleware('permission:create_admissions', only: ['store']),
            new Middleware('permission:edit_admissions', only: ['update']),
            new Middleware('permission:delete_admissions', only: ['destroy', 'bulkDelete']),
        ];
    }

    protected $feeService;

    public function __construct(FeeService $feeService)
    {
        $this->feeService = $feeService;
    }

    public function index()
    {
        try {
            $students = Student::with(['campus', 'academicClass', 'section', 'program', 'programSemester', 'academicBatch'])->latest()->paginate(request('per_page', 10));
            return $this->sendResponse($students, 'Students retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve students.', ['error' => $e->getMessage()], 500);
        }
    }

    public function getFormData()
    {
        try {
            $user = auth()->user();
            $orgId = $user->organization_id;
            if ($user->hasRole('super_admin')) {
                $orgId = request()->header('X-Organization-ID');
            }

            $nextAdmissionNumber = 1001;
            if ($orgId) {
                $max = Student::withoutGlobalScopes()
                    ->where('organization_id', $orgId)
                    ->max(\DB::raw('CAST(admission_number AS UNSIGNED)'));
                $nextAdmissionNumber = $max ? $max + 1 : 1001;
            }

            return $this->sendResponse([
                'campuses' => Campus::all(),
                'classes' => AcademicClass::all(),
                'sections' => Section::all(),
                'programs' => Program::with('semesters')->get(),
                'batches' => AcademicBatch::all(),
                'next_admission_number' => null,
            ], 'Form data retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve form data.', ['error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreStudentRequest $request)
    {
        try {
            $data = $request->validated();

            if ($request->hasFile('student_picture')) {
                $path = $request->file('student_picture')->store('students/pictures', 'public');
                $data['student_picture'] = $path;
            }

            if ($request->hasFile('attachments')) {
                $attachments = [];
                foreach ($request->file('attachments') as $file) {
                    $attachments[] = $file->store('students/attachments', 'public');
                }
                $data['attachments'] = $attachments;
            }

            $data['status'] = $request->boolean('is_enrolled') ? 'Enrolled' : 'Pending';

            $student = Student::create($data);

            if ($student->status === 'Enrolled') {
                $this->feeService->assignInitialFees($student);
            }

            return $this->sendResponse($student, 'Student admitted successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Failed to admit student.', ['error' => $e->getMessage()], 500);
        }
    }

    public function show(Student $admission)
    {
        try {
            return $this->sendResponse($admission->load(['campus', 'academicClass', 'section', 'program', 'programSemester', 'academicBatch']), 'Student details retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve student details.', ['error' => $e->getMessage()], 500);
        }
    }

    public function update(StoreStudentRequest $request, Student $admission)
    {
        try {
            $data = $request->validated();

            if ($request->hasFile('student_picture')) {
                // Should we delete old picture? For now just store new one.
                $path = $request->file('student_picture')->store('students/pictures', 'public');
                $data['student_picture'] = $path;
            }

            $currentAttachments = $admission->attachments ?? [];

            if ($request->has('deleted_attachments')) {
                $deletedAttachments = $request->input('deleted_attachments');
                foreach ($deletedAttachments as $deleted) {
                    if (($key = array_search($deleted, $currentAttachments)) !== false) {
                        unset($currentAttachments[$key]);
                        if (\Storage::disk('public')->exists($deleted)) {
                            \Storage::disk('public')->delete($deleted);
                        }
                    }
                }
                $currentAttachments = array_values($currentAttachments);
            }

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $currentAttachments[] = $file->store('students/attachments', 'public');
                }
            }
            
            $data['attachments'] = $currentAttachments;

            // Keep status logic consistent
            if ($request->has('is_enrolled')) {
                $data['status'] = $request->boolean('is_enrolled') ? 'Enrolled' : 'Pending';
            }

            $admission->update($data);

            if ($admission->status === 'Enrolled') {
                $this->feeService->assignInitialFees($admission);
            }

            return $this->sendResponse($admission, 'Student updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update student.', ['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Student $admission)
    {
        try {
            $admission->delete(); // Soft delete
            return $this->sendResponse(null, 'Student deleted successfully (recoverable).');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete student.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Soft-delete multiple students at once.
     * Only IDs belonging to the current scope are deleted.
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'student_ids'   => 'required|array|min:1',
            'student_ids.*' => 'integer|exists:students,id',
        ]);

        try {
            $deleted = Student::whereIn('id', $request->student_ids)->delete();
            return $this->sendResponse(
                ['deleted' => $deleted],
                "{$deleted} student(s) deleted successfully (recoverable)."
            );
        } catch (\Exception $e) {
            return $this->sendError('Bulk delete failed.', ['error' => $e->getMessage()], 500);
        }
    }
}
