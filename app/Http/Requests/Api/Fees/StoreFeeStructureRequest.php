<?php

namespace App\Http\Requests\Api\Fees;

use Illuminate\Foundation\Http\FormRequest;

class StoreFeeStructureRequest extends FormRequest
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
            'name' => 'nullable|string|max:255',
            'campus_id' => 'required|exists:campuses,id',
            'program_id' => 'required|exists:programs,id',
            'academic_batch_id' => 'nullable|exists:academic_batches,id',
            'items' => 'required|array|min:1',
            'items.*.fee_head_id' => 'required|exists:fee_heads,id',
            'items.*.amount' => 'required|numeric|min:0',
        ];
    }
}
