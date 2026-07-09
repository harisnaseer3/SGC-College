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
     * Uses human-readable names (campus name, program name, semester number, batch name)
     * instead of raw database IDs.
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
            'admission_no',
            'roll_no',
            'admission_date',
            'intake_session',
            'is_transfer',
            'campus',
            'program',
            'semester',
            'batch',
            'status',
        ];

        return response()->stream(function () use ($columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);
            // Example row matching the real data format
            fputcsv($handle, [
                'Waris',           // first_name
                'Masih',           // last_name
                'waris@example.com',// email
                '03154245040',     // phone
                'Male',            // gender
                '2000-01-15',      // date_of_birth  (YYYY-MM-DD or DD-Mon-YY)
                '37405-1234567-1', // student_cnic
                'none',            // address        ("none" is accepted)
                'none',            // religion       ("none" is accepted)
                'not specified',   // guardian_name  ("not specified" → null)
                '03001234567',     // guardian_phone
                'not specified',   // guardian_cnic  ("not specified" → null)
                '2024-CINR-0017',  // admission_no   (keep as-is, stored in admission_number)
                '24867910015',     // roll_no         (11-digit format e.g. 24867910015)
                '01-jan-25',       // admission_date (DD-Mon-YY supported)
                'Spring',            // intake_session
                'no',              // is_transfer    (yes/no/true/false/1/0)
                'CICON 6th Road Campus', // campus   (exact campus name)
                'GBSN',            // program        (exact program name or code)
                '1',               // semester       (number; "3rd", "3" all work)
                'Spring 2025-2029 (Batch-01)', // batch      (exact batch name)
                'Enrolled',        // status
            ]);
            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Validate and preview CSV rows before committing.
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);

        $result = $this->parseAndValidate($request->file('file'), dryRun: true);
        return $this->sendResponse($result, 'CSV preview generated.');
    }

    /**
     * Import CSV rows into the database.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);

        $result  = $this->parseAndValidate($request->file('file'), dryRun: false);
        $message = "Import complete. {$result['imported']} imported, {$result['failed']} failed.";
        return $this->sendResponse($result, $message);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function parseAndValidate($file, bool $dryRun): array
    {
        $handle  = fopen($file->getRealPath(), 'r');
        $headers = array_map('trim', fgetcsv($handle));

        // Normalise header names (lowercase, spaces/hyphens → underscores)
        $headers = array_map(fn($h) => strtolower(str_replace([' ', '-'], '_', $h)), $headers);

        $rows     = [];
        $imported = 0;
        $failed   = 0;
        $rowIndex = 1; // human-readable row number

        // ── Pre-load lookup maps (name/code → id) ───────────────────────────
        // Campus: name → id
        $campusMap = Campus::withoutGlobalScopes()
            ->select('id', 'name')
            ->get()
            ->mapWithKeys(fn($c) => [strtolower(trim($c->name)) => $c->id])
            ->toArray();

        // Program: name → id  and  code → id
        $programByName = Program::withoutGlobalScopes()
            ->select('id', 'name', 'code')
            ->get()
            ->mapWithKeys(fn($p) => [strtolower(trim($p->name)) => $p->id])
            ->toArray();
        $programByCode = Program::withoutGlobalScopes()
            ->select('id', 'name', 'code')
            ->get()
            ->mapWithKeys(fn($p) => [strtolower(trim($p->code ?? '')) => $p->id])
            ->toArray();

        // ProgramSemester: [program_id, semester_number] → semester_id
        $semesterMap = ProgramSemester::all()
            ->mapWithKeys(fn($s) => ["{$s->program_id}_{$s->semester_number}" => $s->id])
            ->toArray();

        // AcademicBatch: keyed by "{campus_id}_{year_range}" → batch_id
        // e.g. "5_2024-2028" => 3
        // Extracts the first YYYY-YYYY pattern found in the batch name.
        $batchMap = AcademicBatch::withoutGlobalScopes()
            ->select('id', 'name', 'campus_id')
            ->get()
            ->mapWithKeys(function ($b) {
                if (preg_match('/\d{4}-\d{4}/', $b->name, $m)) {
                    return ["{$b->campus_id}_{$m[0]}" => $b->id];
                }
                return []; // batch name has no year range — skip
            })
            ->toArray();

        while (($raw = fgetcsv($handle)) !== false) {
            if (count(array_filter($raw)) === 0) continue; // skip blank lines

            $data = array_combine($headers, array_pad($raw, count($headers), null));
            $data = array_map(fn($v) => is_string($v) ? trim($v) : $v, $data);

            // ── Resolve human-readable values → IDs ─────────────────────────
            $resolved = $this->resolveRow($data, $campusMap, $programByName, $programByCode, $semesterMap, $batchMap);
            $errors   = $this->validateRow($resolved, $rowIndex);

            if (!empty($errors)) {
                $failed++;
                $rows[] = [
                    'row'    => $rowIndex,
                    'status' => 'error',
                    'data'   => $data,   // show original readable values in preview
                    'errors' => $errors,
                ];
            } else {
                if (!$dryRun) {
                    try {
                        DB::transaction(function () use ($resolved, $data) {
                            $isTransfer = $this->parseBool($resolved['is_transfer'] ?? '0');
                            $rawStatus  = $resolved['status'] ?? 'Pending';
                            $status     = $this->normaliseStatus($rawStatus);

                            $student = Student::create([
                                'campus_id'           => $resolved['campus_id'],
                                'program_id'          => $resolved['program_id'],
                                'program_semester_id' => $resolved['program_semester_id'],
                                'academic_batch_id'   => $resolved['academic_batch_id'],
                                'intake_session'      => $resolved['intake_session'],
                                'first_name'          => $resolved['first_name'],
                                'last_name'           => $resolved['last_name'],
                                'email'               => $this->nullIfEmpty($resolved['email'] ?? ''),
                                'phone'               => $resolved['phone'],
                                'date_of_birth'       => $this->parseDate($resolved['date_of_birth'] ?? null),
                                'address'             => $this->nullIfPlaceholder($resolved['address'] ?? ''),
                                'guardian_name'       => $this->nullIfPlaceholder($resolved['guardian_name'] ?? ''),
                                'guardian_phone'      => $this->nullIfPlaceholder($resolved['guardian_phone'] ?? ''),
                                'guardian_cnic'       => $this->nullIfPlaceholder($resolved['guardian_cnic'] ?? ''),
                                'admission_number'    => $this->nullIfPlaceholder($resolved['admission_no'] ?? ''),
                                'roll_number'         => $this->nullIfPlaceholder($resolved['roll_no'] ?? ''),
                                'admission_date'      => $this->parseDate($resolved['admission_date'] ?? null),
                                'status'              => $status,
                                'student_cnic'        => $this->nullIfPlaceholder($resolved['student_cnic'] ?? ''),
                                'gender'              => $resolved['gender'],
                                'is_transfer'         => $isTransfer,
                                'religion'            => $this->nullIfPlaceholder($resolved['religion'] ?? ''),
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
                    // Dry-run: mark as valid
                    $rows[]   = ['row' => $rowIndex, 'status' => 'valid', 'data' => $data, 'errors' => []];
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

    /**
     * Resolve human-readable column values to database IDs and normalised values.
     * Keeps all original keys intact and adds *_id keys.
     */
    private function resolveRow(
        array $data,
        array $campusMap,
        array $programByName,
        array $programByCode,
        array $semesterMap,
        array $batchMap,
    ): array {
        $out = $data;

        // ── Campus ──────────────────────────────────────────────────────────
        $campusKey      = strtolower(trim($data['campus'] ?? ''));
        $out['campus_id'] = $campusMap[$campusKey] ?? null;

        // ── Program ─────────────────────────────────────────────────────────
        $programKey     = strtolower(trim($data['program'] ?? ''));
        $out['program_id'] = $programByName[$programKey]
            ?? $programByCode[$programKey]
            ?? null;

        // ── Semester ─────────────────────────────────────────────────────────
        // Accept: "3", "3rd", "1st", "2nd" etc.
        $semesterRaw    = trim($data['semester'] ?? '');
        $semesterNum    = (int) preg_replace('/[^0-9]/', '', $semesterRaw);
        $semKey         = ($out['program_id'] ?? '') . '_' . $semesterNum;
        $out['program_semester_id'] = $semesterNum > 0 ? ($semesterMap[$semKey] ?? null) : null;

        // ── Academic Batch ───────────────────────────────────────────────────
        // Column may be named 'batch' or 'academic_batch_id'.
        // Strategy:
        //   1. If the value is a plain integer, use it directly as the ID.
        //   2. Otherwise extract the YYYY-YYYY year range from the value and
        //      look up the batch that belongs to the resolved campus.
        $batchRaw = trim($data['batch'] ?? $data['academic_batch_id'] ?? '');
        if (is_numeric($batchRaw)) {
            $out['academic_batch_id'] = (int) $batchRaw;
        } elseif (preg_match('/(\d{4}-\d{4})/', $batchRaw, $ym)) {
            $yearRange  = $ym[1];
            $campusId   = $out['campus_id'] ?? '';
            $batchKey   = "{$campusId}_{$yearRange}";
            $out['academic_batch_id'] = $batchMap[$batchKey] ?? null;
        } else {
            $out['academic_batch_id'] = null;
        }

        // ── Dates ────────────────────────────────────────────────────────────
        $out['admission_date'] = $this->parseDate($data['admission_date'] ?? null);
        $out['date_of_birth']  = $this->parseDate($data['date_of_birth']  ?? null);

        // ── Booleans ─────────────────────────────────────────────────────────
        $out['is_transfer'] = $this->parseBool($data['is_transfer'] ?? '0') ? '1' : '0';

        // ── Nullify placeholders ─────────────────────────────────────────────
        foreach (['guardian_name', 'guardian_phone', 'guardian_cnic', 'address', 'religion', 'student_cnic', 'email', 'admission_no', 'roll_no'] as $col) {
            if (isset($out[$col])) {
                $out[$col] = $this->nullIfPlaceholder($out[$col]);
            }
        }

        // ── Normalise intake session ─────────────────────────────────────────
        $intakeRaw = trim($data['intake_session'] ?? '');
        $intakeLower = strtolower($intakeRaw);
        if (str_contains($intakeLower, 'spring') || str_contains($intakeLower, 'jan') || str_contains($intakeLower, 'feb') || str_contains($intakeLower, 'mar') || str_contains($intakeLower, 'apr') || str_contains($intakeLower, 'may') || str_contains($intakeLower, 'jun')) {
            $out['intake_session'] = 'Spring';
        } elseif (str_contains($intakeLower, 'fall') || str_contains($intakeLower, 'jul') || str_contains($intakeLower, 'aug') || str_contains($intakeLower, 'sep') || str_contains($intakeLower, 'oct') || str_contains($intakeLower, 'nov') || str_contains($intakeLower, 'dec')) {
            $out['intake_session'] = 'Fall';
        } else {
            // Auto-detect based on admission date if text doesn't match
            if (!empty($out['admission_date'])) {
                $month = (int) date('m', strtotime($out['admission_date']));
                $out['intake_session'] = $month >= 7 ? 'Fall' : 'Spring';
            } else {
                $out['intake_session'] = ucfirst($intakeLower);
            }
        }

        // ── Normalise status ─────────────────────────────────────────────────
        $out['status'] = $this->normaliseStatus($data['status'] ?? 'Pending');

        return $out;
    }

    private function validateRow(array $data, int $row): array
    {
        $rules = [
            'first_name'          => 'required|string|max:255',
            'last_name'           => 'required|string|max:255',
            'email'               => 'nullable|email|unique:students,email',
            'phone'               => 'required|string',
            'gender'              => 'required|in:Male,Female,Other',
            'date_of_birth'       => 'nullable|date',
            'admission_date'      => 'required|date',
            'intake_session'      => 'required|in:Fall,Spring',
            'campus_id'           => 'required|integer|exists:campuses,id',
            'program_id'          => 'required|integer|exists:programs,id',
            'program_semester_id' => 'required|integer|exists:program_semesters,id',
            'academic_batch_id'   => 'required|integer|exists:academic_batches,id',
        ];

        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            $messages = [];
            foreach ($validator->errors()->toArray() as $field => $errs) {
                // Show friendly field names (campus instead of campus_id, etc.)
                $friendly   = match($field) {
                    'campus_id'           => 'campus',
                    'program_id'          => 'program',
                    'program_semester_id' => 'semester',
                    'academic_batch_id'   => 'academic_batch_id',
                    default               => $field,
                };
                $messages[] = ucfirst(str_replace('_', ' ', $friendly)) . ': ' . implode(', ', $errs);
            }
            return $messages;
        }

        return [];
    }

    // ── Value Helpers ─────────────────────────────────────────────────────────

    /**
     * Parse various date formats:
     *  - YYYY-MM-DD  (ISO standard)
     *  - DD-Mon-YY   e.g. 31-Dec-24
     *  - DD/MM/YYYY
     *  - D-M-YYYY
     */
    private function parseDate(?string $value): ?string
    {
        if (empty($value) || $this->isPlaceholder($value)) {
            return null;
        }

        // Try strtotime first (handles most formats)
        $ts = strtotime($value);
        if ($ts !== false) {
            return date('Y-m-d', $ts);
        }

        // Manual: DD-Mon-YY  (e.g. 31-Dec-24)
        if (preg_match('/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/', $value, $m)) {
            $year = strlen($m[3]) === 2 ? '20' . $m[3] : $m[3];
            $ts   = strtotime("{$m[1]}-{$m[2]}-{$year}");
            if ($ts !== false) {
                return date('Y-m-d', $ts);
            }
        }

        return null;
    }

    /**
     * Parse boolean-ish strings: yes/no/true/false/1/0
     */
    private function parseBool(mixed $value): bool
    {
        if (is_bool($value)) return $value;
        return filter_var(strtolower((string) $value), FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Return null for common placeholder strings (none / not specified / n/a / -)
     */
    private function nullIfPlaceholder(?string $value): ?string
    {
        return $this->isPlaceholder($value) ? null : ($value ?: null);
    }

    private function isPlaceholder(?string $value): bool
    {
        if ($value === null) return true;
        return in_array(strtolower(trim($value)), ['none', 'not specified', 'n/a', 'na', '-', '']);
    }

    private function nullIfEmpty(?string $value): ?string
    {
        return ($value === '' || $value === null) ? null : $value;
    }

    /**
     * Normalise status values to match enum:
     * Enrolled | Struck Off | Passed Out | Promoted | Transferred | Active | Pending | Post RN
     */
    private function normaliseStatus(string $raw): string
    {
        $map = [
            'enrolled'    => 'Enrolled',
            'struck off'  => 'Struck Off',
            'struck_off'  => 'Struck Off',
            'passed out'  => 'Passed Out',
            'passed_out'  => 'Passed Out',
            'promoted'    => 'Promoted',
            'transferred' => 'Transferred',
            'active'      => 'Active',
            'pending'     => 'Pending',
            'post rn'     => 'Post RN',
            'post_rn'     => 'Post RN',
        ];

        return $map[strtolower(trim($raw))] ?? ucwords(strtolower(trim($raw)));
    }
}
