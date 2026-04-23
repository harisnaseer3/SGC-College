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
        $studentId = $this->student?->id;

        return [
            'campus_id'           => 'required|exists:campuses,id',
            'program_id'          => 'required|exists:programs,id',
            'program_semester_id' => 'required|exists:program_semesters,id',
            'academic_batch_id'   => 'required|exists:academic_batches,id',
            'intake_session'      => 'required|in:Fall,Spring',
            'admission_number'    => 'nullable|string|unique:students,admission_number,' . $studentId,
            'first_name'          => 'required|string|max:255',
            'last_name'           => 'required|string|max:255',
            'email'               => 'nullable|email|unique:students,email,' . $studentId,
            'phone'               => 'required|string',
            'date_of_birth'       => 'required|date',
            'address'             => 'required|string',
            'guardian_name'       => 'nullable|string',
            'guardian_phone'      => 'required|string',
            'guardian_cnic'       => 'nullable|string',
            'admission_date'      => 'required|date',
            'status'              => 'nullable|string',
            'student_cnic'        => 'nullable|string',
            'gender'              => 'required|in:Male,Female,Other',
            'is_transfer'         => 'required|boolean',
            'religion'            => 'required|string|max:255',
            'student_picture'     => 'nullable|image|max:2048',
            'is_enrolled'         => 'nullable|boolean',
        ];
    }
}
