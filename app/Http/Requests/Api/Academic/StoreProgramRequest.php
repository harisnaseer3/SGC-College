<?php

namespace App\Http\Requests\Api\Academic;

use Illuminate\Foundation\Http\FormRequest;

class StoreProgramRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'duration_years' => 'nullable|integer|min:0',
            'duration_value' => 'nullable|integer|min:1',
            'duration_unit' => 'nullable|string|in:weeks,months,years',
            'structure_type' => 'nullable|string|in:semester,monthly,annual,weekly',
            'total_semesters' => 'required|integer|min:1',
            'requires_batch' => 'nullable|boolean',
            'campus_id' => 'required|exists:campuses,id',
            'branches' => 'nullable|array',
            'branches.*' => 'nullable|string'
        ];
    }
}
