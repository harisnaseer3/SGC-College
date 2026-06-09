import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

// ── Icons ────────────────────────────────────────────────────────────────────

const UploadIcon = () => (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
);

const XIcon = ({ size = 4 }) => (
    <svg className={`w-${size} h-${size}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

// ── Step indicator ────────────────────────────────────────────────────────────

const Step = ({ n, label, active, done }) => (
    <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {done ? <CheckIcon /> : n}
        </div>
        <span className={`text-sm font-semibold hidden sm:block ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
    </div>
);

const StepDivider = () => <div className="flex-1 h-px bg-slate-200 mx-2" />;

// ── Row preview table ────────────────────────────────────────────────────────

const PreviewTable = ({ rows }) => {
    const PREVIEW_COLS = ['first_name', 'last_name', 'email', 'phone', 'gender', 'program_id', 'campus_id', 'status'];
    const label = k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-widest w-12">#</th>
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-widest w-20">Status</th>
                        {PREVIEW_COLS.map(c => (
                            <th key={c} className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                {label(c)}
                            </th>
                        ))}
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-widest">Errors</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map(r => (
                        <tr key={r.row} className={r.status === 'error' ? 'bg-rose-50' : 'bg-white hover:bg-slate-50'}>
                            <td className="px-3 py-2 text-slate-400 font-medium">{r.row}</td>
                            <td className="px-3 py-2">
                                {r.status === 'error' ? (
                                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                                        <XIcon size={3} /> Error
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                        <CheckIcon /> Valid
                                    </span>
                                )}
                            </td>
                            {PREVIEW_COLS.map(c => (
                                <td key={c} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                    {r.data?.[c] || <span className="text-slate-300 italic">—</span>}
                                </td>
                            ))}
                            <td className="px-3 py-2 text-rose-600 text-xs max-w-xs">
                                {r.errors?.length > 0
                                    ? <ul className="list-disc pl-3 space-y-0.5">{r.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                                    : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ── Results summary ───────────────────────────────────────────────────────────

const ResultSummary = ({ result, onClose, onImportMore }) => (
    <div className="flex flex-col items-center gap-6 py-4">
        {/* Big stat */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black
            ${result.failed === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {result.failed === 0 ? '✓' : '!'}
        </div>

        <div className="text-center">
            <h3 className="text-xl font-bold text-slate-900">Import Complete</h3>
            <p className="text-slate-500 text-sm mt-1">Here's a summary of the import operation.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
            {[
                { label: 'Total Rows', value: result.total, color: 'indigo' },
                { label: 'Imported', value: result.imported, color: 'emerald' },
                { label: 'Failed', value: result.failed, color: result.failed > 0 ? 'rose' : 'slate' },
            ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-2xl bg-${color}-50 border border-${color}-100 p-4 text-center`}>
                    <p className={`text-2xl font-black text-${color}-600`}>{value}</p>
                    <p className={`text-xs font-semibold text-${color}-500 mt-0.5`}>{label}</p>
                </div>
            ))}
        </div>

        {/* Failed rows details */}
        {result.failed > 0 && (
            <div className="w-full">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Failed Rows</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {result.rows.filter(r => r.status === 'error').map(r => (
                        <div key={r.row} className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">
                            <p className="text-xs font-bold text-rose-700">Row {r.row}: {r.data?.first_name} {r.data?.last_name}</p>
                            <ul className="list-disc pl-4 text-xs text-rose-500 mt-0.5">
                                {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="flex gap-3 w-full">
            <button
                onClick={onImportMore}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition-all"
            >
                Import More
            </button>
            <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 transition-all"
            >
                Done
            </button>
        </div>
    </div>
);

// ── Main Modal ────────────────────────────────────────────────────────────────

const ImportModal = ({ isOpen, onClose, onImported }) => {
    const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=result
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);   // from /preview endpoint
    const [result, setResult] = useState(null);     // from /import endpoint
    const fileInputRef = useRef(null);

    const reset = () => {
        setStep(1);
        setFile(null);
        setDragging(false);
        setLoading(false);
        setError('');
        setPreview(null);
        setResult(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    // ── Drag-and-drop ──────────────────────────────────────────────────────

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped && (dropped.name.endsWith('.csv') || dropped.type === 'text/csv')) {
            setFile(dropped);
            setError('');
        } else {
            setError('Please upload a valid CSV file.');
        }
    }, []);

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setError('');
        }
    };

    // ── Template download ──────────────────────────────────────────────────

    const downloadTemplate = async () => {
        try {
            const res = await axios.get('/api/admissions/import/template', { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'student_import_template.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to download template.');
        }
    };

    // ── Step 1 → 2: preview ────────────────────────────────────────────────

    const handlePreview = async () => {
        if (!file) { setError('Please select a CSV file first.'); return; }
        setLoading(true);
        setError('');
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await axios.post('/api/admissions/import/preview', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPreview(res.data.data);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to parse CSV. Please check the file format.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2 → 3: commit ─────────────────────────────────────────────────

    const handleImport = async () => {
        if (!preview || preview.imported === 0) return;
        setLoading(true);
        setError('');
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await axios.post('/api/admissions/import', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data.data);
            setStep(3);
            if (res.data.data.imported > 0) onImported?.();
        } catch (err) {
            setError(err.response?.data?.message || 'Import failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const validCount   = preview?.imported ?? 0;
    const invalidCount = preview?.failed ?? 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Import Students</h2>
                        <p className="text-slate-500 text-sm mt-0.5">Upload a CSV file to bulk-import student records.</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <XIcon size={5} />
                    </button>
                </div>

                {/* Step bar */}
                {step < 3 && (
                    <div className="flex items-center px-6 py-4 border-b border-slate-100 flex-shrink-0">
                        <Step n={1} label="Upload File"  active={step === 1} done={step > 1} />
                        <StepDivider />
                        <Step n={2} label="Preview & Validate" active={step === 2} done={step > 2} />
                        <StepDivider />
                        <Step n={3} label="Results" active={step === 3} done={false} />
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6">

                    {/* ── STEP 1: Upload ── */}
                    {step === 1 && (
                        <div className="space-y-5">
                            {/* Template download hint */}
                            <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                                <div>
                                    <p className="text-sm font-bold text-indigo-800">Need a template?</p>
                                    <p className="text-xs text-indigo-500 mt-0.5">Download the CSV template with all required columns & an example row.</p>
                                </div>
                                <button
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all flex-shrink-0 ml-4"
                                >
                                    <DownloadIcon /> Template
                                </button>
                            </div>

                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all py-14 flex flex-col items-center gap-3
                                    ${dragging
                                        ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                                        : file
                                            ? 'border-emerald-300 bg-emerald-50'
                                            : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <span className={file ? 'text-emerald-500' : 'text-slate-300'}>
                                    <UploadIcon />
                                </span>
                                {file ? (
                                    <>
                                        <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                                        <p className="text-xs text-emerald-500">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-semibold text-slate-600">Drag & drop your CSV here</p>
                                        <p className="text-xs text-slate-400">or click to browse — CSV files only, max 2 MB</p>
                                    </>
                                )}
                            </div>

                            {/* Required columns info */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Required Columns</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['first_name','last_name','phone','gender','date_of_birth','address','religion',
                                      'guardian_phone','admission_date','intake_session',
                                      'campus_id','program_id','program_semester_id','academic_batch_id'].map(c => (
                                        <span key={c} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600">{c}</span>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                                    <XIcon size={4} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2: Preview ── */}
                    {step === 2 && preview && (
                        <div className="space-y-4">
                            {/* Summary badges */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold">
                                    Total: {preview.total}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                                    <CheckIcon /> {validCount} valid
                                </span>
                                {invalidCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 text-sm font-semibold">
                                        <XIcon size={3} /> {invalidCount} with errors
                                    </span>
                                )}
                            </div>

                            {invalidCount > 0 && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
                                    ⚠️ Rows with errors will be <strong>skipped</strong>. Only {validCount} valid rows will be imported.
                                </div>
                            )}

                            <PreviewTable rows={preview.rows} />

                            {error && (
                                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                                    <XIcon size={4} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 3: Result ── */}
                    {step === 3 && result && (
                        <ResultSummary
                            result={result}
                            onClose={handleClose}
                            onImportMore={reset}
                        />
                    )}
                </div>

                {/* Footer actions */}
                {step < 3 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/60 rounded-b-2xl">
                        <div className="flex gap-2">
                            {step === 2 && (
                                <button
                                    onClick={() => { setStep(1); setError(''); }}
                                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    ← Back
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>

                            {step === 1 && (
                                <button
                                    onClick={handlePreview}
                                    disabled={!file || loading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                                >
                                    {loading ? (
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : null}
                                    {loading ? 'Validating...' : 'Validate & Preview →'}
                                </button>
                            )}

                            {step === 2 && (
                                <button
                                    onClick={handleImport}
                                    disabled={validCount === 0 || loading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                                >
                                    {loading ? (
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : null}
                                    {loading ? 'Importing...' : `Import ${validCount} Student${validCount !== 1 ? 's' : ''}`}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportModal;
