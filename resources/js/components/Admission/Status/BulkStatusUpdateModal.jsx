import React, { useState } from 'react';
import Button from '../../UI/Button';
import Modal from '../../UI/Modal';
import axios from 'axios';

const BulkStatusUpdateModal = ({ isOpen, onClose, studentIds = [], campuses = [], onDone }) => {
    const [loading, setLoading] = useState(false);
    const [isInternalTransfer, setIsInternalTransfer] = useState(true);
    const [formData, setFormData] = useState({
        status: '',
        action_date: new Date().toISOString().split('T')[0],
        remarks: '',
        target_campus_id: '',
    });
    const [errors, setErrors] = useState({});
    const [result, setResult] = useState(null);

    if (!isOpen) return null;

    const handleClose = () => {
        setFormData({ status: '', action_date: new Date().toISOString().split('T')[0], remarks: '', target_campus_id: '' });
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
            status: formData.status,
            action_date: formData.action_date,
            remarks: formData.remarks || '',
            target_campus_id: (formData.status === 'Transferred' && isInternalTransfer)
                ? formData.target_campus_id || null
                : null,
        };

        try {
            const response = await axios.post('/api/admissions/bulk-status', payload);
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

    const statuses = ['Enrolled', 'Struck Off', 'Passed Out', 'Promoted', 'Transferred', 'Active', 'Pending'];

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Bulk Lifecycle Action (${studentIds.length} selected)`}
            size="md"
        >
            {result ? (
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-semibold text-emerald-800">
                            {result.data?.succeeded?.length ?? 0} student(s) updated successfully.
                        </p>
                    </div>
                    {result.data?.failed?.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1">
                            <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">
                                {result.data.failed.length} failed:
                            </p>
                            {result.data.failed.map((f, i) => (
                                <p key={i} className="text-xs text-rose-600 font-medium">
                                    Student #{f.student_id}: {f.reason}
                                </p>
                            ))}
                        </div>
                    )}
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
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Action Type</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm"
                        >
                            <option value="">Select Action...</option>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {errors.status && <p className="text-rose-500 text-xs mt-1 ml-1 font-medium">{errors.status[0]}</p>}
                    </div>

                    {formData.status === 'Promoted' && (
                        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 flex items-center gap-3 animate-in fade-in">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide leading-none">Promotion</p>
                                <p className="text-[13px] font-medium text-emerald-900 mt-0.5">Each student will advance to their next semester</p>
                            </div>
                        </div>
                    )}

                    {formData.status === 'Transferred' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                <button type="button" onClick={() => setIsInternalTransfer(true)}
                                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${isInternalTransfer ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    INTERNAL
                                </button>
                                <button type="button" onClick={() => setIsInternalTransfer(false)}
                                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${!isInternalTransfer ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    EXTERNAL
                                </button>
                            </div>
                            {isInternalTransfer ? (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Target Campus</label>
                                    <select
                                        value={formData.target_campus_id}
                                        onChange={(e) => setFormData({ ...formData, target_campus_id: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white shadow-sm text-sm"
                                    >
                                        <option value="">Choose Campus...</option>
                                        {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Destination Info</label>
                                    <input
                                        type="text"
                                        placeholder="Institute Name..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white shadow-sm text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Effective Date</label>
                        <input
                            type="date"
                            value={formData.action_date}
                            onChange={(e) => setFormData({ ...formData, action_date: e.target.value })}
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Remarks</label>
                        <textarea
                            rows="2"
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white shadow-sm text-sm resize-none"
                            placeholder="Reason for bulk change..."
                        />
                    </div>

                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        <p className="text-xs font-medium text-amber-700">
                            This will apply <span className="font-bold">{formData.status || 'the selected action'}</span> to all {studentIds.length} selected students.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100 mt-2">
                        <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
                        <Button type="submit" loading={loading} disabled={!formData.status} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                            Apply to {studentIds.length} Students
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default BulkStatusUpdateModal;
