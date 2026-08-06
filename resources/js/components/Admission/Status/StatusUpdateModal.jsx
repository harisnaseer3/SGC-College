import React, { useState, useEffect } from 'react';
import Button from '../../UI/Button';
import Modal from '../../UI/Modal';
import axios from 'axios';

const StatusUpdateModal = ({ isOpen, onClose, student, onStatusUpdated, campuses = [] }) => {
    const [loading, setLoading] = useState(false);
    const [isInternalTransfer, setIsInternalTransfer] = useState(true);
    const [formData, setFormData] = useState({
        status: '',
        action_date: new Date().toISOString().split('T')[0],
        remarks: '',
        target_campus_id: '',
        metadata: {}
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (student) {
            setFormData(prev => ({
                ...prev,
                status: student.status || '',
                target_campus_id: '',
                remarks: ''
            }));
            setErrors({});
        }
    }, [student, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const submissionData = {
            ...formData,
            target_campus_id: (formData.status === 'Transferred' && isInternalTransfer) 
                ? formData.target_campus_id 
                : null
        };

        try {
            const response = await axios.post(`/api/admissions/${student.id}/status`, submissionData);
            if (response.data.success) {
                onStatusUpdated(response.data.data);
                onClose();
            }
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
            onClose={onClose}
            title="Lifecycle Action"
            size="md"
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* General Error Alert */}
                {errors.error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-in fade-in">
                        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-sm font-semibold">{errors.error[0]}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Action Type</label>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm"
                    >
                        <option value="">Select Action</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.status && <p className="text-rose-500 text-xs mt-1 ml-1 font-medium">{errors.status[0]}</p>}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Effective Date</label>
                    <input
                        type="date"
                        value={formData.action_date}
                        onChange={(e) => setFormData({ ...formData, action_date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm"
                    />
                    {errors.action_date && <p className="text-rose-500 text-xs mt-1 ml-1 font-medium">{errors.action_date[0]}</p>}
                </div>

                {formData.status === 'Promoted' && (
                    <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide leading-none">Promotion</p>
                            <p className="text-[13px] font-medium text-emerald-900 mt-0.5">Move to next semester</p>
                        </div>
                    </div>
                )}

                {formData.status === 'Transferred' && (
                    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                            <button type="button" onClick={() => setIsInternalTransfer(true)} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${isInternalTransfer ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>INTERNAL</button>
                            <button type="button" onClick={() => setIsInternalTransfer(false)} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${!isInternalTransfer ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>EXTERNAL</button>
                        </div>
                        {isInternalTransfer ? (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Target Campus</label>
                                <select
                                    value={formData.target_campus_id}
                                    onChange={(e) => setFormData({ ...formData, target_campus_id: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm"
                                >
                                    <option value="">Choose Campus...</option>
                                    {campuses.filter(c => c.id !== student.campus_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {errors.target_campus_id && <p className="text-rose-500 text-xs mt-1 ml-1 font-medium">{errors.target_campus_id[0]}</p>}
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Destination Info</label>
                                <input
                                    type="text"
                                    placeholder="Institute Name..."
                                    onChange={(e) => setFormData({ ...formData, metadata: { ...formData.metadata, destination: e.target.value } })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm"
                                />
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Remarks</label>
                    <textarea
                        rows="2"
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm resize-none"
                        placeholder="Why this change?"
                    ></textarea>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100 mt-2">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" loading={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg">Confirm</Button>
                </div>
            </form>
        </Modal>
    );
};

export default StatusUpdateModal;
