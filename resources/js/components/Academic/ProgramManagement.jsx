import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

const EMPTY = { name: '', code: '', description: '', duration_years: 4, total_semesters: 8, structure_type: 'semester', campus_id: '' };

const inputCls = 'w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm';

const ProgramManagement = () => {
    const [programs, setPrograms]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [showForm, setShowForm]     = useState(false);
    const [editing, setEditing]       = useState(null);   // program being edited
    const [campuses, setCampuses]     = useState([]);
    const [formData, setFormData]     = useState(EMPTY);
    const [saving, setSaving]         = useState(false);
    const { showError, showSuccess }  = useNotifications();

    useEffect(() => { fetchPrograms(pagination.current_page); }, [pagination.current_page]);
    useEffect(() => { fetchCampuses(); }, []);

    const fetchPrograms = async (page = 1) => {
        try {
            const res = await axios.get('/api/programs', { params: { page } });
            setPrograms(res.data.data.data);
            setPagination({
                current_page: res.data.data.current_page,
                last_page: res.data.data.last_page,
                total: res.data.data.total,
                per_page: res.data.data.per_page
            });
        } catch { showError('Failed to fetch programs'); }
        finally { setLoading(false); }
    };

    const fetchCampuses = async () => {
        try {
            const res = await axios.get('/api/admissions/form-data');
            setCampuses(res.data.data.campuses);
        } catch { console.error('Failed to fetch campuses'); }
    };

    const openNew = () => { setEditing(null); setFormData(EMPTY); setShowForm(true); };
    const openEdit = (p) => {
        setEditing(p);
        setFormData({ name: p.name, code: p.code || '', description: p.description || '',
            duration_years: p.duration_years, total_semesters: p.total_semesters,
            structure_type: p.structure_type || 'semester', campus_id: p.campus_id || '' });
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditing(null); setFormData(EMPTY); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await axios.put(`/api/programs/${editing.id}`, formData);
                showSuccess('Program updated successfully');
            } else {
                await axios.post('/api/programs', formData);
                showSuccess('Program created successfully');
            }
            closeForm();
            fetchPrograms(pagination.current_page);
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save program');
        } finally { setSaving(false); }
    };

    const handleDelete = async (p) => {
        if (!window.confirm(`Delete program "${p.name}"? This cannot be undone.`)) return;
        try {
            await axios.delete(`/api/programs/${p.id}`);
            showSuccess('Program deleted');
            setPrograms(prev => prev.filter(x => x.id !== p.id));
        } catch { showError('Failed to delete program'); }
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
                    <h2 className="text-xl font-bold text-slate-800">Programs</h2>
                    <p className="text-slate-500 text-sm">Manage academic programs and their structure.</p>
                </div>
                <Button onClick={showForm ? closeForm : openNew}>
                    {showForm ? 'Cancel' : 'New Program'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">
                        {editing ? `Editing: ${editing.name}` : 'New Program'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Program Name</label>
                            <input type="text" className={inputCls} value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                            <input type="text" className={inputCls} value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Campus</label>
                            <select className={inputCls} value={formData.campus_id}
                                onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })} required>
                                <option value="">Select Campus</option>
                                {campuses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Structure Type (Fee & Term System)</label>
                            <select className={inputCls} value={formData.structure_type}
                                onChange={(e) => setFormData({ ...formData, structure_type: e.target.value,
                                    total_semesters: e.target.value === 'monthly' ? 12 : (e.target.value === 'annual' ? 4 : 8) })} required>
                                <option value="semester">Semester-wise (Every 6 Months)</option>
                                <option value="monthly">Monthly System (Every Month)</option>
                                <option value="annual">Annual System (Every Year)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Years)</label>
                                <input type="number" className={inputCls} value={formData.duration_years}
                                    onChange={(e) => setFormData({ ...formData, duration_years: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {formData.structure_type === 'monthly' ? 'Total Months' : (formData.structure_type === 'annual' ? 'Total Years' : 'Total Semesters')}
                                </label>
                                <input type="number" className={inputCls} value={formData.total_semesters}
                                    onChange={(e) => setFormData({ ...formData, total_semesters: e.target.value })} required />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea className={inputCls} rows="2" value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <Button type="submit" loading={saving}>
                                {editing ? 'Save Changes' : 'Create Program'}
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
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Campus</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Structure</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {programs.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No programs defined yet.</td></tr>
                        ) : programs.map((p) => (
                            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-800 font-semibold">{p.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">{p.code || '—'}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{p.campus?.name || '—'}</td>
                                <td className="px-6 py-4 text-xs">
                                    <span className={`px-2 py-1 rounded-md font-bold uppercase ${
                                        p.structure_type === 'monthly'
                                            ? 'bg-purple-100 text-purple-700'
                                            : p.structure_type === 'annual'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {p.structure_type || 'semester'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {p.duration_years} yrs ({p.total_semesters} {p.structure_type === 'monthly' ? 'months' : (p.structure_type === 'annual' ? 'years' : 'semesters')})
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEdit(p)} title="Edit"
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-transparent hover:border-amber-100 transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-10l-1.5 1.5M19 4a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDelete(p)} title="Delete"
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

            {pagination.total > 0 && (
                <Pagination 
                    currentPage={pagination.current_page}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.per_page}
                    onPageChange={(page) => setPagination(prev => ({ ...prev, current_page: page }))}
                />
            )}
        </div>
    );
};

export default ProgramManagement;
