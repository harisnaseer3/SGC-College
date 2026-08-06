import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

const FeeDeposit = () => {
    const [searchMode, setSearchMode] = useState('student'); // 'student' or 'voucher'
    const [search, setSearch] = useState('');
    const [voucherNo, setVoucherNo] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [voucherData, setVoucherData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { showSuccess, showError } = useNotifications();

    const [formData, setFormData] = useState({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Bank Transfer',
        reference_no: '',
        remarks: '',
        selected_bank_account_id: '',
        attachment: null
    });

    // Fetch students based on search
    useEffect(() => {
        if (searchMode !== 'student') return;
        
        const fetchStudents = async () => {
            if (search.length < 3) {
                setStudents([]);
                return;
            }
            setLoading(true);
            try {
                const response = await axios.get(`/api/student-fees?search=${search}&status=Enrolled`);
                const payload = response.data.data;
                setStudents(payload.data || payload || []);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchStudents, 500);
        return () => clearTimeout(timer);
    }, [search, searchMode]);

    const handleStudentSelect = async (fee) => {
        setSelectedStudent(fee);
        setFormData(prev => ({ 
            ...prev, 
            amount: fee.total_balance,
            selected_bank_account_id: fee.student?.campus?.bank_accounts?.[0]?.id || ''
        }));
        
        setLoading(true);
        try {
            const response = await axios.get(`/api/student-fees/ledger/${fee.student_id}`);
            setVoucherData({ fees: response.data.data.fees || [] });
        } catch (error) {
            console.error('Failed to fetch pending fees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVoucherSearch = async (e) => {
        if (e) e.preventDefault();
        if (!voucherNo) return;
        
        setLoading(true);
        setSelectedStudent(null);
        setVoucherData(null);
        
        try {
            const response = await axios.get(`/api/student-fees/voucher-lookup/${voucherNo}`);
            const data = response.data.data;
            setVoucherData(data);
            setSelectedStudent({
                student_id: data.student.id,
                student: data.student,
                total_balance: data.total_balance
            });
            setFormData(prev => ({ 
                ...prev, 
                amount: data.total_balance,
                selected_bank_account_id: data.student?.campus?.bank_accounts?.[0]?.id || ''
            }));
        } catch (error) {
            showError(error.response?.data?.message || 'Voucher not found');
        } finally {
            setLoading(false);
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!selectedStudent) return;

        setSubmitting(true);
        
        let finalRemarks = formData.remarks;
        if (formData.payment_method !== 'Cash' && formData.selected_bank_account_id) {
            const bankAccounts = selectedStudent.student?.campus?.bank_accounts || [];
            const selectedAcc = bankAccounts.find(acc => acc.id.toString() === formData.selected_bank_account_id.toString());
            
            if (selectedAcc) {
                finalRemarks = `Deposited into: ${selectedAcc.bank_name} (A/C: ${selectedAcc.account_number})\n${finalRemarks}`.trim();
            }
        }

        try {
            const data = new FormData();
            data.append('student_id', selectedStudent.student_id);
            if (searchMode === 'voucher' && voucherNo) {
                data.append('voucher_number', voucherNo);
            }
            data.append('amount', formData.amount);
            data.append('payment_date', formData.payment_date);
            data.append('payment_method', formData.payment_method);
            if (formData.reference_no) data.append('reference_no', formData.reference_no);
            if (finalRemarks) data.append('remarks', finalRemarks);
            if (formData.attachment) data.append('attachment', formData.attachment);

            const response = await axios.post('/api/student-fees/deposit', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showSuccess(`Payment of Rs. ${Number(formData.amount).toLocaleString()} recorded successfully. Receipt: ${response.data.data.receipt_number}`);
            resetForm();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedStudent(null);
        setVoucherData(null);
        setSearch('');
        setVoucherNo('');
        setFormData({
            amount: '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'Bank Transfer',
            reference_no: '',
            remarks: '',
            selected_bank_account_id: '',
            attachment: null
        });
    };

    const getInitials = (firstName, lastName) => {
        const f = firstName ? firstName[0] : '';
        const l = lastName ? lastName[0] : '';
        return (f + l).toUpperCase() || 'S';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fee Deposit & Payment Processing</h1>
                        <p className="text-slate-500 font-medium text-xs mt-0.5">Search enrolled students or enter voucher numbers to record official fee receipts.</p>
                    </div>
                </div>

                {selectedStudent && (
                    <button 
                        onClick={resetForm}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all self-start sm:self-center"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset / New Search
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Section: Student & Voucher Discovery */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Search Mode Toggle Tabs */}
                    <div className="p-1.5 bg-slate-200/70 rounded-2xl flex border border-slate-200">
                        <button 
                            onClick={() => { setSearchMode('student'); resetForm(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${searchMode === 'student' ? 'bg-white text-indigo-600 shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Student Search
                        </button>
                        <button 
                            onClick={() => { setSearchMode('voucher'); resetForm(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${searchMode === 'voucher' ? 'bg-white text-indigo-600 shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            By Voucher #
                        </button>
                    </div>

                    {/* Search Input Box */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                        {searchMode === 'student' ? (
                            <div className="relative">
                                <input 
                                    type="text"
                                    className="w-full p-4 pl-12 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                    placeholder="Type Student Name or Roll Number..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {search && (
                                    <button 
                                        onClick={() => setSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleVoucherSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type="text"
                                        className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 font-bold text-sm tracking-wider uppercase focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        placeholder="Enter Voucher Number..."
                                        value={voucherNo}
                                        onChange={(e) => setVoucherNo(e.target.value)}
                                    />
                                    <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading || !voucherNo}
                                    className="px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-indigo-200"
                                >
                                    Search
                                </button>
                            </form>
                        )}

                        {loading && (
                            <div className="mt-4 flex items-center justify-center py-6 gap-3 text-indigo-600 font-semibold text-xs">
                                <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                Searching records...
                            </div>
                        )}

                        {/* Search Results List */}
                        {!loading && searchMode === 'student' && students.length > 0 && !selectedStudent && (
                            <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Matching Students ({students.length})</div>
                                {students.map((fee) => (
                                    <button
                                        key={fee.student_id}
                                        onClick={() => handleStudentSelect(fee)}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                                                {getInitials(fee.student?.first_name, fee.student?.last_name)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                                    {fee.student?.first_name} {fee.student?.last_name}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                    Roll No: <span className="font-semibold text-slate-700">{fee.student?.roll_number || 'N/A'}</span> • {fee.student?.program?.name}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Dues</div>
                                            <div className="text-sm font-black text-rose-600">Rs. {Number(fee.total_balance).toLocaleString()}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {!loading && searchMode === 'student' && search.length >= 3 && students.length === 0 && (
                            <div className="mt-4 p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <p className="text-slate-500 font-medium text-xs">No matching enrolled students found for "{search}".</p>
                            </div>
                        )}
                    </div>

                    {/* Selected Student Details Card */}
                    {selectedStudent && (
                        <div className="space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                
                                <div className="relative flex justify-between items-start mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                                            {getInitials(selectedStudent.student?.first_name, selectedStudent.student?.last_name)}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black tracking-tight">{selectedStudent.student?.first_name} {selectedStudent.student?.last_name}</h2>
                                            <p className="text-slate-400 font-semibold text-xs mt-0.5">
                                                Roll No: <span className="text-white font-bold">{selectedStudent.student?.roll_number || '-'}</span> • Adm No: <span className="text-white font-bold">{selectedStudent.student?.admission_number || '-'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={resetForm}
                                        title="Clear Selection"
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="relative grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Program / Class</div>
                                        <div className="font-bold text-white truncate">{selectedStudent.student?.program?.name || selectedStudent.student?.academic_class?.name || '-'}</div>
                                    </div>
                                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Dues</div>
                                        <div className="font-black text-rose-400 text-base">Rs. {Number(selectedStudent.total_balance).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Pending Fee Breakdown List */}
                            {voucherData && (() => {
                                const isVoucherMode = searchMode === 'voucher';
                                const payableFees = voucherData.fees.filter(f => f.status !== 'carried_forward');

                                const currentFees = payableFees.filter(fee => {
                                    if (isVoucherMode) {
                                        return fee.voucher_number === voucherNo;
                                    }
                                    const maxSem = Math.max(...payableFees.map(f => Number(f.semester_number) || 0), 1);
                                    return (Number(fee.semester_number) || 0) === maxSem;
                                });
                                
                                const arrearsFees = payableFees.filter(fee => {
                                    if (isVoucherMode) {
                                        return fee.voucher_number !== voucherNo;
                                    }
                                    const maxSem = Math.max(...payableFees.map(f => Number(f.semester_number) || 0), 1);
                                    return (Number(fee.semester_number) || 0) < maxSem;
                                });
                                
                                const arrearsTotal = arrearsFees.reduce((sum, fee) => sum + Number(fee.balance_amount), 0);

                                return (
                                    <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                {searchMode === 'voucher' ? `Voucher #${voucherNo} Details` : 'Pending Fee Breakdown'}
                                            </h4>
                                            <span className="text-[11px] font-bold text-slate-400">{currentFees.length + (arrearsTotal > 0 ? 1 : 0)} items</span>
                                        </div>
                                        
                                        <div className="space-y-2 text-xs">
                                            {currentFees.map(fee => (
                                                <div key={fee.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                                                    <span className="font-semibold text-slate-700">{fee.fee_head?.name}</span>
                                                    <span className="font-bold text-emerald-700">Rs. {Number(fee.balance_amount).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {arrearsTotal > 0 && (
                                                <div className="flex justify-between items-center bg-rose-50 p-3 rounded-xl border border-rose-200">
                                                    <span className="font-bold text-rose-800 uppercase text-[11px]">Previous Arrears</span>
                                                    <span className="font-black text-rose-700">Rs. {arrearsTotal.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {voucherData.fees.length === 0 && (
                                                <div className="text-center p-3 text-slate-500 font-medium">No pending fee heads.</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Right Section: Payment Deposit Form */}
                <div className={`lg:col-span-7 transition-all ${!selectedStudent ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative">
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-bold shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Record Deposit Payment</h2>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {selectedStudent ? `Recording transaction for ${selectedStudent.student?.first_name} ${selectedStudent.student?.last_name}` : 'Select a student to authorize payment.'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleDeposit} className="space-y-6">
                            {/* Payment Amount */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Deposit Amount (Rs.)</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">Rs.</span>
                                    <input 
                                        type="number"
                                        required
                                        className="w-full p-4 pl-16 bg-slate-50 border border-slate-300 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-black text-2xl text-slate-900 cursor-not-allowed"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0.00"
                                        readOnly
                                    />
                                </div>
                            </div>

                            {/* Date & Payment Method */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Payment Date</label>
                                    <input 
                                        type="date"
                                        required
                                        className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-sm text-slate-800"
                                        value={formData.payment_date}
                                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Payment Mode</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, payment_method: 'Bank Transfer' })}
                                            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${formData.payment_method === 'Bank Transfer' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            🏦 Bank
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, payment_method: 'Online' })}
                                            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${formData.payment_method === 'Online' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            📱 Online
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Bank Account Selection */}
                            {formData.payment_method !== 'Cash' && (
                                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                                    <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider">Campus Bank Account</label>
                                    <select 
                                        className="w-full p-3.5 bg-white border border-indigo-200 rounded-xl focus:border-indigo-500 outline-none transition-all font-semibold text-xs text-slate-800 cursor-pointer"
                                        value={formData.selected_bank_account_id}
                                        onChange={(e) => setFormData({ ...formData, selected_bank_account_id: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Select Bank Account --</option>
                                        {selectedStudent?.student?.campus?.bank_accounts?.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.bank_name} - {acc.account_number} ({acc.account_title})
                                            </option>
                                        ))}
                                        {(!selectedStudent?.student?.campus?.bank_accounts || selectedStudent.student.campus.bank_accounts.length === 0) && (
                                            <option value="" disabled>No bank accounts configured for this campus</option>
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* Reference / Transaction ID */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Reference / Transaction ID</label>
                                <input 
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-sm text-slate-800 placeholder:text-slate-400"
                                    placeholder="Enter bank transfer reference or transaction ID..."
                                    value={formData.reference_no}
                                    onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                    required={formData.payment_method !== 'Cash'}
                                />
                            </div>

                            {/* Internal Remarks */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Remarks / Notes</label>
                                <textarea 
                                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-xs text-slate-800 placeholder:text-slate-400 min-h-[90px] resize-none"
                                    placeholder="Add any additional payment details or remarks..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                ></textarea>
                            </div>

                            {/* Audit Fee Receipt Attachment Upload */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        Audit Receipt Attachment <span className="text-rose-600 font-extrabold">*</span>
                                    </label>
                                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase">Required</span>
                                </div>

                                <div className="relative">
                                    <input 
                                        type="file"
                                        id="fee-receipt-attachment"
                                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    showError('File size exceeds 5MB limit.');
                                                    return;
                                                }
                                                setFormData({ ...formData, attachment: file });
                                            }
                                        }}
                                    />
                                    
                                    {formData.attachment ? (
                                        <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-xl text-xs">
                                            <div className="flex items-center gap-3 truncate">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                                                    {formData.attachment.name.endsWith('.pdf') ? 'PDF' : 'IMG'}
                                                </div>
                                                <div className="truncate">
                                                    <p className="font-bold text-slate-900 truncate">{formData.attachment.name}</p>
                                                    <p className="text-[10px] font-medium text-slate-500">{(formData.attachment.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, attachment: null });
                                                    const input = document.getElementById('fee-receipt-attachment');
                                                    if (input) input.value = '';
                                                }}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Remove File"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <label 
                                            htmlFor="fee-receipt-attachment"
                                            className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-rose-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 rounded-xl cursor-pointer transition-all text-xs font-bold text-slate-700 hover:text-indigo-600"
                                        >
                                            <svg className="w-4 h-4 text-rose-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Upload Scanned Fee Receipt / Bank Slip (Mandatory)
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Summary Box */}
                            {selectedStudent && formData.amount && (
                                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs">
                                    <div>
                                        <p className="text-slate-400 font-medium">Total Authorization</p>
                                        <p className="font-bold text-white text-sm">{selectedStudent.student?.first_name} {selectedStudent.student?.last_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-400 font-medium">Amount to Pay</p>
                                        <p className="font-black text-emerald-400 text-lg">Rs. {Number(formData.amount).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button 
                                type="submit" 
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                                disabled={submitting || !selectedStudent || !formData.amount || !formData.attachment}
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing Payment...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Authorize Payment & Generate Receipt
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeeDeposit;
