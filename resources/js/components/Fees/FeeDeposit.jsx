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
        selected_bank_account_id: ''
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
            // Populating voucherData with the unpaid fees so the breakdown works exactly like a voucher
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
        
        // Append bank details to remarks if it's a bank transfer
        let finalRemarks = formData.remarks;
        if (formData.payment_method !== 'Cash' && formData.selected_bank_account_id) {
            const bankAccounts = selectedStudent.student?.campus?.bank_accounts || [];
            const selectedAcc = bankAccounts.find(acc => acc.id.toString() === formData.selected_bank_account_id.toString());
            
            if (selectedAcc) {
                finalRemarks = `Deposited into: ${selectedAcc.bank_name} (A/C: ${selectedAcc.account_number})\n${finalRemarks}`.trim();
            }
        }

        try {
            const response = await axios.post('/api/student-fees/deposit', {
                student_id: selectedStudent.student_id,
                voucher_number: searchMode === 'voucher' ? voucherNo : null,
                ...formData,
                remarks: finalRemarks
            });
            showSuccess(`Payment of Rs. ${formData.amount} recorded successfully. Receipt: ${response.data.data.receipt_number}`);
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
            selected_bank_account_id: ''
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Section: Search and Discovery */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="p-1.5 border-slate-200 bg-slate-50 flex rounded-2xl overflow-hidden shadow-sm">
                        <button 
                            onClick={() => { setSearchMode('student'); resetForm(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${searchMode === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Find Student
                        </button>
                        <button 
                            onClick={() => { setSearchMode('voucher'); resetForm(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${searchMode === 'voucher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            By Voucher #
                        </button>
                    </Card>

                    <Card className="p-6 border-indigo-100 bg-indigo-50/30">
                        {searchMode === 'student' ? (
                            <div className="relative">
                                <input 
                                    type="text"
                                    className="w-full p-4 pl-12 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800"
                                    placeholder="Search by Name or Roll No..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <svg className="w-6 h-6 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        ) : (
                            <form onSubmit={handleVoucherSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type="text"
                                        className="w-full p-4 pl-12 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-black text-slate-800 tracking-wider"
                                        placeholder="Enter Voucher Number..."
                                        value={voucherNo}
                                        onChange={(e) => setVoucherNo(e.target.value)}
                                    />
                                    <svg className="w-6 h-6 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <Button type="submit" disabled={loading}>Go</Button>
                            </form>
                        )}

                        {loading && (
                            <div className="mt-4 flex justify-center py-8">
                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}

                        {!loading && searchMode === 'student' && students.length > 0 && !selectedStudent && (
                            <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2">
                                {students.map((fee) => (
                                    <button
                                        key={fee.student_id}
                                        onClick={() => handleStudentSelect(fee)}
                                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group text-left"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900 group-hover:text-indigo-600">{fee.student?.first_name} {fee.student?.last_name}</div>
                                            <div className="text-xs text-slate-500 font-medium uppercase tracking-tighter">Roll No: {fee.student?.roll_number} • {fee.student?.program?.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-400 uppercase">Balance</div>
                                            <div className="text-sm font-black text-rose-600">Rs. {Number(fee.total_balance).toLocaleString()}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {!loading && searchMode === 'student' && search.length >= 3 && students.length === 0 && (
                            <div className="mt-4 p-8 text-center bg-white rounded-2xl border border-slate-100">
                                <p className="text-slate-400 font-medium text-sm italic">No students found for "{search}"</p>
                            </div>
                        )}
                    </Card>

                    {selectedStudent && (
                        <div className="space-y-4 animate-in zoom-in-95 duration-300">
                            <Card className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-200 border-none relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full -ml-12 -mb-12 blur-xl"></div>
                                
                                <div className="relative flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-black">{selectedStudent.student?.first_name} {selectedStudent.student?.last_name}</h2>
                                        <p className="text-indigo-100 font-bold uppercase tracking-widest text-[10px] mt-1">Admission # {selectedStudent.student?.admission_number} • {selectedStudent.student?.program?.name}</p>
                                    </div>
                                    <button 
                                        onClick={resetForm}
                                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                
                                <div className="relative grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Target Balance</div>
                                        <div className="text-xl font-black">Rs. {Number(selectedStudent.total_balance).toLocaleString()}</div>
                                    </div>
                                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Student Status</div>
                                        <div className="text-xl font-black uppercase">{selectedStudent.student?.status || 'N/A'}</div>
                                    </div>
                                </div>
                            </Card>

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
                                    <Card className="p-5 border-emerald-100 bg-emerald-50/30">
                                        <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            {searchMode === 'voucher' ? `Voucher #${voucherNo} Breakdown` : 'Pending Fees Breakdown'}
                                        </h4>
                                        <div className="space-y-2">
                                            {currentFees.map(fee => (
                                                <div key={fee.id} className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-emerald-100/50 shadow-sm">
                                                    <span className="font-bold text-slate-700">{fee.fee_head?.name}</span>
                                                    <span className="font-black text-emerald-600">Rs. {Number(fee.balance_amount).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {arrearsTotal > 0 && (
                                                <div className="flex justify-between items-center text-sm bg-rose-50 p-3 rounded-xl border border-rose-100 shadow-sm mt-3">
                                                    <span className="font-bold text-rose-700 uppercase tracking-widest text-[11px]">{searchMode === 'voucher' ? 'Arrears' : 'Previous Unpaid (Arrears)'}</span>
                                                    <span className="font-black text-rose-600">Rs. {arrearsTotal.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {voucherData.fees.length === 0 && (
                                                <div className="text-center p-3 text-emerald-600 font-bold text-sm">No pending fees.</div>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Right Section: Form Control */}
                <div className={`lg:col-span-7 ${!selectedStudent ? 'opacity-40 pointer-events-none' : ''}`}>
                    <Card className="p-8 shadow-2xl border-slate-100 rounded-3xl relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-slate-50 rounded-full -z-10"></div>
                        
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Deposit Transaction</h2>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Recording payment for {selectedStudent?.student?.first_name || 'selected student'}</p>
                            </div>
                        </div>

                        <form onSubmit={handleDeposit} className="space-y-8">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1">Payment Amount</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl transition-colors group-focus-within:text-indigo-600">Rs.</span>
                                    <input 
                                        type="number"
                                        required
                                        className="w-full p-6 pl-16 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-500 focus:bg-white focus:ring-8 focus:ring-indigo-500/5 outline-none transition-all font-black text-3xl text-indigo-600"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1">Effective Date</label>
                                    <input 
                                        type="date"
                                        required
                                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                                        value={formData.payment_date}
                                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1">Payment Method</label>
                                    <select 
                                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    >
                                        <option value="Bank Transfer">🏦 Bank Transfer</option>
                                        <option value="Online">📱 Online Transfer</option>
                                    </select>
                                </div>
                            </div>

                            {formData.payment_method !== 'Cash' && (
                                <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-in slide-in-from-top-2">
                                    <label className="block text-xs font-black text-indigo-800 uppercase mb-3 tracking-widest px-1">Deposit To Campus Bank Account</label>
                                    <select 
                                        className="w-full p-4 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 cursor-pointer"
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

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1">Reference / Transaction ID</label>
                                <input 
                                    type="text"
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:font-medium tracking-wider"
                                    placeholder="Enter bank reference or cheque number..."
                                    value={formData.reference_no}
                                    onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                    required={formData.payment_method !== 'Cash'}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1">Internal Remarks</label>
                                <textarea 
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:font-medium min-h-[120px] resize-none"
                                    placeholder="Add any specific details about this transaction..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                ></textarea>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full py-6 rounded-3xl text-xl font-black shadow-2xl shadow-indigo-200 transition-all active:scale-95"
                                disabled={submitting || !selectedStudent || !formData.amount}
                            >
                                {submitting ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing Transaction...
                                    </div>
                                ) : 'Authorize Payment'}
                            </Button>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FeeDeposit;
