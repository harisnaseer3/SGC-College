import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import AddExtraIncomeModal from './AddExtraIncomeModal';

const ExtraIncomeList = () => {
    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState(null);
    const { showSuccess, showError } = useNotifications();

    const fetchIncomes = async () => {
        try {
            const response = await axios.get('/api/extra-incomes');
            setIncomes(response.data.data);
        } catch (error) {
            showError('Failed to fetch income records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncomes();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this income record?')) {
            try {
                await axios.delete(`/api/extra-incomes/${id}`);
                showSuccess('Income record deleted successfully');
                fetchIncomes();
            } catch (error) {
                showError('Failed to delete income record');
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Income Records</h3>
                <button
                    onClick={() => {
                        setEditingIncome(null);
                        setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Record Income
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200">
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Method</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt No</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected By</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {incomes.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-slate-500">
                                        No income records found.
                                    </td>
                                </tr>
                            ) : (
                                incomes.map((income) => (
                                    <tr key={income.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 text-slate-900 font-medium">
                                            {new Date(income.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                {income.income_category?.name}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                                            {Number(income.amount).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600">{income.payment_method}</td>
                                        <td className="py-3 px-4 text-slate-600">{income.receipt_number || '-'}</td>
                                        <td className="py-3 px-4 text-slate-600">{income.collected_by?.name}</td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingIncome(income);
                                                        setIsModalOpen(true);
                                                    }}
                                                    title="Edit Record"
                                                    className="p-2 text-slate-400 hover:text-amber-600 transition-all rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100"
                                                >
                                                    <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-10l-1.5 1.5M19 4a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(income.id)}
                                                    title="Delete Record"
                                                    className="p-2 text-slate-400 hover:text-rose-600 transition-all rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
                                                >
                                                    <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <AddExtraIncomeModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchIncomes();
                    }}
                    income={editingIncome}
                />
            )}
        </div>
    );
};

export default ExtraIncomeList;
