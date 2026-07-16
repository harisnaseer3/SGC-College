import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

const FeeReceiptList = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalReceived, setTotalReceived] = useState(0);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedReceiptIds, setSelectedReceiptIds] = useState([]);
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        search: ''
    });
    
    // Reset selection on filter or page change
    useEffect(() => {
        setSelectedReceiptIds([]);
    }, [currentPage, filters.start_date, filters.end_date, filters.search]);

    const debounceTimer = useRef(null);
    const { showSuccess, showError } = useNotifications();

    // Debounced live search for text input
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setCurrentPage(1);
            fetchPayments(1);
        }, 400);
        return () => clearTimeout(debounceTimer.current);
    }, [filters.search]);

    // Instant fetch on date changes
    useEffect(() => {
        setCurrentPage(1);
        fetchPayments(1);
    }, [filters.start_date, filters.end_date]);

    // Fetch on page change
    useEffect(() => {
        fetchPayments(currentPage);
    }, [currentPage]);

    const fetchPayments = async (page) => {
        const pageNum = page ?? currentPage;
        setLoading(true);
        try {
            const params = {
                page: pageNum,
                start_date: filters.start_date,
                end_date: filters.end_date,
                search: filters.search
            };
            const response = await axios.get('/api/student-fees/payments', { params });
            const data = response.data.data;
            setPayments(data.paginator.data);
            setPagination({
                current_page: data.paginator.current_page,
                last_page: data.paginator.last_page,
                total: data.paginator.total,
                per_page: data.paginator.per_page
            });
            setTotalReceived(data.total_amount);
        } catch (error) {
            showError('Failed to fetch payments');
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = (e) => { if (e) e.preventDefault(); };
    const handleSearch = (e) => { if (e) e.preventDefault(); };

    const handleDeleteReceipt = async (id) => {
        if (!window.confirm('Are you sure you want to delete this receipt? This will reverse the payment transaction and restore the student\'s unpaid fee balances.')) {
            return;
        }

        try {
            await axios.delete(`/api/student-fees/payments/${id}`);
            showSuccess('Receipt deleted and payment reversed successfully');
            fetchPayments();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to delete receipt');
        }
    };

    const handleBulkDeleteReceipts = async () => {
        if (!window.confirm(`Are you sure you want to delete these ${selectedReceiptIds.length} selected receipts? This will reverse their payments and restore the student's unpaid fee balances.`)) {
            return;
        }

        try {
            await axios.delete('/api/student-fees/payments', { data: { ids: selectedReceiptIds } });
            showSuccess('Selected receipts deleted and payments reversed successfully');
            setSelectedReceiptIds([]);
            fetchPayments(currentPage);
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to delete selected receipts');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filters Section */}
            <Card className="p-6 border-slate-200 shadow-sm">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Search Receipts</label>
                        <div className="relative">
                            <input 
                                type="text"
                                className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                                placeholder="Receipt #, Roll No, Name..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">From Date</label>
                        <input 
                            type="date"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            value={filters.start_date}
                            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">To Date</label>
                        <input 
                            type="date"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            value={filters.end_date}
                            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" className="flex-1 py-3" disabled={loading}>
                            Filter
                        </Button>
                        <button
                            type="button"
                            onClick={() => {
                                setFilters({ start_date: '', end_date: '', search: '' });
                                setCurrentPage(1);
                                fetchPayments(1);
                            }}
                            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200"
                            title="Reset Filters"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </Card>

            {/* List Section */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="text-sm font-bold text-emerald-900 uppercase tracking-widest">Total Received (Filtered)</div>
                        {selectedReceiptIds.length > 0 && (
                            <button
                                onClick={handleBulkDeleteReceipts}
                                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all animate-in fade-in slide-in-from-left-2 duration-300 animate-pulse"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete Selected ({selectedReceiptIds.length})
                            </button>
                        )}
                    </div>
                    <div className="text-xl font-black text-emerald-700">Rs. {Number(totalReceived).toLocaleString()}</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-center w-12">
                                    <input 
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                        checked={payments.length > 0 && payments.every(payment => selectedReceiptIds.includes(payment.id))}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                const newSelections = [...new Set([...selectedReceiptIds, ...payments.map(p => p.id)])];
                                                setSelectedReceiptIds(newSelections);
                                            } else {
                                                const pageIds = payments.map(p => p.id);
                                                setSelectedReceiptIds(selectedReceiptIds.filter(id => !pageIds.includes(id)));
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deposited By</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Receipts...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : payments.length > 0 ? (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-center">
                                            <input 
                                                type="checkbox"
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                checked={selectedReceiptIds.includes(payment.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedReceiptIds([...selectedReceiptIds, payment.id]);
                                                    } else {
                                                        setSelectedReceiptIds(selectedReceiptIds.filter(id => id !== payment.id));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-900 text-sm">{payment.receipt_number}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-sm">{payment.student?.first_name} {payment.student?.last_name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Roll: {payment.student?.roll_number}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                                            {new Date(payment.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase">
                                                {payment.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs italic">{payment.transaction_id || 'N/A'}</td>
                                        <td className="px-6 py-4 font-medium text-slate-700 text-sm">{payment.receiver?.name || '-'}</td>
                                        <td className="px-6 py-4 text-emerald-600 font-black text-right">Rs. {Number(payment.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => window.open(`/fees/receipt/${payment.id}`, '_blank')}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                                    title="Print Receipt"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteReceipt(payment.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                                                    title="Delete Receipt & Reverse Transaction"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 italic text-sm">No payment records found matching your filters.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.total > 0 && (
                    <Pagination 
                        currentPage={pagination.current_page}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.per_page}
                        onPageChange={(page) => setCurrentPage(page)}
                    />
                )}
            </Card>
        </div>
    );
};

export default FeeReceiptList;
