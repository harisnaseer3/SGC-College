import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const EMPTY = { name: '', credit_hours: 3, code: '', description: '' };

const inputCls = 'w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm';

const CourseManagement = () => {
    const [courses, setCourses]      = useState([]);
    const [loading, setLoading]      = useState(true);
    const [showForm, setShowForm]    = useState(false);
    const [editing, setEditing]      = useState(null);
    const [formData, setFormData]    = useState(EMPTY);
    const [saving, setSaving]        = useState(false);
    const { showError, showSuccess } = useNotifications();

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        try {
            const res = await axios.get('/api/courses');
            setCourses(res.data.data);
        } catch { showError('Failed to fetch courses'); }
        finally { setLoading(false); }
    };

    const openNew  = () => { setEditing(null); setFormData(EMPTY); setShowForm(true); };
    const openEdit = (c) => {
        setEditing(c);
        setFormData({ name: c.name, code: c.code || '', credit_hours: c.credit_hours, description: c.description || '' });
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditing(null); setFormData(EMPTY); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await axios.put(`/api/courses/${editing.id}`, formData);
                showSuccess('Course updated successfully');
            } else {
                await axios.post('/api/courses', formData);
                showSuccess('Course created successfully');
            }
            closeForm();
            fetchCourses();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save course');
        } finally { setSaving(false); }
    };

    const handleDelete = async (c) => {
        if (!window.confirm(`Delete course "${c.name}"? This cannot be undone.`)) return;
        try {
            await axios.delete(`/api/courses/${c.id}`);
            showSuccess('Course deleted');
            setCourses(prev => prev.filter(x => x.id !== c.id));
        } catch { showError('Failed to delete course'); }
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
                    <h2 className="text-xl font-bold text-slate-800">Courses</h2>
                    <p className="text-slate-500 text-sm">Manage course catalogue and credit hours.</p>
                </div>
                <Button onClick={showForm ? closeForm : openNew}>
                    {showForm ? 'Cancel' : 'New Course'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">
                        {editing ? `Editing: ${editing.name}` : 'New Course'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Course Name</label>
                            <input type="text" className={inputCls} value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                            <input type="text" className={inputCls} value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Hours</label>
                            <input type="number" className={inputCls} value={formData.credit_hours} min="1"
                                onChange={(e) => setFormData({ ...formData, credit_hours: e.target.value })} required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea className={inputCls} rows="2" value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <Button type="submit" loading={saving}>
                                {editing ? 'Save Changes' : 'Create Course'}
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
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Credit Hours</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No courses defined yet.</td></tr>
                        ) : courses.map((c) => (
                            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-800 font-semibold">{c.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">{c.code || '—'}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{c.credit_hours} hrs</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEdit(c)} title="Edit"
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-transparent hover:border-amber-100 transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-10l-1.5 1.5M19 4a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDelete(c)} title="Delete"
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

export default CourseManagement;
