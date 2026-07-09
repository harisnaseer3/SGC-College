import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

const FeeHeadManagement = () => {
    const [heads, setHeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        frequency: 'monthly',
        frequency_name: '',
        priority: 0,
        description: ''
    });
    const { showError, showSuccess } = useNotifications();

    useEffect(() => {
        fetchHeads(pagination.current_page);
    }, [pagination.current_page]);

    const fetchHeads = async (page = 1) => {
        try {
            const response = await axios.get('/api/fee-heads', { params: { page } });
            setHeads(response.data.data.data);
            setPagination({
                current_page: response.data.data.current_page,
                last_page: response.data.data.last_page,
                total: response.data.data.total,
                per_page: response.data.data.per_page
            });
        } catch (error) {
            showError('Failed to fetch fee heads');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (head) => {
        setFormData({
            name: head.name,
            frequency: head.frequency,
            frequency_name: head.frequency_name || '',
            priority: head.priority || 0,
            description: head.description || ''
        });
        setEditingId(head.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this fee head?')) return;
        try {
            await axios.delete(`/api/fee-heads/${id}`);
            showSuccess('Fee head deleted successfully');
            fetchHeads(pagination.current_page);
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to delete fee head');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`/api/fee-heads/${editingId}`, formData);
                showSuccess('Fee head updated successfully');
            } else {
                await axios.post('/api/fee-heads', formData);
                showSuccess('Fee head created successfully');
            }
            setShowForm(false);
            setEditingId(null);
            fetchHeads(pagination.current_page);
            setFormData({ name: '', frequency: 'monthly', frequency_name: '', priority: 0, description: '' });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to save fee head');
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
                    <h2 className="text-xl font-bold text-slate-800">Fee Heads</h2>
                    <p className="text-slate-500 text-sm">Define types of fees and their billing frequency.</p>
                </div>
                <Button onClick={() => {
                    if (showForm) {
                        setShowForm(false);
                        setEditingId(null);
                        setFormData({ name: '', frequency: 'monthly', frequency_name: '', priority: 0, description: '' });
                    } else {
                        setShowForm(true);
                    }
                }}>
                    {showForm ? 'Cancel' : 'New Fee Head'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fee Head Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Tuition Fee"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Billing Frequency</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={formData.frequency}
                                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                required
                            >
                                <option value="one_time">One-time</option>
                                <option value="monthly">Monthly</option>
                                <option value="semester">Semester-wise</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Frequency Name</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                value={formData.frequency_name}
                                onChange={(e) => setFormData({ ...formData, frequency_name: e.target.value })}
                            >
                                <option value="">Select Frequency Name</option>
                                <option value="Once at First Fee">Once at First Fee</option>
                                <option value="Monthly Fee">Monthly Fee</option>
                                <option value="Annual Fee">Annual Fee</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority Order</label>
                            <input
                                type="number"
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                placeholder="e.g. 1"
                                min="0"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="2"
                                placeholder="Optional details about this fee type..."
                            ></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <Button type="submit">{editingId ? 'Update Fee Head' : 'Create Fee Head'}</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Frequency</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Frequency Name</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {heads.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-slate-400 italic">No fee heads defined yet.</td>
                            </tr>
                        ) : (
                            heads.map((head) => (
                                <tr key={head.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-500">{head.priority}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700 font-semibold">{head.name}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                            head.frequency === 'monthly' ? 'bg-blue-100 text-blue-700' :
                                            head.frequency === 'semester' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {head.frequency.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{head.frequency_name || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => handleEdit(head)} 
                                                title="Edit"
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-transparent hover:border-amber-100 transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-10l-1.5 1.5M19 4a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(head.id)} 
                                                title="Delete"
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
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

export default FeeHeadManagement;
