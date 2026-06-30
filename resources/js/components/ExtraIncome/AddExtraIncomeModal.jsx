import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';

const AddExtraIncomeModal = ({ isOpen, onClose, onSuccess, income = null }) => {
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        income_category_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        receipt_number: '',
        remarks: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSuccess, showError } = useNotifications();

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get('/api/income-categories');
                setCategories(response.data.data);
            } catch (error) {
                console.error("Failed to fetch categories");
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (income) {
            setFormData({
                income_category_id: income.income_category_id,
                amount: income.amount,
                date: income.date ? new Date(income.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                payment_method: income.payment_method || 'Cash',
                receipt_number: income.receipt_number || '',
                remarks: income.remarks || ''
            });
        }
    }, [income]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        try {
            if (income) {
                await axios.put(`/api/extra-incomes/${income.id}`, formData);
                showSuccess('Income record updated successfully');
            } else {
                await axios.post('/api/extra-incomes', formData);
                showSuccess('Income record created successfully');
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                const apiMessage = error.response?.data?.message;
                showError(apiMessage || 'Failed to save extra income');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">
                        {income ? 'Edit Income Record' : 'Record New Income'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Income Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="income_category_id"
                                value={formData.income_category_id}
                                onChange={handleChange}
                                className={`w-full rounded-lg border ${errors.income_category_id ? 'border-red-300' : 'border-slate-300'} px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white`}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {errors.income_category_id && <p className="text-red-500 text-xs mt-1">{errors.income_category_id[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className={`w-full rounded-lg border ${errors.amount ? 'border-red-300' : 'border-slate-300'} px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`}
                                required
                            />
                            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className={`w-full rounded-lg border ${errors.date ? 'border-red-300' : 'border-slate-300'} px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`}
                                required
                            />
                            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Payment Method <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="payment_method"
                                value={formData.payment_method}
                                onChange={handleChange}
                                className={`w-full rounded-lg border ${errors.payment_method ? 'border-red-300' : 'border-slate-300'} px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white`}
                                required
                            >
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Online">Online</option>
                            </select>
                            {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Receipt Number
                            </label>
                            <input
                                type="text"
                                name="receipt_number"
                                value={formData.receipt_number}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                placeholder="Optional"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Remarks
                            </label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                rows="2"
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                placeholder="Optional remarks..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddExtraIncomeModal;
