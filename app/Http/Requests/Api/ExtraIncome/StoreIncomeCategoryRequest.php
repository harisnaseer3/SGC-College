<?php

namespace App\Http\Requests\Api\ExtraIncome;

use Illuminate\Foundation\Http\FormRequest;

class StoreIncomeCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add specific authorization if needed
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ];
    }
}
