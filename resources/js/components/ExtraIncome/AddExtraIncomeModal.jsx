import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Modal from '../UI/Modal';

const AddExtraIncomeModal = ({ isOpen, onClose, onSuccess, income = null, isViewOnly = false }) => {
    const [categories, setCategories] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [formData, setFormData] = useState({
        income_category_id: '',
        program_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        form_number: '',
        remarks: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSuccess, showError } = useNotifications();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoryRes, programRes] = await Promise.all([
                    axios.get('/api/income-categories?all=1'),
                    axios.get('/api/programs?all=1')
                ]);
                setCategories(categoryRes.data.data);
                setPrograms(programRes.data.data);
            } catch (error) {
                console.error("Failed to fetch initial data", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (income) {
            setFormData({
                income_category_id: income.income_category_id,
                program_id: income.program_id || '',
                amount: income.amount,
                date: income.date ? new Date(income.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                payment_method: income.payment_method || 'Cash',
                form_number: income.form_number || '',
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
                const response = await axios.put(`/api/extra-incomes/${income.id}`, formData);
                showSuccess('Income record updated successfully');
                onSuccess(response.data.data.id);
            } else {
                const response = await axios.post('/api/extra-incomes', formData);
                showSuccess('Income record created successfully');
                onSuccess(response.data.data.id);
            }
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

    const inputClasses = (hasError) => 
        `w-full rounded-xl border ${hasError ? 'border-red-300' : 'border-slate-200'} px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white transition-all shadow-sm`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isViewOnly ? 'View Income Record' : income ? 'Edit Income Record' : 'Record New Income'}
            size="lg"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Income Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="income_category_id"
                                value={formData.income_category_id}
                                onChange={handleChange}
                                className={inputClasses(errors.income_category_id)}
                                required
                                disabled={isViewOnly}
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {errors.income_category_id && <p className="text-red-500 text-xs mt-1 font-medium">{errors.income_category_id[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className={inputClasses(errors.amount)}
                                required
                                disabled={isViewOnly}
                            />
                            {errors.amount && <p className="text-red-500 text-xs mt-1 font-medium">{errors.amount[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className={inputClasses(errors.date)}
                                required
                                disabled={isViewOnly}
                            />
                            {errors.date && <p className="text-red-500 text-xs mt-1 font-medium">{errors.date[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Payment Method <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="payment_method"
                                value={formData.payment_method}
                                onChange={handleChange}
                                className={inputClasses(errors.payment_method)}
                                required
                                disabled={isViewOnly}
                            >
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Online">Online</option>
                            </select>
                            {errors.payment_method && <p className="text-red-500 text-xs mt-1 font-medium">{errors.payment_method[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Program / Class <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="program_id"
                                value={formData.program_id}
                                onChange={handleChange}
                                className={inputClasses(errors.program_id)}
                                required
                                disabled={isViewOnly}
                            >
                                <option value="">Select Program</option>
                                {programs.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {errors.program_id && <p className="text-red-500 text-xs mt-1 font-medium">{errors.program_id[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Form Number
                            </label>
                            <input
                                type="text"
                                name="form_number"
                                value={formData.form_number}
                                readOnly
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none shadow-sm"
                                placeholder={income ? formData.form_number : "Auto-generated on save"}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Remarks
                            </label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                rows="2"
                                className={inputClasses(false)}
                                placeholder="Optional remarks..."
                                disabled={isViewOnly}
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    {isViewOnly ? (
                        <>
                            {income && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => window.open(`/extra-income/receipt/${income.id}`, '_blank')}
                                        className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Print Receipt
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => window.open(`/extra-income/receipt/${income.id}?download=1`, '_blank')}
                                        className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download Receipt
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Close
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isViewOnly || isSubmitting}
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Record'}
                            </button>
                        </>
                    )}
                </div>
            </form>
        </Modal>
    );
};

export default AddExtraIncomeModal;
