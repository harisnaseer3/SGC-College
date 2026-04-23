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
    const [adjustment, setAdjustment] = useState({ discount_amount: 0, fine_amount: 0 });
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
                <Button onClick={() => navigate(`/fees/voucher/${studentId}`)} variant="secondary">Print Voucher</Button>
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

            <Card className="overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Fee Head</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Due Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Fine</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Discount</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Paid</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Balance</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {ledger.fees.map((fee) => (
                            <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-slate-800">{fee.fee_head?.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{new Date(fee.due_date).toLocaleDateString()}</td>
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
                                    <button 
                                        onClick={() => {
                                            setEditingFee(fee);
                                            setAdjustment({ discount_amount: fee.discount_amount || 0, fine_amount: fee.fine_amount || 0 });
                                        }}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4"
                                    >
                                        Adjust
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

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
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Discount Amount</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={adjustment.discount_amount}
                                    onChange={(e) => setAdjustment({ ...adjustment, discount_amount: e.target.value })}
                                />
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
                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditingFee(null)}>Cancel</Button>
                                <Button type="submit" className="flex-1">Apply Changes</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default StudentLedgerDetail;
