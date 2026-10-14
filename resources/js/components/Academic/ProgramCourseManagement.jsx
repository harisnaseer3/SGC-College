import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

const EMPTY = { 
    name: '', 
    code: '', 
    description: '',
    duration_value: 1, 
    duration_unit: 'years', 
    duration_years: 1, 
    total_semesters: 2, 
    structure_type: 'semester', 
    requires_batch: true,
    campus_id: '', 
    branches: [] 
};

const inputCls = 'w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm';

const formatDuration = (p) => {
    if (p.duration_unit && p.duration_value) {
        return `${p.duration_value} ${p.duration_unit}`;
    }
    return `${p.duration_years || 1} yrs`;
};

const getPeriodUnitLabel = (structureType) => {
    switch (structureType) {
        case 'monthly': return 'months';
        case 'weekly':  return 'weeks';
        case 'annual':  return 'years';
        default:        return 'semesters';
    }
};

export const isShortCourseRolling = (p) => {
    if (!p) return false;
    if (p.requires_batch === false || p.requires_batch === 0 || p.requires_batch === '0') return true;
    if (p.requires_batch === true || p.requires_batch === 1 || p.requires_batch === '1') return false;
    const name = (p.name || '').toLowerCase();
    const isDegree = /f\.?s\.?c|matric|degree|bachelor|bs\b|master|inter/i.test(name);
    if (isDegree) return false;

    if (p.duration_unit === 'weeks' || p.structure_type === 'weekly' || p.structure_type === 'monthly') return true;
    if (p.duration_unit === 'months') {
        const months = Number(p.duration_value || p.total_semesters || 0);
        if (months <= 12) return true;
    }
    if (name.includes('short course') || name.includes('certificate') || name.includes('month') || name.includes('web dev') || name.includes('bootcamp')) {
        return true;
    }
    return false;
};

