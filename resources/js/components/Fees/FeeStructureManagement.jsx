import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const FeeStructureManagement = () => {
    const [structures, setStructures] = useState([]);
    const [heads, setHeads] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [batches, setBatches] = useState([]);
    const [campuses, setCampuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        campus_id: '',
        program_id: '',
        academic_batch_id: '',
        items: []
    });
    const [editingId, setEditingId] = useState(null);
    const [viewingStruct, setViewingStruct] = useState(null);
    const { showError, showSuccess } = useNotifications();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [structRes, headRes, progRes, batchRes, campusRes] = await Promise.all([
                axios.get('/api/fee-structures'),
                axios.get('/api/fee-heads'),
                axios.get('/api/programs'),
                axios.get('/api/academic-batches'),
                axios.get('/api/admissions/form-data')
            ]);
            setStructures(structRes.data.data);
            setHeads(headRes.data.data);
            setPrograms(progRes.data.data);
            setBatches(batchRes.data.data);
            setCampuses(campusRes.data.data.campuses);
        } catch (error) {
            showError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { fee_head_id: '', amount: '' }]
        });
    };

    const removeItem = (index) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`/api/fee-structures/${editingId}`, formData);
                showSuccess('Fee structure updated successfully');
            } else {
                await axios.post('/api/fee-structures', formData);
                showSuccess('Fee structure created successfully');
            }
            setShowForm(false);
            setEditingId(null);
            fetchInitialData();
            setFormData({ campus_id: '', program_id: '', academic_batch_id: '', items: [] });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to save fee structure');
        }
    };

    const handleEdit = (struct) => {
        setFormData({
            campus_id: struct.campus_id,
            program_id: struct.program_id,
            academic_batch_id: struct.academic_batch_id,
            items: struct.items.map(i => ({ fee_head_id: i.fee_head_id, amount: i.amount }))
        });
        setEditingId(struct.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this fee structure?')) return;
        try {
            await axios.delete(`/api/fee-structures/${id}`);
            showSuccess('Fee structure deleted successfully');
            fetchInitialData();
        } catch (error) {
            showError('Failed to delete fee structure');
        }
    };

    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Fee Structures</h2>
                    <p className="text-slate-500 text-sm">Create templates for program-specific fees.</p>
                </div>
                <Button onClick={() => {
                    setShowForm(!showForm);
                    if (showForm) {
                        setEditingId(null);
                        setFormData({ campus_id: '', program_id: '', academic_batch_id: '', items: [] });
                    }
                }}>
                    {showForm ? 'Cancel' : 'New Structure'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Campus</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    value={formData.campus_id}
                                    onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Campus</option>
                                    {campuses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Program</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    value={formData.program_id}
                                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                                >
                                    <option value="">All Programs</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    value={formData.academic_batch_id}
                                    onChange={(e) => setFormData({ ...formData, academic_batch_id: e.target.value })}
                                >
                                    <option value="">All Batches</option>
                                    {batches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Fee Heads & Amounts</h3>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    + Add Item
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {formData.items.length === 0 ? (
                                    <p className="text-center py-4 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">No items added yet. Click "+ Add Item" to start.</p>
                                ) : (
                                    formData.items.map((item, index) => (
                                        <div key={index} className="flex gap-4 items-end animate-in fade-in slide-in-from-left-2 duration-200">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fee Head</label>
                                                <select
                                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                                    value={item.fee_head_id}
                                                    onChange={(e) => updateItem(index, 'fee_head_id', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Head</option>
                                                    {heads.map(h => (
                                                        <option key={h.id} value={h.id}>{h.name} ({h.frequency})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-48">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                                    value={item.amount}
                                                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="mb-1 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button type="submit">Save Fee Structure</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Structure Name</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Campus</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Applicability</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Total Items</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {structures.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic text-sm">No fee structures created yet.</td>
                            </tr>
                        ) : (
                            structures.map((struct) => (
                                <tr key={struct.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-700 font-semibold">{struct.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {struct.campus?.name}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {struct.program?.name || 'All Programs'} <br/>
                                        <span className="text-[10px] text-slate-400">{struct.academic_batch?.name || 'All Batches'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {struct.items?.length || 0} Heads
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => setViewingStruct(struct)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="View Details"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(struct)}
                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(struct.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* View Details Modal */}
            {viewingStruct && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{viewingStruct.name}</h3>
                                <p className="text-sm text-slate-500">{viewingStruct.program?.name} | {viewingStruct.academic_batch?.name || 'All Batches'}</p>
                            </div>
                            <button onClick={() => setViewingStruct(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="pb-3">Fee Head</th>
                                        <th className="pb-3">Frequency</th>
                                        <th className="pb-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingStruct.items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                            <td className="py-4 text-sm font-medium text-slate-700">{item.fee_head?.name}</td>
                                            <td className="py-4 text-xs">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                                                    {item.fee_head?.frequency.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-4 text-sm font-bold text-slate-900 text-right">Rs. {item.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-100">
                                        <td colSpan="2" className="pt-4 text-sm font-bold text-slate-800 text-right">Total:</td>
                                        <td className="pt-4 text-lg font-black text-indigo-600 text-right">
                                            Rs. {viewingStruct.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeeStructureManagement;
