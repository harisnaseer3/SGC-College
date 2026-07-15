import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Pagination from '../UI/Pagination';

const VoucherList = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useNotifications();

    const [vouchers, setVouchers] = useState([]);
    const [aggregates, setAggregates] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [currentPage, setCurrentPage] = useState(1);
    
    // Parse initial filters from URL
    const [filters, setFilters] = useState({
        month: searchParams.get('month') || '',
        year: searchParams.get('year') || '',
        status: searchParams.get('status') || '',
        search: ''
    });

    const debounceTimer = useRef(null);

    // Debounced search
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setCurrentPage(1);
            fetchVouchers(1);
        }, 400);
        return () => clearTimeout(debounceTimer.current);
    }, [filters.search]);

    // Fetch when filter changes
    useEffect(() => {
        setCurrentPage(1);
        fetchVouchers(1);
    }, [filters.month, filters.year, filters.status]);

    // Fetch on page change
    useEffect(() => {
        fetchVouchers(currentPage);
    }, [currentPage]);

    const fetchVouchers = async (page) => {
        const pageNum = page ?? currentPage;
        setLoading(true);
        try {
            const params = {
                page: pageNum,
                month: filters.month,
                year: filters.year,
                status: filters.status,
                search: filters.search
            };
            const response = await axios.get('/api/student-fees/vouchers-list', { params });
            const payload = response.data.data;
            const data = payload.paginator || payload;
            setVouchers(data.data || []);
            setAggregates(payload.aggregates || null);
            setPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                total: data.total,
                per_page: data.per_page
            });
        } catch (error) {
            showError('Failed to fetch vouchers');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'partial': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'unpaid': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vouchers List</h1>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4"
                >
                    Back to Dashboard
                </button>
            </div>

            <Card className="p-6 border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Search</label>
                        <input 
                            type="text"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            placeholder="Voucher #, Roll No, Name..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Month</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        >
                            <option value="">All Months</option>
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Year</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        >
                            <option value="">All Years</option>
                            {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Status</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sr #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Voucher #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Expected</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Arrears</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Received</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Balance</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Vouchers...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : vouchers.length > 0 ? (
                                vouchers.map((v, index) => {
                                    const expected = (Number(v.amount) || 0) + (Number(v.fine_amount) || 0) - (Number(v.discount_amount) || 0);
                                    const received = Number(v.paid_amount) || 0;
                                    const balance = Math.max(0, expected - received);
                                    const srNo = (pagination.current_page - 1) * pagination.per_page + index + 1;

                                    return (
                                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-500 text-sm">{srNo}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 text-sm">{v.voucher_number}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm">{v.student?.first_name} {v.student?.last_name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Roll: {v.student?.roll_number}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                                                {new Date(v.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-black text-right">Rs. {expected.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-rose-500 font-black text-right">Rs. {(Number(v.arrears_amount) || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-emerald-600 font-black text-right">Rs. {received.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-rose-600 font-black text-right">Rs. {balance.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 border rounded-md text-[10px] font-black uppercase tracking-wider ${getStatusColor(v.status)}`}>
                                                    {v.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => window.open(`/fees/voucher/${v.student_id}?month=${new Date(v.due_date).getMonth() + 1}&year=${new Date(v.due_date).getFullYear()}`, '_blank')}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                                    title="Print Voucher"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="10" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 italic text-sm">No vouchers found matching your criteria.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {aggregates && (
                            <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-right text-xs font-black text-emerald-900 uppercase tracking-widest">
                                        Total Amounts for Current Filter
                                    </td>
                                    <td className="px-6 py-4 text-emerald-800 font-black text-right">Rs. {aggregates.expected.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-rose-800 font-black text-right">Rs. {aggregates.arrears.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-emerald-800 font-black text-right">Rs. {aggregates.received.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-emerald-800 font-black text-right">Rs. {aggregates.balance.toLocaleString()}</td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        )}
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
            </Card>
        </div>
    );
};

export default VoucherList;
