import React, { useState } from 'react';
import Button from '../../UI/Button';
import Modal from '../../UI/Modal';
import axios from 'axios';

const BulkBatchUpdateModal = ({ isOpen, onClose, studentIds = [], batches = [], onDone }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        academic_batch_id: '',
    });
    const [errors, setErrors] = useState({});
    const [result, setResult] = useState(null);

    if (!isOpen) return null;

    const handleClose = () => {
        setFormData({ academic_batch_id: '' });
        setErrors({});
        setResult(null);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setResult(null);

        const payload = {
            student_ids: studentIds,
            academic_batch_id: formData.academic_batch_id,
        };

        try {
            const response = await axios.post('/api/admissions/bulk-batch', payload);
            setResult(response.data);
            onDone(response.data.data);
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            } else {
                setErrors({ error: [err.response?.data?.message || 'An unexpected error occurred.'] });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Bulk Update Batch (${studentIds.length} selected)`}
            size="md"
        >
            {result ? (
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-semibold text-emerald-800">
                            {result.data?.updated ?? 0} student(s) batch updated successfully.
                        </p>
                    </div>
                    <div className="pt-2">
                        <Button onClick={handleClose} className="w-full">Close</Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-in fade-in">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-semibold">{errors.error[0]}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">New Batch</label>
                        <select
                            value={formData.academic_batch_id}
                            onChange={(e) => setFormData({ ...formData, academic_batch_id: e.target.value })}
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm"
                        >
                            <option value="">Select Batch...</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        {errors.academic_batch_id && <p className="text-rose-500 text-xs mt-1 ml-1 font-medium">{errors.academic_batch_id[0]}</p>}
                    </div>

                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        <p className="text-xs font-medium text-amber-700">
                            This will apply the selected batch to all {studentIds.length} selected students.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100 mt-2">
                        <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
                        <Button type="submit" loading={loading} disabled={!formData.academic_batch_id} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white">
                            Apply to {studentIds.length} Students
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default BulkBatchUpdateModal;
