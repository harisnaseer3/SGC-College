<?php

namespace App\Http\Controllers\Api;

use App\Models\Campus;
use App\Models\Program;
use App\Models\ProgramSemester;
use App\Models\AcademicBatch;
use App\Models\Student;
use App\Services\FeeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class StudentImportController extends BaseController
{
    protected FeeService $feeService;

    public function __construct(FeeService $feeService)
    {
        $this->feeService = $feeService;
    }

    /**
     * Download the CSV template that matches the import format.
     */
    public function template(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="student_import_template.csv"',
        ];

        $columns = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'gender',
            'date_of_birth',
            'student_cnic',
            'address',
            'religion',
            'guardian_name',
            'guardian_phone',
            'guardian_cnic',
            'admission_date',
            'intake_session',
            'is_transfer',
            'campus_id',
            'program_id',
            'program_semester_id',
            'academic_batch_id',
            'status',
        ];

        return response()->stream(function () use ($columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);
            // Example row
            fputcsv($handle, [
                'John', 'Doe', 'john.doe@example.com', '03001234567',
                'Male', '2000-01-15', '12345-6789012-3',
                '123 Main Street', 'Islam',
                'Jane Doe', '03009876543', '12345-6789012-4',
                date('Y-m-d'), 'Fall', '0',
                '1', '1', '1', '1', 'Enrolled',
            ]);
            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Validate and preview CSV rows before committing.
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:2048']);

        $result = $this->parseAndValidate($request->file('file'), dryRun: true);
        return $this->sendResponse($result, 'CSV preview generated.');
    }

    /**
     * Import CSV rows into the database.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:2048']);

        $result = $this->parseAndValidate($request->file('file'), dryRun: false);

        $message = "Import complete. {$result['imported']} imported, {$result['failed']} failed.";
        return $this->sendResponse($result, $message);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function parseAndValidate($file, bool $dryRun): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        $headers = array_map('trim', fgetcsv($handle));

        // Normalise header names
        $headers = array_map(fn($h) => strtolower(str_replace([' ', '-'], '_', $h)), $headers);

        $rows     = [];
        $imported = 0;
        $failed   = 0;
        $rowIndex = 1; // human-readable row number (1 = first data row)

        // Cache lookups to avoid N+1
        $campuses   = Campus::pluck('id')->flip()->toArray();
        $programs   = Program::pluck('id')->flip()->toArray();
        $semesters  = ProgramSemester::pluck('id')->flip()->toArray();
        $batches    = AcademicBatch::pluck('id')->flip()->toArray();

        while (($raw = fgetcsv($handle)) !== false) {
            if (count(array_filter($raw)) === 0) continue; // skip blank lines

            $data   = array_combine($headers, array_pad($raw, count($headers), null));
            $data   = array_map('trim', $data);
            $errors = $this->validateRow($data, $rowIndex, $campuses, $programs, $semesters, $batches);

            if (!empty($errors)) {
                $failed++;
                $rows[] = [
                    'row'    => $rowIndex,
                    'status' => 'error',
                    'data'   => $data,
                    'errors' => $errors,
                ];
            } else {
                if (!$dryRun) {
                    try {
                        DB::transaction(function () use ($data) {
                            $isTransfer = filter_var($data['is_transfer'] ?? '0', FILTER_VALIDATE_BOOLEAN);
                            $isEnrolled = isset($data['status']) && strtolower($data['status']) === 'enrolled';

                            $student = Student::create([
                                'campus_id'           => $data['campus_id'],
                                'program_id'          => $data['program_id'],
                                'program_semester_id' => $data['program_semester_id'],
                                'academic_batch_id'   => $data['academic_batch_id'],
                                'intake_session'      => $data['intake_session'],
                                'first_name'          => $data['first_name'],
                                'last_name'           => $data['last_name'],
                                'email'               => $data['email'] ?: null,
                                'phone'               => $data['phone'],
                                'date_of_birth'       => $data['date_of_birth'],
                                'address'             => $data['address'],
                                'guardian_name'       => $data['guardian_name'] ?? null,
                                'guardian_phone'      => $data['guardian_phone'],
                                'guardian_cnic'       => $data['guardian_cnic'] ?? null,
                                'admission_date'      => $data['admission_date'],
                                'status'              => $isEnrolled ? 'Enrolled' : ($data['status'] ?? 'Pending'),
                                'student_cnic'        => $data['student_cnic'] ?? null,
                                'gender'              => $data['gender'],
                                'is_transfer'         => $isTransfer,
                                'religion'            => $data['religion'],
                            ]);

                            if ($student->status === 'Enrolled') {
                                app(FeeService::class)->assignInitialFees($student);
                            }
                        });
                        $imported++;
                        $rows[] = ['row' => $rowIndex, 'status' => 'success', 'data' => $data, 'errors' => []];
                    } catch (\Exception $e) {
                        $failed++;
                        $rows[] = ['row' => $rowIndex, 'status' => 'error', 'data' => $data, 'errors' => [$e->getMessage()]];
                    }
                } else {
                    // Dry-run: just mark as valid
                    $rows[] = ['row' => $rowIndex, 'status' => 'valid', 'data' => $data, 'errors' => []];
                    $imported++;
                }
            }

            $rowIndex++;
        }

        fclose($handle);

        return [
            'total'    => $rowIndex - 1,
            'imported' => $imported,
            'failed'   => $failed,
            'rows'     => $rows,
            'dry_run'  => $dryRun,
        ];
    }

    private function validateRow(array $data, int $row, array $campuses, array $programs, array $semesters, array $batches): array
    {
        $rules = [
            'first_name'          => 'required|string|max:255',
            'last_name'           => 'required|string|max:255',
            'email'               => 'nullable|email|unique:students,email',
            'phone'               => 'required|string',
            'gender'              => 'required|in:Male,Female,Other',
            'date_of_birth'       => 'required|date',
            'address'             => 'required|string',
            'religion'            => 'required|string',
            'guardian_phone'      => 'required|string',
            'admission_date'      => 'required|date',
            'intake_session'      => 'required|in:Fall,Spring',
            'campus_id'           => 'required|exists:campuses,id',
            'program_id'          => 'required|exists:programs,id',
            'program_semester_id' => 'required|exists:program_semesters,id',
            'academic_batch_id'   => 'required|exists:academic_batches,id',
        ];

        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            $messages = [];
            foreach ($validator->errors()->toArray() as $field => $errs) {
                $messages[] = ucfirst(str_replace('_', ' ', $field)) . ': ' . implode(', ', $errs);
            }
            return $messages;
        }

        return [];
    }
}
