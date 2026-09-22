<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SuspenseEntry;
use App\Models\FeePayment;
use App\Models\GeneratedVoucher;
use App\Models\StudentFee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\FeeService;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SuspenseEntryController extends Controller implements HasMiddleware
{
    protected $feeService;

    public function __construct(FeeService $feeService)
    {
        $this->feeService = $feeService;
    }

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view_suspense_entries', only: ['index']),
            new Middleware('permission:create_suspense_entries', only: ['store']),
            new Middleware('permission:edit_suspense_entries', only: ['update']),
            new Middleware('permission:delete_suspense_entries', only: ['destroy']),
            new Middleware('permission:reconcile_suspense_entries', only: ['reconcile']),
        ];
    }

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

    public function update(Request $request, SuspenseEntry $suspenseEntry)
    {
        if ($suspenseEntry->status === 'RECONCILED') {
            return response()->json(['message' => 'Cannot edit a reconciled entry'], 422);
        }

        $validated = $request->validate([
            'campus_bank_account_id' => 'required|exists:campus_bank_accounts,id',
            'amount' => 'required|numeric|min:1',
            'deposit_date' => 'required|date',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $suspenseEntry->update($validated);
        return response()->json(['message' => 'Suspense Entry updated successfully', 'data' => $suspenseEntry]);
    }

    public function destroy(SuspenseEntry $suspenseEntry)
    {
        if ($suspenseEntry->status === 'RECONCILED') {
            return response()->json(['message' => 'Cannot delete a reconciled entry'], 422);
        }
        $suspenseEntry->delete();
        return response()->json(['message' => 'Suspense Entry deleted successfully']);
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

        $studentId = null;

        if (!empty($validated['voucher_number'])) {
            $voucher = GeneratedVoucher::where('voucher_number', $validated['voucher_number'])->first();
            if ($voucher) {
                $studentId = $voucher->student_id;
            } else {
                $fee = StudentFee::where('voucher_number', $validated['voucher_number'])->first();
                if ($fee) {
                    $studentId = $fee->student_id;
                }
            }
        } elseif (!empty($validated['student_fee_id'])) {
            $fee = StudentFee::find($validated['student_fee_id']);
            if ($fee) {
                $studentId = $fee->student_id;
            }
        }

        if (!$studentId) {
            return response()->json(['message' => 'Could not determine the student tied to this voucher or fee.'], 404);
        }

        try {
            DB::beginTransaction();

            // Record the payment properly via FeeService
            $receiptNumber = $this->feeService->recordPayment(
                $studentId,
                (float) $suspenseEntry->amount,
                [
                    'payment_date' => $suspenseEntry->deposit_date,
                    'payment_method' => 'Bank',
                    'transaction_id' => $suspenseEntry->reference_number,
                    'remarks' => 'Reconciled from Suspense Entry #' . $suspenseEntry->id,
                    'voucher_number' => $validated['voucher_number'] ?? null,
                ]
            );

            // Fetch the freshly created FeePayment record using the unique receipt_number
            $payment = FeePayment::where('receipt_number', $receiptNumber)->first();

            $suspenseEntry->update([
                'status' => 'RECONCILED',
                'reconciled_payment_id' => $payment ? $payment->id : null,
            ]);

            DB::commit();
            return response()->json(['message' => 'Entry reconciled successfully', 'data' => $suspenseEntry]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to reconcile entry', 'error' => $e->getMessage()], 500);
        }
    }
}
