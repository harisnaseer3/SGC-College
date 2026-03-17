<?php

namespace App\Http\Controllers\Api;

use App\Models\AcademicClass;
use App\Models\Campus;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Admission\StoreStudentRequest;

class AdmissionController extends BaseController
{
    public function index()
    {
        try {
            $students = Student::with(['campus', 'academicClass', 'section'])->latest()->get();
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
            ], 'Form data retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve form data.', ['error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreStudentRequest $request)
    {
        try {
            $student = Student::create($request->validated());
            return $this->sendResponse($student, 'Student admitted successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Failed to admit student.', ['error' => $e->getMessage()], 500);
        }
    }
}
