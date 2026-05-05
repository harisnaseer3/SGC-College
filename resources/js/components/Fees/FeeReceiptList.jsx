import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

const FeeReceiptList = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        search: ''
    });
    const { showError } = useNotifications();

    useEffect(() => {
        fetchPayments();
    }, [filters.start_date, filters.end_date, pagination.current_page]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current_page,
                start_date: filters.start_date,
                end_date: filters.end_date,
                search: filters.search
            };
            const response = await axios.get('/api/student-fees/payments', { params });
            setPayments(response.data.data.data);
            setPagination({
                current_page: response.data.data.current_page,
                last_page: response.data.data.last_page
            });
        } catch (error) {
            showError('Failed to fetch payments');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination({ ...pagination, current_page: 1 });
        fetchPayments();
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
                    <div>
                        <Button type="submit" className="w-full py-3" disabled={loading}>
                            Apply Filters
                        </Button>
                    </div>
                </form>
            </Card>

            {/* List Section */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Receipts...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : payments.length > 0 ? (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
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
                                        <td className="px-6 py-4 text-emerald-600 font-black text-right">Rs. {Number(payment.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                                title="Print Receipt"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 italic text-sm">No payment records found matching your filters.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <div className="text-xs font-bold text-slate-500 uppercase">
                            Page {pagination.current_page} of {pagination.last_page}
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                disabled={pagination.current_page === 1}
                                onClick={() => setPagination({ ...pagination, current_page: pagination.current_page - 1 })}
                            >
                                Previous
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => setPagination({ ...pagination, current_page: pagination.current_page + 1 })}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default FeeReceiptList;
