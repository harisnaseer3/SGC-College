<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SuspenseEntry;
use App\Models\FeePayment;
use App\Models\GeneratedVoucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuspenseEntryController extends Controller
{
    public function index(Request $request)
    {
        $query = SuspenseEntry::with(['campusBankAccount', 'feePayment.student.user'])->latest();

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('deposit_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('deposit_date', '<=', $request->end_date);
        }
        if ($request->filled('campus_bank_account_id')) {
            $query->where('campus_bank_account_id', $request->campus_bank_account_id);
        }

        // Apply a high per_page for reports or a generic limit if requested to export
        $perPage = $request->get('export') == '1' ? 1000 : $request->get('per_page', 15);
        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'campus_bank_account_id' => 'required|exists:campus_bank_accounts,id',
            'amount' => 'required|numeric|min:1',
            'deposit_date' => 'required|date',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'campus_id' => 'nullable|exists:campuses,id',
        ]);

        $entry = SuspenseEntry::create(array_merge($validated, [
            'status' => 'PENDING',
            'created_by' => auth()->id(),
        ]));

        return response()->json(['message' => 'Suspense Entry created successfully', 'data' => $entry], 201);
    }

    public function reconcile(Request $request, SuspenseEntry $suspenseEntry)
    {
        if ($suspenseEntry->status === 'RECONCILED') {
            return response()->json(['message' => 'Entry already reconciled'], 422);
        }

        $validated = $request->validate([
            'student_fee_id' => 'nullable|exists:student_fees,id',
            'voucher_number' => 'nullable|string',
        ]);

        if (empty($validated['student_fee_id']) && empty($validated['voucher_number'])) {
            return response()->json(['message' => 'Please provide either a Fee ID or Voucher Number.'], 422);
        }

        if (!empty($validated['voucher_number']) && empty($validated['student_fee_id'])) {
            $voucher = GeneratedVoucher::where('voucher_number', $validated['voucher_number'])->first();
            if (!$voucher) {
                return response()->json(['message' => 'Voucher not found.'], 404);
            }
            $fee = $voucher->studentFees()->first();
            if ($fee) {
                $validated['student_fee_id'] = $fee->id;
            } else {
                return response()->json(['message' => 'No pending fees found for this voucher.'], 422);
            }
        }

        DB::beginTransaction();

        try {
            $payment = FeePayment::create([
                'student_fee_id' => $validated['student_fee_id'],
                'amount_paid' => $suspenseEntry->amount,
                'payment_date' => $suspenseEntry->deposit_date,
                'campus_bank_account_id' => $suspenseEntry->campus_bank_account_id,
                'payment_method' => 'Bank',
                'reference_number' => $suspenseEntry->reference_number,
                'created_by' => auth()->id(),
            ]);

            $suspenseEntry->update([
                'status' => 'RECONCILED',
                'reconciled_payment_id' => $payment->id,
            ]);

            DB::commit();
            return response()->json(['message' => 'Entry reconciled successfully', 'data' => $suspenseEntry]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to reconcile entry', 'error' => $e->getMessage()], 500);
        }
    }
}
