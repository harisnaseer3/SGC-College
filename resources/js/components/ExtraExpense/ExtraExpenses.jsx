import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Pagination from '../UI/Pagination';

const ExtraExpenses = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useNotifications();
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalAmount, setTotalAmount] = useState(0);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingExpense, setViewingExpense] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    
    // Sorting
    const [sortField, setSortField] = useState('expense_date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [formData, setFormData] = useState({
        expense_category_id: '',
        title: '',
        amount: '',
        quantity: '',
        supplier: '',
        expense_date: '',
        description: '',
        attachment: null
    });
    const [submitting, setSubmitting] = useState(false);

    // Filters
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const canCreate = user?.permissions_list?.includes('create_expenses') || user?.roles?.some(r => r.name === 'super_admin');
    const canEdit = user?.permissions_list?.includes('edit_expenses') || user?.roles?.some(r => r.name === 'super_admin');
    const canDelete = user?.permissions_list?.includes('delete_expenses') || user?.roles?.some(r => r.name === 'super_admin');
    const canChangeStatus = user?.permissions_list?.includes('change_expense_status') || user?.roles?.some(r => r.name === 'super_admin');

    // Reset to page 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterCategory, filterStatus]);

    // Fetch whenever page or refreshKey changes
    useEffect(() => {
        fetchCategories();
        fetchExpenses(currentPage);
    }, [filterCategory, filterStatus, currentPage, refreshKey, sortField, sortDirection]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/expense-categories?all=1');
            setCategories(response.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchExpenses = async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('page', page);
            if (filterCategory) params.append('category_id', filterCategory);
            if (filterStatus) params.append('status', filterStatus);
            params.append('sort_by', sortField);
            params.append('sort_dir', sortDirection);

            const response = await axios.get(`/api/expenses?${params.toString()}`);
            setExpenses(response.data.data.data);
            setTotalAmount(response.data.total_amount || 0);
            setPagination({
                current_page: response.data.data.current_page,
                last_page: response.data.data.last_page,
                total: response.data.data.total,
                per_page: response.data.data.per_page
            });
        } catch (error) {
            showError('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (expense = null) => {
        if (expense) {
            setEditingExpense(expense);
            setFormData({
                expense_category_id: expense.expense_category_id,
                title: expense.title,
                amount: expense.amount,
                quantity: expense.quantity || '',
                supplier: expense.supplier || '',
                expense_date: expense.expense_date.substring(0, 10),
                description: expense.description || '',
                attachment: null
            });
        } else {
            setEditingExpense(null);
            setFormData({
                expense_category_id: '',
                title: '',
                amount: '',
                quantity: '',
                supplier: '',
                expense_date: new Date().toISOString().substring(0, 10),
                description: '',
                attachment: null
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== '') {
                data.append(key, formData[key]);
            }
        });

        if (editingExpense) {
            data.append('_method', 'PUT');
        }

        try {
            if (editingExpense) {
                await axios.post(`/api/expenses/${editingExpense.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showSuccess('Expense updated successfully');
            } else {
                await axios.post('/api/expenses', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showSuccess('Expense recorded successfully');
            }
            setIsModalOpen(false);
            if (!editingExpense) {
                // Reset filters so the new record is always visible
                setFilterCategory('');
                setFilterStatus('');
            }
            setRefreshKey(k => k + 1);
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to save expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            await axios.delete(`/api/expenses/${id}`);
            showSuccess('Expense deleted successfully');
            setRefreshKey(k => k + 1);
        } catch (error) {
            showError('Failed to delete expense');
        }
    };

    const handleStatusChange = async (expense, newStatus) => {
        if (!canChangeStatus) return;
        try {
            await axios.patch(`/api/expenses/${expense.id}/status`, { status: newStatus });
            showSuccess(`Status updated to ${newStatus}`);
            setRefreshKey(k => k + 1);
        } catch (error) {
            showError('Failed to update status');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-100 text-amber-700',
            in_progress: 'bg-blue-100 text-blue-700',
            reimbursed: 'bg-emerald-100 text-emerald-700'
        };
        const labels = {
            pending: 'Pending',
            in_progress: 'In Progress',
            reimbursed: 'Reimbursed'
        };
        return <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${styles[status]}`}>{labels[status]}</span>;
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const renderSortableHeader = (label, field) => {
        const isSorted = sortField === field;
        return (
            <th 
                className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                onClick={() => handleSort(field)}
            >
                <div className="flex items-center gap-1">
                    {label}
                    <span className="ml-1 flex items-center text-slate-400">
                        {isSorted ? (
                            sortDirection === 'asc' ? (
                                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            ) : (
                                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                            )
                        ) : (
                            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                        )}
                    </span>
                </div>
            </th>
        );
    };

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Expense Records</h3>
                <div className="flex gap-3 items-center">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 font-bold text-slate-700">
                        Total: <span className="text-indigo-600">Rs. {Number(totalAmount).toLocaleString()}</span>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                        >
                            + Record Expense
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-t-xl border border-slate-200 flex gap-4 border-b-0">
                <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-sm font-medium outline-none"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-sm font-medium outline-none"
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="reimbursed">Reimbursed</option>
                </select>
            </div>

            <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sr No</th>
                                {renderSortableHeader('Bill No', 'bill_no')}
                                {renderSortableHeader('Date', 'expense_date')}
                                {renderSortableHeader('Title / Category', 'title')}
                                {renderSortableHeader('Qty', 'quantity')}
                                {renderSortableHeader('Supplier', 'supplier')}
                                {renderSortableHeader('Amount', 'amount')}
                                {renderSortableHeader('Status', 'status')}
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Attachment</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">Loading...</td>
                                </tr>
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">No expenses found.</td>
                                </tr>
                            ) : (
                                expenses.map((exp, index) => (
                                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm font-medium text-slate-600">
                                            {(pagination.current_page - 1) * pagination.per_page + index + 1}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-indigo-600">
                                            {exp.bill_no || '---'}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-600">
                                            {new Date(exp.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{exp.title}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{exp.category?.name}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 font-medium">{exp.quantity || <span className="text-slate-300">—</span>}</td>
                                        <td className="p-4 text-sm text-slate-600">{exp.supplier || <span className="text-slate-300">—</span>}</td>
                                        <td className="p-4 font-bold text-slate-900">Rs. {Number(exp.amount).toLocaleString()}</td>
                                        <td className="p-4">
                                            {canChangeStatus ? (
                                                <select
                                                    value={exp.status}
                                                    onChange={(e) => handleStatusChange(exp, e.target.value)}
                                                    className="bg-slate-50 border border-slate-200 rounded text-xs font-bold p-1 outline-none cursor-pointer"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="reimbursed">Reimbursed</option>
                                                </select>
                                            ) : (
                                                getStatusBadge(exp.status)
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {exp.attachment_url ? (
                                                <a href={exp.attachment_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm font-medium flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                    View
                                                </a>
                                            ) : <span className="text-slate-400 text-sm">-</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingExpense(exp)}
                                                    title="View Details"
                                                    className="p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                                                >
                                                    <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenModal(exp)}
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
                                                        onClick={() => handleDelete(exp.id)}
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
                {pagination.total > 0 && (
                    <Pagination 
                        currentPage={pagination.current_page}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.per_page}
                        onPageChange={(page) => setCurrentPage(page)}
                    />
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingExpense ? 'Edit Expense' : 'Record Expense'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                    placeholder="e.g. Printer Repair"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={formData.expense_category_id}
                                        onChange={(e) => setFormData({...formData, expense_category_id: e.target.value})}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                    >
                                        <option value="">Select...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.expense_date}
                                        onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                                    <input
                                        type="text"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                        placeholder="e.g. 2 kg, 5 pcs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Supplier / Shop</label>
                                    <input
                                        type="text"
                                        value={formData.supplier}
                                        onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                        placeholder="e.g. Al-Noor Store"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium min-h-[80px]"
                                    placeholder="Optional details..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attachment (Receipt/Invoice)</label>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={(e) => setFormData({...formData, attachment: e.target.files[0]})}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewingExpense && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">Expense Details</h2>
                            <button onClick={() => setViewingExpense(null)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Bill No</div>
                                    <div className="font-semibold text-slate-800 text-lg">{viewingExpense.bill_no || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Date</div>
                                    <div className="font-semibold text-slate-800">{new Date(viewingExpense.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Title</div>
                                    <div className="font-semibold text-slate-800">{viewingExpense.title}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Category</div>
                                    <div className="font-semibold text-slate-800">{viewingExpense.category?.name}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Amount</div>
                                    <div className="font-bold text-indigo-600 text-lg">Rs. {Number(viewingExpense.amount).toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Status</div>
                                    <div className="mt-1">{getStatusBadge(viewingExpense.status)}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Quantity</div>
                                    <div className="font-semibold text-slate-800">{viewingExpense.quantity || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">Supplier</div>
                                    <div className="font-semibold text-slate-800">{viewingExpense.supplier || 'N/A'}</div>
                                </div>
                            </div>
                            {viewingExpense.description && (
                                <div className="mt-4">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Description</div>
                                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg mt-1 whitespace-pre-wrap border border-slate-100">{viewingExpense.description}</div>
                                </div>
                            )}
                            {viewingExpense.attachment_url && (
                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Attachment</div>
                                    <a href={viewingExpense.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold hover:bg-indigo-100 transition-colors border border-indigo-100">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        View Attached Receipt / Invoice
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtraExpenses;
