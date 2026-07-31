import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import AddExtraIncomeModal from './AddExtraIncomeModal';
import Pagination from '../UI/Pagination';

const ExtraIncomeList = () => {
    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [categories, setCategories] = useState([]);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const { user } = useAuth();
    const { showSuccess, showError } = useNotifications();

    const canCreate = user?.permissions_list?.includes('create_extra_incomes') || user?.roles?.some(r => r.name === 'super_admin');
    const canEdit = user?.permissions_list?.includes('edit_extra_incomes') || user?.roles?.some(r => r.name === 'super_admin');
    const canDelete = user?.permissions_list?.includes('delete_extra_incomes') || user?.roles?.some(r => r.name === 'super_admin');

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/income-categories');
            setCategories(response.data.data.data || response.data.data); // depending on pagination
        } catch (error) {
            console.error('Failed to fetch categories');
        }
    };

    const fetchIncomes = async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('page', page);
            if (searchQuery) params.append('search', searchQuery);
            if (filterCategory) params.append('category_id', filterCategory);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await axios.get(`/api/extra-incomes?${params.toString()}`);
            setIncomes(response.data.data.data);
            setPagination({
                current_page: response.data.data.current_page,
                last_page: response.data.data.last_page,
                total: response.data.data.total,
                per_page: response.data.data.per_page
            });
        } catch (error) {
            showError('Failed to fetch income records');
        } finally {
            setLoading(false);
        }
    };

    // Fetch categories once
    useEffect(() => {
        fetchCategories();
    }, []);

    // Reset page to 1 when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, current_page: 1 }));
    }, [searchQuery, filterCategory, startDate, endDate]);

    useEffect(() => {
        fetchIncomes(pagination.current_page);
    }, [pagination.current_page, searchQuery, filterCategory, startDate, endDate]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this income record?')) {
            try {
                await axios.delete(`/api/extra-incomes/${id}`);
                showSuccess('Income record deleted successfully');
                fetchIncomes(pagination.current_page);
            } catch (error) {
                showError('Failed to delete income record');
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Income Records</h3>
                {canCreate && (
                    <button
                        onClick={() => {
                            setEditingIncome(null);
                            setIsViewOnly(false);
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Record Income
                    </button>
                )}
            </div>

            {/* ── Filter Bar ── */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search form no, method..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    >
                        <option value="">All Categories</option>
                        {Array.isArray(categories) && categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-slate-500"
                        title="Start Date"
                    />
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-slate-500"
                            title="End Date"
                        />
                        <button
                            onClick={() => {
                                setFilterCategory('');
                                setSearchQuery('');
                                setStartDate('');
                                setEndDate('');
                            }}
                            title="Reset Filters"
                            className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-slate-200 bg-white transition-all shadow-sm shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200">
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sr No</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Method</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Form No</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected By</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {incomes.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-8 text-center text-slate-500">
                                        No income records found.
                                    </td>
                                </tr>
                            ) : (
                                incomes.map((income, index) => (
                                    <tr key={income.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 text-slate-900 font-medium">
                                            {(pagination.current_page - 1) * pagination.per_page + index + 1}
                                        </td>
                                        <td className="py-3 px-4 text-slate-900 font-medium">
                                            {new Date(income.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                {income.income_category?.name}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                                            {Number(income.amount).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600">{income.payment_method}</td>
                                        <td className="py-3 px-4 text-slate-600 font-medium">{income.form_number}</td>
                                        <td className="py-3 px-4 text-slate-600">{income.collected_by?.name}</td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingIncome(income);
                                                        setIsViewOnly(true);
                                                        setIsModalOpen(true);
                                                    }}
                                                    title="View Record"
                                                    className="p-2 text-slate-400 hover:text-blue-600 transition-all rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100"
                                                >
                                                    <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingIncome(income);
                                                            setIsViewOnly(false);
                                                            setIsModalOpen(true);
                                                        }}
                                                        title="Edit Record"
                                                        className="p-2 text-slate-400 hover:text-amber-600 transition-all rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100"
                                                    >
                                                        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-10l-1.5 1.5M19 4a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(income.id)}
                                                        title="Delete Record"
                                                        className="p-2 text-slate-400 hover:text-rose-600 transition-all rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
                                                    >
                                                        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {!loading && pagination.total > 0 && (
                <div className="mt-4">
                    <Pagination 
                        currentPage={pagination.current_page}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.per_page}
                        onPageChange={(page) => setPagination(prev => ({ ...prev, current_page: page }))}
                    />
                </div>
            )}

            {isModalOpen && (
                <AddExtraIncomeModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchIncomes(pagination.current_page);
                    }}
                    income={editingIncome}
                    isViewOnly={isViewOnly}
                />
            )}
        </div>
    );
};

export default ExtraIncomeList;
