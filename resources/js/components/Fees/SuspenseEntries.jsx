import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../UI/Card';

const SuspenseEntries = () => {
    const { user, selectedOrganization, selectedCampus } = useAuth();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' or 'RECONCILED'
    const { showSuccess, showError } = useNotifications();
    const [bankAccounts, setBankAccounts] = useState([]);

    // Modals state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);

    // Form states
    const [addForm, setAddForm] = useState({ amount: '', deposit_date: '', reference_number: '', notes: '', campus_bank_account_id: '' });
    const [reconcileForm, setReconcileForm] = useState({ search_term: '', student_fee_id: '', voucher_number: '' });
    const [studentLookup, setStudentLookup] = useState(null);
    const [voucherData, setVoucherData] = useState(null);
    const [voucherFees, setVoucherFees] = useState(null);
    const [lookingUp, setLookingUp] = useState(false);

    useEffect(() => {
        fetchEntries();
        fetchBankAccounts();
    }, [statusFilter]);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/suspense-entries?status=${statusFilter}`);
            setEntries(res.data.data || []);
        } catch (error) {
            console.error('Error fetching suspense entries:', error);
            showError('Failed to load suspense entries.');
        } finally {
            setLoading(false);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            // Reusing this logic for fetching org details or just mock it since usually it's in context/auth user
            // We fetch the user's campuses and extract all related bank accounts
            let res;
            if (user?.roles?.some(r => r.name === 'super_admin')) {
                res = await axios.get('/api/campuses');
            } else if (selectedOrganization) {
                res = await axios.get(`/api/organizations/${selectedOrganization}/campuses`);
            } else {
                res = await axios.get('/api/campuses'); // fallback
            }
            if (res && res.data && res.data.data) {
                let banks = [];
                const campusesData = res.data.data.data || res.data.data;
                campusesData.forEach(campus => {
                    if (selectedCampus && campus.id.toString() !== selectedCampus.toString()) {
                        return; // Filter by Selected Campus
                    }
                    if (campus.bank_accounts) {
                        banks.push(...campus.bank_accounts.map(ba => ({...ba, campus_name: campus.name})));
                    }
                });
                setBankAccounts(banks);
            }
        } catch(e) {
            console.error('Error fetching bank accounts:', e);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/suspense-entries', addForm);
            showSuccess('Suspense Entry created successfully.');
            setShowAddModal(false);
            fetchEntries();
        } catch (error) {
            showError(error.response?.data?.message || 'Error saving entry.');
        }
    };

    const handleVoucherLookup = async (e) => {
        e.preventDefault();
        if (!reconcileForm.search_term) return;
        setLookingUp(true);
        setStudentLookup(null);
        setVoucherFees(null);
        setVoucherData(null);
        try {
            const res = await axios.get(`/api/student-fees/voucher-lookup/${reconcileForm.search_term}`);
            if (res.data && res.data.data) {
                setStudentLookup(res.data.data.student);
                setVoucherData(res.data.data);
                setVoucherFees(res.data.data.fees || []);
                setReconcileForm(prev => ({ ...prev, voucher_number: reconcileForm.search_term }));
            }
        } catch (error) {
            // fallback: maybe they entered a pure ID instead of voucher
            setReconcileForm(prev => ({ ...prev, student_fee_id: reconcileForm.search_term, voucher_number: '' }));
            showError('Could not find voucher details. Proceeding as direct Fee ID.');
        } finally {
            setLookingUp(false);
        }
    };

    const handleReconcileSubmit = async (e) => {
        e.preventDefault();
        if (!reconcileForm.student_fee_id && !reconcileForm.voucher_number) {
            showError('Please search and select a valid voucher first.');
            return;
        }

        try {
            await axios.post(`/api/suspense-entries/${selectedEntry.id}/reconcile`, {
                student_fee_id: reconcileForm.student_fee_id,
                voucher_number: reconcileForm.voucher_number
            });
            showSuccess('Entry officially reconciled to student fee.');
            setShowReconcileModal(false);
            setReconcileForm({ search_term: '', student_fee_id: '', voucher_number: '' });
            setStudentLookup(null);
            setVoucherData(null);
            setVoucherFees(null);
            fetchEntries();
        } catch (error) {
            showError(error.response?.data?.message || 'Error reconciling entry.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Suspense Entries</h2>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm"
                >
                    + Add Unallocated Deposit
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 w-fit rounded-lg">
                <button 
                    onClick={() => setStatusFilter('PENDING')}
                    className={`px-4 py-2 text-sm font-bold rounded-md ${statusFilter === 'PENDING' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Pending Actions
                </button>
                <button 
                    onClick={() => setStatusFilter('RECONCILED')}
                    className={`px-4 py-2 text-sm font-bold rounded-md ${statusFilter === 'RECONCILED' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Reconciled History
                </button>
            </div>

            <Card>
                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500 animate-pulse">Loading Records...</div>
                    ) : (
                        <table className="w-full whitespace-nowrap text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Deposit Date</th>
                                    <th className="px-6 py-4">Bank Ref</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Notes</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {entries.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-400 font-medium">No {statusFilter.toLowerCase()} suspense entries found.</td>
                                    </tr>
                                )}
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-bold text-slate-700">{entry.deposit_date}</td>
                                        <td className="px-6 py-4 text-slate-600">{entry.reference_number || '-'}</td>
                                        <td className="px-6 py-4 font-black text-rose-600">Rs. {Number(entry.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{entry.notes || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${entry.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {entry.status === 'PENDING' && (
                                                <button
                                                    onClick={() => { setSelectedEntry(entry); setShowReconcileModal(true); }}
                                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-lg transition-colors"
                                                >
                                                    Reconcile
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Log Unknown Deposit</h3>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Amount Deposit (Rs.)</label>
                                <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl" value={addForm.amount} onChange={e => setAddForm({...addForm, amount: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Deposit Date</label>
                                <input type="date" required className="w-full p-3 bg-slate-50 border rounded-xl" value={addForm.deposit_date} onChange={e => setAddForm({...addForm, deposit_date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Reference Number / Details</label>
                                <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" value={addForm.reference_number} onChange={e => setAddForm({...addForm, reference_number: e.target.value})} />
                            </div>
                            
                            {/* Actual Bank Dropdown */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Deposit Bank Account</label>
                                <select 
                                    required 
                                    className="w-full p-3 bg-slate-50 border rounded-xl" 
                                    value={addForm.campus_bank_account_id} 
                                    onChange={e => setAddForm({...addForm, campus_bank_account_id: e.target.value})}
                                >
                                    <option value="">-- Select Bank Account --</option>
                                    {bankAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.bank_name} - {acc.account_number} ({acc.campus_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700">Submit Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RECONCILE MODAL */}
            {showReconcileModal && selectedEntry && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Reconcile Deposit</h3>
                        <p className="text-xs text-slate-500 mb-6">Linking bank deposit of <span className="font-bold text-rose-600">Rs. {Number(selectedEntry.amount).toLocaleString()}</span> to a student.</p>
                        
                        <form onSubmit={handleReconcileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Student Fee ID / Voucher Number</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Enter Voucher # or Fee ID"
                                        className="w-full p-3 bg-slate-50 border rounded-xl" 
                                        value={reconcileForm.search_term} 
                                        onChange={e => setReconcileForm({...reconcileForm, search_term: e.target.value})} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleVoucherLookup}
                                        disabled={lookingUp || !reconcileForm.search_term}
                                        className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-xl whitespace-nowrap disabled:opacity-50"
                                    >
                                        {lookingUp ? 'Wait...' : 'Verify'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Enter the voucher prefix (e.g. VCH-001) to verify the student.</p>
                            </div>

                            {studentLookup && (
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mt-3 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs font-bold text-slate-700">Student Match Found:</div>
                                        <div className="font-bold text-indigo-700 text-sm">{studentLookup.first_name} {studentLookup.last_name}</div>
                                    </div>
                                    <div className="text-xs font-bold bg-white px-2 py-1 rounded shadow-sm text-slate-500">
                                        Roll No: {studentLookup.roll_number || 'N/A'}
                                    </div>
                                </div>
                            )}

                            {studentLookup && voucherFees && voucherFees.length > 0 && (
                                <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                        <span>Payable Fee Heads</span>
                                        <span>Balance</span>
                                    </div>
                                    {voucherFees.filter(f => f.status !== 'carried_forward').map(fee => (
                                        <div key={fee.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                                            <span className="font-semibold text-slate-600">{fee.fee_head?.name || 'Fee'}</span>
                                            <span className="font-bold text-rose-600">Rs. {Number(fee.balance_amount || fee.amount || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    
                                    {voucherData && (
                                        <div className="flex justify-between items-center bg-indigo-50 p-2.5 rounded-lg border border-indigo-200 text-xs mt-2 border-t-2">
                                            <span className="font-black text-indigo-900 uppercase">Total Payable</span>
                                            <span className="font-black text-indigo-900">Rs. {Number(voucherData.total_balance || 0).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => { setShowReconcileModal(false); setStudentLookup(null); setVoucherFees(null); setVoucherData(null); }} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                                {studentLookup && (
                                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 animate-in fade-in zoom-in duration-300">Confirm Reconciliation</button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuspenseEntries;
