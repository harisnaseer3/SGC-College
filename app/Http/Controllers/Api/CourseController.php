<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Http\Requests\Api\Academic\StoreCourseRequest;
use App\Models\Course;
use Illuminate\Http\JsonResponse;

class CourseController extends BaseController
{
    public function index(): JsonResponse
    {
        try {
            $courses = Course::latest()->get();
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
