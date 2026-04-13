<?php

namespace App\Http\Requests\Api\Fees;

use Illuminate\Foundation\Http\FormRequest;

class StoreFeeHeadRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'frequency' => 'required|in:one_time,monthly,semester',
            'frequency_name' => 'nullable|string|max:255',
            'priority' => 'nullable|integer',
            'description' => 'nullable|string',
        ];
    }
}
