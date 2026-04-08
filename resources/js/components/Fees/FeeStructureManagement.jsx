import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const FeeStructureManagement = () => {
    const [structures, setStructures] = useState([]);
    const [heads, setHeads] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        program_id: '',
        academic_batch_id: '',
        items: []
    });
    const { showError, showSuccess } = useNotifications();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [structRes, headRes, progRes, batchRes] = await Promise.all([
                axios.get('/api/fee-structures'),
                axios.get('/api/fee-heads'),
                axios.get('/api/programs'),
                axios.get('/api/academic-batches')
            ]);
            setStructures(structRes.data.data);
            setHeads(headRes.data.data);
            setPrograms(progRes.data.data);
            setBatches(batchRes.data.data);
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
            await axios.post('/api/fee-structures', formData);
            showSuccess('Fee structure created successfully');
            setShowForm(false);
            fetchInitialData();
            setFormData({ name: '', program_id: '', academic_batch_id: '', items: [] });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to create fee structure');
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
                <Button onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'New Structure'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Structure Name</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. BSCS Fall 2024 Semester 1"
                                    required
                                />
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
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {struct.program?.name || 'All Programs'} <br/>
                                        <span className="text-[10px] text-slate-400">{struct.academic_batch?.name || 'All Batches'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {struct.items?.length || 0} Heads
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider">View Details</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FeeStructureManagement;
