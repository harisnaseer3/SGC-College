import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const EMPTY = { name: '', is_active: true, campus_id: '' };

const inputCls = 'w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm';

const BatchManagement = () => {
    const [batches, setBatches]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [showForm, setShowForm]     = useState(false);
    const [editing, setEditing]       = useState(null);
    const [campuses, setCampuses]     = useState([]);
    const [formData, setFormData]     = useState(EMPTY);
    const [saving, setSaving]         = useState(false);
    const { showSuccess, showError }  = useNotifications();

    useEffect(() => { fetchBatches(); fetchCampuses(); }, []);

    const fetchBatches = async () => {
        try {
            const res = await axios.get('/api/academic-batches');
            setBatches(res.data.data);
        } catch { showError('Failed to fetch batches'); }
        finally { setLoading(false); }
    };

    const fetchCampuses = async () => {
        try {
            const res = await axios.get('/api/admissions/form-data');
            setCampuses(res.data.data.campuses);
        } catch { console.error('Failed to fetch campuses'); }
    };

    const openNew  = () => { setEditing(null); setFormData(EMPTY); setShowForm(true); };
    const openEdit = (b) => {
        setEditing(b);
        setFormData({ name: b.name, is_active: b.is_active, campus_id: b.campus_id || '' });
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditing(null); setFormData(EMPTY); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await axios.put(`/api/academic-batches/${editing.id}`, formData);
                showSuccess('Batch updated successfully');
            } else {
                await axios.post('/api/academic-batches', formData);
                showSuccess('Batch created successfully');
            }
            closeForm();
            fetchBatches();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save batch');
        } finally { setSaving(false); }
    };

    const handleDelete = async (b) => {
        if (!window.confirm(`Delete batch "${b.name}"? This cannot be undone.`)) return;
        try {
            await axios.delete(`/api/academic-batches/${b.id}`);
            showSuccess('Batch deleted');
            setBatches(prev => prev.filter(x => x.id !== b.id));
        } catch { showError('Failed to delete batch'); }
    };

    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Academic Batches</h2>
                    <p className="text-slate-500 text-sm">Manage student intake batches per campus.</p>
                </div>
                <Button onClick={showForm ? closeForm : openNew}>
                    {showForm ? 'Cancel' : 'New Batch'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">
                        {editing ? `Editing: ${editing.name}` : 'New Batch'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Batch Name (e.g. 2023-2027)</label>
                            <input type="text" className={inputCls} value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Campus</label>
                            <select className={inputCls} value={formData.campus_id}
                                onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })} required>
                                <option value="">Select Campus</option>
                                {campuses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="checkbox" id="is_active" checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active Batch</label>
                        </div>
                        <div className="md:col-span-2 mt-2">
                            <Button type="submit" loading={saving}>
                                {editing ? 'Save Changes' : 'Create Batch'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Campus</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batches.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No batches defined yet.</td></tr>
                        ) : batches.map((b) => (
                            <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-800 font-semibold">{b.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{b.campus?.name || '—'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                        b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {b.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEdit(b)} title="Edit"
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-transparent hover:border-amber-100 transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-10l-1.5 1.5M19 4a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDelete(b)} title="Delete"
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchManagement;
