<?php

namespace App\Http\Requests\Api\Fees;

use Illuminate\Foundation\Http\FormRequest;

class StoreFeeFinePolicyRequest extends FormRequest
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
            'fee_head_id' => 'required|exists:fee_heads,id',
            'grace_days' => 'required|integer|min:0',
            'fine_amount' => 'required|numeric|min:0',
            'fine_type' => 'required|in:fixed,percentage',
        ];
    }
}
