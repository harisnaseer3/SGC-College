<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Academic\StoreCourseRequest;
use App\Models\Course;
use Illuminate\Http\JsonResponse;

class CourseController extends BaseController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_courses', only: ['index', 'show', 'getFormData', 'studentLedger', 'voucher', 'findByVoucher', 'allPayments']),
            new Middleware('permission:create_courses', only: ['store', 'generate', 'manualAssign']),
            new Middleware('permission:edit_courses', only: ['update', 'assignCourses']),
            new Middleware('permission:delete_courses', only: ['destroy', 'bulkDelete']),
        ];
    }

    public function index(): JsonResponse
    {
        try {
            $courses = Course::latest()->paginate(10);
            return $this->sendResponse($courses, 'Courses retrieved successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve courses.', ['error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        try {
            $course = Course::create($request->validated());
            return $this->sendResponse($course, 'Course created successfully.', 201);
        } catch (\Exception $e) {
            return $this->sendError('Failed to create course.', ['error' => $e->getMessage()], 500);
        }
    }

    public function show(Course $course): JsonResponse
    {
        return $this->sendResponse($course, 'Course retrieved successfully.');
    }

    public function update(StoreCourseRequest $request, Course $course): JsonResponse
    {
        try {
            $course->update($request->validated());
            return $this->sendResponse($course, 'Course updated successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to update course.', ['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Course $course): JsonResponse
    {
        try {
            $course->delete();
            return $this->sendResponse(null, 'Course deleted successfully.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete course.', ['error' => $e->getMessage()], 500);
        }
    }
}
