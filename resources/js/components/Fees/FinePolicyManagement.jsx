import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

const FinePolicyManagement = () => {
    const [policies, setPolicies] = useState([]);
    const [heads, setHeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        fee_head_id: '',
        grace_days: 0,
        fine_amount: '',
        fine_type: 'fixed'
    });
    const { showError, showSuccess } = useNotifications();

    useEffect(() => {
        fetchData(pagination.current_page);
    }, [pagination.current_page]);

    const fetchData = async (page = 1) => {
        try {
            const [policyRes, headRes] = await Promise.all([
                axios.get('/api/fee-fine-policies', { params: { page } }),
                axios.get('/api/fee-heads') // Heads don't need pagination for select dropdowns
            ]);
            setPolicies(policyRes.data.data.data);
            setPagination({
                current_page: policyRes.data.data.current_page,
                last_page: policyRes.data.data.last_page,
                total: policyRes.data.data.total,
                per_page: policyRes.data.data.per_page
            });
            setHeads(headRes.data.data.data || headRes.data.data);
        } catch (error) {
            showError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/fee-fine-policies', formData);
            showSuccess('Fine policy created successfully');
            setShowForm(false);
            fetchData(pagination.current_page);
            setFormData({ fee_head_id: '', grace_days: 0, fine_amount: '', fine_type: 'fixed' });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to create fine policy');
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
                    <h2 className="text-xl font-bold text-slate-800">Fine Policies</h2>
                    <p className="text-slate-500 text-sm">Automate late fee application for specific heads.</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'New Policy'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fee Head</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                value={formData.fee_head_id}
                                onChange={(e) => setFormData({ ...formData, fee_head_id: e.target.value })}
                                required
                            >
                                <option value="">Select Head</option>
                                {heads.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Grace Days</label>
                            <input
                                type="number"
                                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                value={formData.grace_days}
                                onChange={(e) => setFormData({ ...formData, grace_days: e.target.value })}
                                min="0"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fine Amount</label>
                            <input
                                type="number"
                                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                value={formData.fine_amount}
                                onChange={(e) => setFormData({ ...formData, fine_amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fine Type</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                value={formData.fine_type}
                                onChange={(e) => setFormData({ ...formData, fine_type: e.target.value })}
                                required
                            >
                                <option value="fixed">Fixed Amount</option>
                                <option value="percentage">Percentage (%)</option>
                            </select>
                        </div>
                        <div className="lg:col-span-4">
                            <Button type="submit">Create Fine Policy</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Fee Head</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-center">Grace Days</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-center">Fine Value</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {policies.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic text-sm">No fine policies defined.</td>
                            </tr>
                        ) : (
                            policies.map((policy) => (
                                <tr key={policy.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-700 font-semibold">{policy.fee_head?.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 text-center">{policy.grace_days} Days</td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <span className="font-bold text-slate-700">
                                            {policy.fine_type === 'fixed' ? `Rs. ${policy.fine_amount}` : `${policy.fine_amount}%`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            title="Delete Policy"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
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

export default FinePolicyManagement;
