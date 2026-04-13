<?php

namespace App\Http\Requests\Api\Fees;

use Illuminate\Foundation\Http\FormRequest;

class GenerateStudentFeeRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'campus_id' => 'required|exists:campuses,id',
            'program_id' => 'nullable|exists:programs,id',
            'academic_batch_id' => 'nullable|exists:academic_batches,id',
            'due_date' => 'nullable|date',
        ];
    }
}
