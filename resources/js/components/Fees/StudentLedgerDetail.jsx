import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import Card from '../UI/Card';

const StudentLedgerDetail = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [ledger, setLedger] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingFee, setEditingFee] = useState(null);
    const [adjustment, setAdjustment] = useState({ discount_amount: 0, fine_amount: 0, discount_type: 'fixed', apply_to_all: false });
    const [splittingFee, setSplittingFee] = useState(null);
    const [installments, setInstallments] = useState([]);
    const { showSuccess, showError } = useNotifications();

    useEffect(() => {
        fetchLedger();
    }, [studentId]);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/student-fees/ledger/${studentId}`);
            setLedger(response.data.data);
        } catch (error) {
            showError('Failed to fetch student ledger');
            navigate('/fees/ledgers');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateFee = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/student-fees/${editingFee.id}`, adjustment);
            showSuccess('Fee record updated successfully');
            setEditingFee(null);
            fetchLedger();
        } catch (error) {
            showError('Failed to update fee record');
        }
    };

    const handleSplitFee = async (e) => {
        e.preventDefault();
        const total = installments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);
        if (Math.abs(total - splittingFee.balance_amount) > 0.01) {
            showError(`Total installments (Rs. ${total}) must equal the current balance (Rs. ${splittingFee.balance_amount})`);
            return;
        }

        try {
            await axios.post(`/api/student-fees/split/${splittingFee.id}`, { installments });
            showSuccess('Fee successfully split into installments');
            setSplittingFee(null);
            fetchLedger();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to split fee');
        }
    };

    if (loading) return <div className="py-20 text-center animate-pulse text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Ledger...</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/fees/ledgers')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Student Fee Ledger</h1>
                        <p className="text-slate-500 text-sm">Detailed financial history for student ID: {studentId}</p>
                    </div>
                </div>
                <Button 
                    onClick={() => {
                        const earliestUnpaid = ledger.fees.filter(f => f.status !== 'paid').sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
                        if (earliestUnpaid) {
                            const d = new Date(earliestUnpaid.due_date);
                            navigate(`/fees/voucher/${studentId}?month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
                        } else {
                            navigate(`/fees/voucher/${studentId}`);
                        }
                    }} 
                    variant="secondary"
                >
                    Print Current Voucher
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-slate-50">
                    <div className="text-xs font-bold text-slate-500 uppercase">Total Payable</div>
                    <div className="text-2xl font-bold text-slate-900">Rs. {Number(ledger.summary.total_payable).toLocaleString()}</div>
                </Card>
                <Card className="p-6 bg-rose-50 border-rose-100">
                    <div className="text-xs font-bold text-rose-500 uppercase">Total Discounts</div>
                    <div className="text-2xl font-bold text-rose-700">Rs. {Number(ledger.summary.total_discounts).toLocaleString()}</div>
                </Card>
                <Card className="p-6 bg-emerald-50 border-emerald-100">
                    <div className="text-xs font-bold text-emerald-500 uppercase">Total Paid</div>
                    <div className="text-2xl font-bold text-emerald-700">Rs. {Number(ledger.summary.total_paid).toLocaleString()}</div>
                </Card>
                <Card className="p-6 bg-indigo-50 border-indigo-100">
                    <div className="text-xs font-bold text-indigo-500 uppercase">Net Balance</div>
                    <div className="text-2xl font-bold text-indigo-700">Rs. {Number(ledger.summary.total_balance).toLocaleString()}</div>
                </Card>
            </div>

            <div className="space-y-6">
                {Object.values(ledger.fees.reduce((acc, fee) => {
                    const date = new Date(fee.due_date);
                    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
                    if (!acc[key]) acc[key] = {
                        label: date.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
                        month: date.getMonth() + 1,
                        year: date.getFullYear(),
                        fees: []
                    };
                    acc[key].fees.push(fee);
                    return acc;
                }, {})).sort((a, b) => new Date(b.year, b.month - 1) - new Date(a.year, a.month - 1)).map((group) => (
                    <Card key={group.label} className="overflow-hidden border-slate-200 shadow-sm">
                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{group.label}</h3>
                            <Button 
                                onClick={() => navigate(`/fees/voucher/${studentId}?month=${group.month}&year=${group.year}`)} 
                                variant="secondary" 
                                size="sm"
                                className="text-[10px] py-1 px-3"
                            >
                                Print {group.label} Voucher
                            </Button>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Fee Head</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Amount</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Fine</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Discount</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Paid</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Balance</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Status</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {group.fees.map((fee) => (
                                    <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                                            {fee.fee_head?.name}
                                            {fee.remarks && <div className="text-[10px] text-slate-400 font-normal">{fee.remarks}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">Rs. {Number(fee.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-rose-600 text-right">Rs. {Number(fee.fine_amount || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-amber-600 text-right">Rs. {Number(fee.discount_amount || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">Rs. {Number(fee.paid_amount || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-indigo-600 text-right">Rs. {Number(fee.balance_amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                fee.status === 'unpaid' ? 'bg-rose-100 text-rose-700' :
                                                fee.status === 'partially_paid' ? 'bg-amber-100 text-amber-700' :
                                                'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {fee.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col gap-1">
                                                <button 
                                                    onClick={() => {
                                                        setEditingFee(fee);
                                                        setAdjustment({ 
                                                            discount_amount: fee.discount_amount || 0, 
                                                            fine_amount: fee.fine_amount || 0, 
                                                            discount_type: 'fixed',
                                                            apply_to_all: false 
                                                        });
                                                    }}
                                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4"
                                                >
                                                    Adjust
                                                </button>
                                                {fee.status !== 'paid' && fee.fee_head?.name?.toLowerCase().includes('tuition') && (
                                                    <button 
                                                        onClick={() => {
                                                            setSplittingFee(fee);
                                                            setInstallments([
                                                                { amount: (fee.balance_amount / 2).toFixed(2), due_date: fee.due_date },
                                                                { amount: (fee.balance_amount / 2).toFixed(2), due_date: new Date(new Date(fee.due_date).setMonth(new Date(fee.due_date).getMonth() + 1)).toISOString().split('T')[0] }
                                                            ]);
                                                        }}
                                                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline decoration-emerald-200 underline-offset-4"
                                                    >
                                                        Split
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                ))}
            </div>

            {/* Adjustment Modal */}
            {editingFee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Adjust Fee: {editingFee.fee_head?.name}</h3>
                            <button onClick={() => setEditingFee(null)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateFee} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Discount</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={adjustment.discount_amount}
                                        onChange={(e) => setAdjustment({ ...adjustment, discount_amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                    <select 
                                        className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold"
                                        value={adjustment.discount_type}
                                        onChange={(e) => setAdjustment({ ...adjustment, discount_type: e.target.value })}
                                    >
                                        <option value="fixed">Fixed</option>
                                        <option value="percentage">%</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fine Amount</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={adjustment.fine_amount}
                                    onChange={(e) => setAdjustment({ ...adjustment, fine_amount: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                <input 
                                    type="checkbox" 
                                    id="apply_to_all"
                                    className="w-4 h-4 text-indigo-600 rounded"
                                    checked={adjustment.apply_to_all}
                                    onChange={(e) => setAdjustment({ ...adjustment, apply_to_all: e.target.checked })}
                                />
                                <label htmlFor="apply_to_all" className="text-sm font-bold text-indigo-700">Apply to all semester fees</label>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditingFee(null)}>Cancel</Button>
                                <Button type="submit" className="flex-1">Apply Changes</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Split Modal */}
            {splittingFee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Split into Installments</h3>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Target Balance: <span className="text-slate-900 font-bold">Rs. {Number(splittingFee.balance_amount).toLocaleString()}</span></p>
                            </div>
                            <button onClick={() => setSplittingFee(null)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSplitFee} className="p-6">
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 mb-6">
                                {installments.map((inst, idx) => (
                                    <div key={idx} className="flex gap-4 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Inst. {idx + 1} Amount</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={inst.amount}
                                                onChange={(e) => {
                                                    const newInst = [...installments];
                                                    newInst[idx].amount = e.target.value;
                                                    setInstallments(newInst);
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Due Date</label>
                                            <input 
                                                type="date" 
                                                className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={inst.due_date}
                                                onChange={(e) => {
                                                    const newInst = [...installments];
                                                    newInst[idx].due_date = e.target.value;
                                                    setInstallments(newInst);
                                                }}
                                                required
                                            />
                                        </div>
                                        {installments.length > 2 && (
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const newCount = installments.length - 1;
                                                    const equalAmount = (splittingFee.balance_amount / newCount).toFixed(2);
                                                    setInstallments(Array(newCount).fill(0).map((_, i) => ({
                                                        amount: equalAmount,
                                                        due_date: installments[i]?.due_date || splittingFee.due_date
                                                    })));
                                                }}
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mb-6 px-2">
                                {installments.length < 4 ? (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const newCount = installments.length + 1;
                                            const equalAmount = (splittingFee.balance_amount / newCount).toFixed(2);
                                            const lastDate = new Date(installments[installments.length - 1].due_date);
                                            const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + 1)).toISOString().split('T')[0];
                                            
                                            setInstallments(Array(newCount).fill(0).map((_, i) => ({
                                                amount: equalAmount,
                                                due_date: i === newCount - 1 ? nextDate : installments[i]?.due_date || splittingFee.due_date
                                            })));
                                        }}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        Add Installment
                                    </button>
                                ) : (
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic">Max 4 installments reached</div>
                                )}
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total Allocated</div>
                                    <div className={`text-lg font-black ${
                                        Math.abs(installments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) - splittingFee.balance_amount) < 0.01 
                                        ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                        Rs. {installments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => setSplittingFee(null)}>Cancel</Button>
                                <Button type="submit" className="flex-1">Create Installments</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default StudentLedgerDetail;
