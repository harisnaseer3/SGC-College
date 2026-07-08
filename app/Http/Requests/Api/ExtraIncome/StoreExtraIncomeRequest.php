<?php

namespace App\Http\Requests\Api\ExtraIncome;

use Illuminate\Foundation\Http\FormRequest;

class StoreExtraIncomeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'income_category_id' => 'required|exists:income_categories,id',
            'program_id' => 'required|exists:programs,id',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'payment_method' => 'required|string|max:50',
            'remarks' => 'nullable|string',
        ];
    }
}
