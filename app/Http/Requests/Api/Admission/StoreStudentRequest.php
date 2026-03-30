<?php

namespace App\Http\Requests\Api\Admission;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'campus_id' => 'required|exists:campuses,id',
            'program_id' => 'required|exists:programs,id',
            'program_semester_id' => 'required|exists:program_semesters,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'admission_number' => 'required|string|unique:students,admission_number',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:students,email',
            'phone' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'address' => 'nullable|string',
            'guardian_name' => 'nullable|string',
            'guardian_phone' => 'nullable|string',
            'admission_date' => 'required|date',
        ];
    }
}