const ProgramManagement = () => {
    const [programs, setPrograms]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [showForm, setShowForm]     = useState(false);
    const [editing, setEditing]       = useState(null);   // program being edited
    const [campuses, setCampuses]     = useState([]);
    const [formData, setFormData]     = useState(EMPTY);
    const [newBranch, setNewBranch]   = useState('');
    const [saving, setSaving]         = useState(false);
    const { showError, showSuccess }  = useNotifications();

    useEffect(() => { fetchPrograms(pagination.current_page); }, [pagination.current_page]);
    useEffect(() => { fetchCampuses(); }, []);

    useEffect(() => {
        const handleCustomPerPage = () => {
            fetchPrograms(1);
        };
        window.addEventListener('perPageChange', handleCustomPerPage);
        return () => window.removeEventListener('perPageChange', handleCustomPerPage);
    }, []);

    const fetchPrograms = async (page = 1) => {
        try {
            const perPage = Number(localStorage.getItem('per_page')) || 10;
            const res = await axios.get('/api/programs', { params: { page, per_page: perPage } });
            setPrograms(res.data.data.data);
            setPagination({
                current_page: res.data.data.current_page,
                last_page:    res.data.data.last_page,
                total:        res.data.data.total,
                per_page:     res.data.data.per_page,
            });
        } catch {
            showError('Failed to fetch programs');
        } finally {
            setLoading(false);
        }
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
        const unit = p.duration_unit || 'years';
        const val = p.duration_value ?? (unit === 'years' ? p.duration_years : (unit === 'months' ? (p.duration_years * 12) : 1));
        setFormData({ 
            name: p.name, 
            code: p.code || '', 
            description: p.description || '',
            duration_unit: unit,
            duration_value: val,
            duration_years: p.duration_years ?? 1, 
            total_semesters: p.total_semesters,
            structure_type: p.structure_type || 'semester', 
            requires_batch: isShortCourseRolling(p) ? false : (p.requires_batch !== undefined ? Boolean(p.requires_batch) : true),
            campus_id: p.campus_id || '', 
            branches: p.branches || [] 
        });
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setEditing(null); setFormData(EMPTY); setNewBranch(''); };

    // Handler when structure_type changes: suggest sane default duration and period count
    const handleStructureChange = (newType) => {
        let suggestedUnit = formData.duration_unit;
        let suggestedVal = formData.duration_value;
        let suggestedTerms = formData.total_semesters;
        let suggestedRequiresBatch = formData.requires_batch;

        if (newType === 'monthly') {
            suggestedUnit = 'months';
            suggestedVal = formData.duration_unit === 'months' ? formData.duration_value : 3;
            suggestedTerms = suggestedVal;
            suggestedRequiresBatch = false;
        } else if (newType === 'weekly') {
            suggestedUnit = 'weeks';
            suggestedVal = formData.duration_unit === 'weeks' ? formData.duration_value : 6;
            suggestedTerms = suggestedVal;
            suggestedRequiresBatch = false;
        } else if (newType === 'annual') {
            suggestedUnit = 'years';
            suggestedVal = formData.duration_unit === 'years' ? formData.duration_value : 2;
            suggestedTerms = suggestedVal;
            suggestedRequiresBatch = true;
        } else { // semester
            suggestedUnit = 'years';
            suggestedVal = formData.duration_unit === 'years' ? formData.duration_value : 4;
            suggestedTerms = suggestedVal * 2;
            suggestedRequiresBatch = true;
        }

        setFormData({
            ...formData,
            structure_type: newType,
            duration_unit: suggestedUnit,
            duration_value: suggestedVal,
            total_semesters: suggestedTerms,
            requires_batch: suggestedRequiresBatch
        });
    };

    const handleDurationUnitChange = (unit) => {
        let terms = formData.total_semesters;
        const val = parseInt(formData.duration_value) || 1;
        if (formData.structure_type === 'monthly' && unit === 'months') {
            terms = val;
        } else if (formData.structure_type === 'weekly' && unit === 'weeks') {
            terms = val;
        } else if (formData.structure_type === 'semester' && unit === 'years') {
            terms = val * 2;
        }
        setFormData({
            ...formData,
            duration_unit: unit,
            total_semesters: terms
        });
    };

    const handleDurationValueChange = (valStr) => {
        const val = parseInt(valStr) || 1;
        let terms = formData.total_semesters;
        if (formData.structure_type === 'monthly' && formData.duration_unit === 'months') {
            terms = val;
        } else if (formData.structure_type === 'weekly' && formData.duration_unit === 'weeks') {
            terms = val;
        } else if (formData.structure_type === 'semester' && formData.duration_unit === 'years') {
            terms = val * 2;
        }
        setFormData({
            ...formData,
            duration_value: val,
            total_semesters: terms
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const finalData = { ...formData };
            if (newBranch.trim()) {
                finalData.branches = [...(finalData.branches || []), newBranch.trim()];
            }

            // Calculate duration_years representation for legacy backwards compatibility
            const dVal = parseInt(finalData.duration_value) || 1;
            if (finalData.duration_unit === 'years') {
                finalData.duration_years = dVal;
            } else if (finalData.duration_unit === 'months') {
                finalData.duration_years = Math.max(1, Math.ceil(dVal / 12));
            } else if (finalData.duration_unit === 'weeks') {
                finalData.duration_years = Math.max(1, Math.ceil(dVal / 52));
            }

            if (editing) {
                await axios.put(`/api/programs/${editing.id}`, finalData);
                showSuccess('Program updated successfully');
            } else {
                await axios.post('/api/programs', finalData);
                showSuccess('Program created successfully');
            }
            closeForm();
            fetchPrograms(pagination.current_page);
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save program');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p) => {
        if (!window.confirm(`Delete program "${p.name}"? This action cannot be undone.`)) return;
        try {
            await axios.delete(`/api/programs/${p.id}`);
            showSuccess('Program deleted');
            fetchPrograms(pagination.current_page);
        } catch { showError('Failed to delete program'); }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Programs & Courses</h2>
                    <p className="text-slate-500 text-sm">Manage degree programs, short courses, and academic tenure structures.</p>
                </div>
                <Button onClick={showForm ? closeForm : openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {showForm ? 'Cancel' : 'New Program / Course'}
                </Button>
            </div>

            {/* Create / Edit Form */}
            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-base font-semibold text-slate-800 mb-4">
                        {editing ? `Editing: ${editing.name}` : 'New Program / Short Course'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-rose-500">*</span></label>
                                <input type="text" className={inputCls} value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                <input type="text" className={inputCls} value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Campus <span className="text-rose-500">*</span></label>
                                <select className={inputCls} value={formData.campus_id}
                                    onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })} required>
                                    <option value="">Select Campus</option>
                                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Structure Type & Duration */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-slate-200">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Structure Type (Fee & Term System)</label>
                                <select className={inputCls} value={formData.structure_type}
                                    onChange={(e) => handleStructureChange(e.target.value)}>
                                    <option value="semester">Semester (6-Month Terms - Degrees)</option>
                                    <option value="monthly">Monthly (Short Courses / Certifications)</option>
                                    <option value="weekly">Weekly (Bootcamps / Micro-Courses)</option>
                                    <option value="annual">Annual (Year-based Programs)</option>
                                </select>
                                <p className="text-[11px] text-slate-400 mt-1">Defines how terms and vouchers are scheduled.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Duration <span className="text-rose-500">*</span></label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        className={inputCls} 
                                        value={formData.duration_value}
                                        onChange={(e) => handleDurationValueChange(e.target.value)} 
                                        required 
                                    />
                                    <select 
                                        className={`${inputCls} w-36`} 
                                        value={formData.duration_unit}
                                        onChange={(e) => handleDurationUnitChange(e.target.value)}
                                    >
                                        <option value="weeks">Weeks</option>
                                        <option value="months">Months</option>
                                        <option value="years">Years</option>
                                    </select>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">E.g., 3 Months, 6 Weeks, or 4 Years.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {formData.structure_type === 'weekly' ? 'Total Weeks' : 
                                     formData.structure_type === 'monthly' ? 'Total Months' : 
                                     formData.structure_type === 'annual' ? 'Total Years' : 'Total Semesters'}
                                     <span className="text-rose-500">*</span>
                                </label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    className={inputCls} 
                                    value={formData.total_semesters}
                                    onChange={(e) => setFormData({ ...formData, total_semesters: e.target.value })} 
                                    required 
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Total academic periods created for this program.</p>
                            </div>
                        </div>

                        {/* Batch Requirement Toggle (Short Courses vs Degree Programs) */}
                        <div className="p-4 bg-white rounded-lg border border-slate-200">
                            <label className="block text-sm font-semibold text-slate-800 mb-1">Admission & Batch Enrollment Model</label>
                            <p className="text-xs text-slate-500 mb-3">
                                Choose whether students require an academic cohort batch (e.g. Batch 2024–2028) or can enroll anytime via rolling admissions.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label 
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        formData.requires_batch 
                                            ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' 
                                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="requires_batch" 
                                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                                        checked={formData.requires_batch === true}
                                        onChange={() => setFormData({ ...formData, requires_batch: true })}
                                    />
                                    <div>
                                        <div className="text-sm font-semibold text-slate-800">Cohort-Based (Requires Batches)</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            For Degree/Annual/Semester programs (e.g. GBSN, FSC, Post RN). Students join in fixed batch sessions.
                                        </div>
                                    </div>
                                </label>

                                <label 
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        !formData.requires_batch 
                                            ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' 
                                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="requires_batch" 
                                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                                        checked={formData.requires_batch === false}
                                        onChange={() => setFormData({ ...formData, requires_batch: false })}
                                    />
                                    <div>
                                        <div className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                                            <span>Rolling / Continuous Admission</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">No Batches Needed</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            For Short Courses & Certifications (e.g. Web Development, Spoken English). Any student can enroll at any time and start classes immediately.
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea className={inputCls} rows="2" value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Branches / Groups (optional)</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    className={inputCls}
                                    placeholder="e.g. Morning, Evening, Group A"
                                    value={newBranch}
                                    onChange={(e) => setNewBranch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newBranch.trim()) {
                                                setFormData({ ...formData, branches: [...(formData.branches || []), newBranch.trim()] });
                                                setNewBranch('');
                                            }
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (newBranch.trim()) {
                                            setFormData({ ...formData, branches: [...(formData.branches || []), newBranch.trim()] });
                                            setNewBranch('');
                                        }
                                    }}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium text-sm transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            {formData.branches && formData.branches.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {formData.branches.map((b, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-xs font-semibold">
                                            {b}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, branches: formData.branches.filter((_, i) => i !== idx) });
                                                }}
                                                className="hover:text-rose-600 transition-colors"
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" onClick={closeForm} className="bg-slate-200 hover:bg-slate-300 text-slate-700">Cancel</Button>
                            <Button type="submit" loading={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {editing ? 'Save Changes' : 'Create Program / Course'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Programs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4">Campus</th>
                            <th className="px-6 py-4">Enrollment Model</th>
                            <th className="px-6 py-4">Structure</th>
                            <th className="px-6 py-4">Duration</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {programs.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                                    {p.branches && p.branches.length > 0 && (
                                        <div className="text-[10.5px] text-slate-400 mt-0.5">Branches: {p.branches.join(', ')}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">{p.code || '—'}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{p.campus?.name || '—'}</td>
                                <td className="px-6 py-4">
                                    {isShortCourseRolling(p) ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Rolling / No Batch
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                            Cohort Batches
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                                        p.structure_type === 'monthly'
                                            ? 'bg-purple-100 text-purple-700'
                                            : p.structure_type === 'weekly'
                                            ? 'bg-amber-100 text-amber-700'
                                            : p.structure_type === 'annual'
                                            ? 'bg-teal-100 text-teal-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {p.structure_type || 'semester'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                    {formatDuration(p)} <span className="text-slate-400 font-normal">({p.total_semesters} {getPeriodUnitLabel(p.structure_type)})</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openEdit(p)} title="Edit"
                                            className="text-slate-400 hover:text-indigo-600 transition-colors p-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDelete(p)} title="Delete"
                                            className="text-slate-400 hover:text-rose-600 transition-colors p-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {programs.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-slate-400 text-sm">
                                    No programs or short courses found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
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
