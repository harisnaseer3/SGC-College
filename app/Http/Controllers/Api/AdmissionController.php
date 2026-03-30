<?php

namespace App\Http\Controllers\Api;

use App\Models\AcademicClass;
use App\Models\Campus;
use App\Models\Section;
use App\Models\Student;
use App\Models\Program;
use App\Models\AcademicBatch;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Admission\StoreStudentRequest;

class AdmissionController extends BaseController
{
    public function index()
    {
        try {
            $students = Student::with(['campus', 'academicClass', 'section', 'program', 'programSemester', 'academicBatch'])->latest()->get();
            return $this->sendResponse($students, 'Students retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve students.', ['error' => $e->getMessage()], 500);
        }
    }

    public function getFormData()
    {
        try {
            return $this->sendResponse([
                'campuses' => Campus::all(),
                'classes' => AcademicClass::all(),
                'sections' => Section::all(),
                'programs' => Program::with('semesters')->get(),
                'batches' => AcademicBatch::all(),
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

            $data['status'] = $request->boolean('is_enrolled') ? 'Enrolled' : 'Pending';

            $student = Student::create($data);
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

            // Keep status logic consistent
            if ($request->has('is_enrolled')) {
                $data['status'] = $request->boolean('is_enrolled') ? 'Enrolled' : 'Pending';
            }

            $admission->update($data);
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
}
