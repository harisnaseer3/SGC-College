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
    const [selectedVoucherIds, setSelectedVoucherIds] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    // Parse initial filters from URL
    const [filters, setFilters] = useState({
        month: searchParams.get('month') || '',
        year: searchParams.get('year') || '',
        status: searchParams.get('status') || '',
        search: '',
        program_id: ''
    });

    // Fetch filter metadata on mount
    useEffect(() => {
        const fetchFiltersMetadata = async () => {
            try {
                const response = await axios.get('/api/programs?all=1');
                setPrograms(response.data.data || []);
            } catch (error) {
                console.error('Failed to fetch filter metadata:', error);
            }
        };
        fetchFiltersMetadata();
    }, []);

    // Reset selection on filter or page change
    useEffect(() => {
        setSelectedVoucherIds([]);
    }, [currentPage, filters.month, filters.year, filters.status, filters.search, filters.program_id, sortBy, sortOrder]);

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
    }, [filters.month, filters.year, filters.status, filters.program_id]);

    // Fetch on page or sort change
    useEffect(() => {
        fetchVouchers(currentPage);
    }, [currentPage, sortBy, sortOrder]);

    const fetchVouchers = async (page) => {
        const pageNum = page ?? currentPage;
        setLoading(true);
        try {
            const params = {
                page: pageNum,
                month: filters.month,
                year: filters.year,
                status: filters.status,
                search: filters.search,
                program_id: filters.program_id,
                sort_by: sortBy,
                sort_order: sortOrder
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

    const handleDeleteVoucher = async (id) => {
        if (!window.confirm('Are you sure you want to delete this voucher? This will dissociate its fees and return them to the ledger.')) {
            return;
        }
        try {
            await axios.delete(`/api/student-fees/vouchers/${id}`);
            showSuccess('Voucher deleted successfully');
            fetchVouchers(currentPage);
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to delete voucher');
        }
    };

    const handleBulkDeleteVouchers = async () => {
        if (!window.confirm(`Are you sure you want to delete these ${selectedVoucherIds.length} selected vouchers? This will dissociate their fees and return them to the ledger.`)) {
            return;
        }

        try {
            await axios.delete('/api/student-fees/vouchers', { data: { ids: selectedVoucherIds } });
            showSuccess('Selected vouchers deleted successfully');
            setSelectedVoucherIds([]);
            fetchVouchers(currentPage);
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to delete selected vouchers');
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
            case 'partial': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'unpaid': return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'carried_forward':
            case 'carried fwd':
                return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Generated Vouchers</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage and view all student fee vouchers</p>
                </div>
                <button 
                    onClick={() => navigate('/fees')} 
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    Back to Dashboard
                </button>
            </div>

            {/* Summary Cards matching Fee Analytics Chart colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-5 border-slate-100 bg-white" hover={false}>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Vouchers</span>
                    <h2 className="text-2xl font-black text-slate-800">{pagination.total}</h2>
                    <p className="text-xs text-slate-400 mt-1">Matching current filters</p>
                </Card>

                <Card className="p-5 border-teal-100 bg-teal-50/20" hover={false}>
                    <span className="text-[11px] font-bold text-teal-500 uppercase tracking-wider block mb-1">Total Receivable</span>
                    <h2 className="text-2xl font-black text-teal-700">Rs. {aggregates ? ((aggregates.expected || 0) + (aggregates.arrears || 0)).toLocaleString() : '0'}</h2>
                    <p className="text-xs text-teal-400 mt-1">Expected revenue commitment</p>
                </Card>

                <Card className="p-5 border-fuchsia-100 bg-fuchsia-50/20" hover={false}>
                    <span className="text-[11px] font-bold text-fuchsia-500 uppercase tracking-wider block mb-1">Total Received</span>
                    <h2 className="text-2xl font-black text-fuchsia-700">Rs. {aggregates ? (aggregates.received || 0).toLocaleString() : '0'}</h2>
                    <p className="text-xs text-fuchsia-500 mt-1">Collected revenue</p>
                </Card>

                <Card className="p-5 border-rose-100 bg-rose-50/20" hover={false}>
                    <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block mb-1">Remaining Balance</span>
                    <h2 className="text-2xl font-black text-rose-700">Rs. {aggregates ? (aggregates.balance || 0).toLocaleString() : '0'}</h2>
                    <p className="text-xs text-rose-400 mt-1">Outstanding dues</p>
                </Card>
            </div>

            <Card className="p-6 border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
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
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Program</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                            value={filters.program_id}
                            onChange={(e) => setFilters({ ...filters, program_id: e.target.value })}
                        >
                            <option value="">All Programs</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
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
                            <option value="carried_forward">Carried Forward</option>
                        </select>
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={() => setFilters({ month: '', year: '', status: '', search: '', program_id: '' })}
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200 shadow-sm"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-center w-12">
                                    <input 
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                        checked={vouchers.length > 0 && vouchers.filter(v => v.status === 'unpaid').every(v => selectedVoucherIds.includes(v.id))}
                                        onChange={(e) => {
                                            const unpaidVouchers = vouchers.filter(v => v.status === 'unpaid');
                                            if (e.target.checked) {
                                                const newSelections = [...new Set([...selectedVoucherIds, ...unpaidVouchers.map(v => v.id)])];
                                                setSelectedVoucherIds(newSelections);
                                            } else {
                                                const unpaidIds = unpaidVouchers.map(v => v.id);
                                                setSelectedVoucherIds(selectedVoucherIds.filter(id => !unpaidIds.includes(id)));
                                            }
                                        }}
                                    />
                                </th>
                                <th 
                                    className="px-6 py-4 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest cursor-pointer select-none"
                                    onClick={() => handleSort('id')}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className={sortBy === 'id' ? 'text-indigo-600 font-extrabold' : ''}>Sr #</span>
                                        {sortBy === 'id' && (
                                            <svg className={`w-3.5 h-3.5 text-indigo-600 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-4 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest cursor-pointer select-none"
                                    onClick={() => handleSort('voucher_number')}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className={sortBy === 'voucher_number' ? 'text-indigo-600 font-extrabold' : ''}>Voucher #</span>
                                        {sortBy === 'voucher_number' && (
                                            <svg className={`w-3.5 h-3.5 text-indigo-600 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                                <th 
                                    className="px-6 py-4 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest cursor-pointer select-none"
                                    onClick={() => handleSort('due_date')}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className={sortBy === 'due_date' ? 'text-indigo-600 font-extrabold' : ''}>Due Date</span>
                                        {sortBy === 'due_date' && (
                                            <svg className={`w-3.5 h-3.5 text-indigo-600 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-4 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest text-right cursor-pointer select-none"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span className={sortBy === 'amount' ? 'text-indigo-600 font-extrabold' : ''}>Voucher Amount</span>
                                        {sortBy === 'amount' && (
                                            <svg className={`w-3.5 h-3.5 text-indigo-600 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Arrears</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Receivable</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Received</th>
                                <th 
                                    className="px-6 py-4 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest text-right cursor-pointer select-none"
                                    onClick={() => handleSort('balance_amount')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span className={sortBy === 'balance_amount' ? 'text-indigo-600 font-extrabold' : ''}>Balance</span>
                                        {sortBy === 'balance_amount' && (
                                            <svg className={`w-3.5 h-3.5 text-indigo-600 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-4 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest cursor-pointer select-none"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className={sortBy === 'status' ? 'text-indigo-600 font-extrabold' : ''}>Status</span>
                                        {sortBy === 'status' && (
                                            <svg className={`w-3.5 h-3.5 text-indigo-600 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="12" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Vouchers...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : vouchers.length > 0 ? (
                                vouchers.map((v, index) => {
                                    const voucherAmount = (Number(v.amount) || 0) + (Number(v.fine_amount) || 0) - (Number(v.discount_amount) || 0);
                                    const arrears = Number(v.arrears_amount) || 0;
                                    const receivable = voucherAmount + arrears;
                                    const balance = Number(v.balance_amount) || 0;
                                    const received = Math.max(0, receivable - balance);
                                    const srNo = (pagination.current_page - 1) * pagination.per_page + index + 1;

                                    return (
                                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                {v.status === 'unpaid' ? (
                                                    <input 
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                        checked={selectedVoucherIds.includes(v.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedVoucherIds([...selectedVoucherIds, v.id]);
                                                            } else {
                                                                setSelectedVoucherIds(selectedVoucherIds.filter(id => id !== v.id));
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <input 
                                                        type="checkbox"
                                                        className="rounded border-slate-200 w-4 h-4 cursor-not-allowed opacity-30"
                                                        disabled
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-500 text-sm">{srNo}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 text-sm">{v.voucher_number}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm">{v.student?.first_name} {v.student?.last_name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Roll: {v.student?.roll_number}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                                                {new Date(v.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-black text-right">Rs. {voucherAmount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-amber-600 font-black text-right">Rs. {arrears.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-teal-600 font-black text-right">Rs. {receivable.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-fuchsia-600 font-black text-right">Rs. {received.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-rose-600 font-black text-right">Rs. {balance.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 border rounded-md text-[10px] font-black uppercase tracking-wider ${getStatusColor(v.status)}`}>
                                                    {v.status === 'carried_forward' ? 'carried fwd' : v.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => window.open(`/fees/voucher/${v.student_id}?voucher_number=${v.voucher_number}`, '_blank')}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                                    title="Print Voucher"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                </button>
                                                {v.status === 'unpaid' && (
                                                    <button 
                                                        onClick={() => handleDeleteVoucher(v.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all ml-1" 
                                                        title="Delete Voucher"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="12" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 italic text-sm">No vouchers found matching your criteria.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {aggregates && (
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase tracking-widest">
                                        Total Amounts for Current Filter
                                    </td>
                                    <td className="px-6 py-4 text-slate-800 font-black text-right">Rs. {aggregates.expected.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-amber-600 font-black text-right">Rs. {aggregates.arrears.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-teal-600 font-black text-right">Rs. {(aggregates.expected + aggregates.arrears).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-fuchsia-600 font-black text-right">Rs. {aggregates.received.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-rose-600 font-black text-right">Rs. {aggregates.balance.toLocaleString()}</td>
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
