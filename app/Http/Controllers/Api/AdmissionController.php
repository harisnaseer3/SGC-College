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
        $students = Student::with(['campus', 'academicClass', 'section'])->latest()->get();
        return $this->sendResponse($students, 'Students retrieved successfully.');
    }

    public function getFormData()
    {
        return $this->sendResponse([
            'campuses' => Campus::all(),
            'classes' => AcademicClass::all(),
            'sections' => Section::all(),
        ], 'Form data retrieved successfully.');
    }

    public function store(StoreStudentRequest $request)
    {
        $student = Student::create($request->validated());

        return $this->sendResponse($student, 'Student admitted successfully.', 201);
    }
}
