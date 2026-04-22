<?php

namespace App\Http\Controllers\Api;

use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use Illuminate\Support\Facades\DB;

class FeeStructureController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $structures = FeeStructure::with(['program', 'academicBatch', 'items.feeHead'])->get();
        return $this->sendResponse($structures, 'Fee structures retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(\App\Http\Requests\Api\Fees\StoreFeeStructureRequest $request)
    {

        try {
            DB::beginTransaction();

            $name = $request->name;
            if (!$name) {
                $program = \App\Models\Program::find($request->program_id);
                $batch = $request->academic_batch_id ? \App\Models\AcademicBatch::find($request->academic_batch_id) : null;
                $name = $program->name . ($batch ? " - " . $batch->name : "") . " Fee Structure";
            }

            $structure = FeeStructure::create([
                'name' => $name,
                'program_id' => $request->program_id,
                'academic_batch_id' => $request->academic_batch_id,
            ]);

            foreach ($request->items as $item) {
                FeeStructureItem::create([
                    'fee_structure_id' => $structure->id,
                    'fee_head_id' => $item['fee_head_id'],
                    'amount' => $item['amount'],
                ]);
            }

            DB::commit();

            return $this->sendResponse($structure->load('items.feeHead'), 'Fee structure created successfully.');
        } catch (\Exception $e) {
            DB::rollback();
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(FeeStructure $feeStructure)
    {
        return $this->sendResponse($feeStructure->load(['program', 'academicBatch', 'items.feeHead']), 'Fee structure retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(\App\Http\Requests\Api\Fees\UpdateFeeStructureRequest $request, FeeStructure $feeStructure)
    {

        try {
            DB::beginTransaction();

            $feeStructure->update([
                'name' => $request->name,
                'program_id' => $request->program_id,
                'academic_batch_id' => $request->academic_batch_id,
            ]);

            // Simple approach: delete and recreate items
            $feeStructure->items()->delete();

            foreach ($request->items as $item) {
                FeeStructureItem::create([
                    'fee_structure_id' => $feeStructure->id,
                    'fee_head_id' => $item['fee_head_id'],
                    'amount' => $item['amount'],
                ]);
            }

            DB::commit();

            return $this->sendResponse($feeStructure->load('items.feeHead'), 'Fee structure updated successfully.');
        } catch (\Exception $e) {
            DB::rollback();
            return $this->sendError('Internal Server Error.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FeeStructure $feeStructure)
    {
        $feeStructure->delete(); // Cascades to items if set up in migration (it is)
        return $this->sendResponse([], 'Fee structure deleted successfully.');
    }
}
