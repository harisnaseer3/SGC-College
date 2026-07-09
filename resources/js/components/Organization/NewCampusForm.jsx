import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import Card from '../UI/Card';

const NewCampusForm = ({ organization, onSuccess, campus = null }) => {
    const { showSuccess, showError } = useNotifications();
    const navigate = useNavigate();
    const isEdit = !!campus;

    const [formData, setFormData] = useState({
        name:           campus?.name           || '',
        logo:           null,
        logo_url:       campus?.logo_url       || '',
        location:       campus?.location       || '',
        code:           campus?.code           || '',
        status:         campus?.status         || 'active',
        payment_terms:  campus?.payment_terms  || '',
        bank_accounts:  campus?.bank_accounts?.length > 0 ? campus.bank_accounts : [{ bank_name: '', account_title: '', account_number: '', branch_code: '' }],
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const onCancel = () => navigate(`/colleges/${organization.id}/campuses`);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'logo') {
            setFormData(prev => ({ ...prev, logo: files[0] }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleBankChange = (index, field, value) => {
        const newBankAccounts = [...formData.bank_accounts];
        newBankAccounts[index][field] = value;
        setFormData(prev => ({ ...prev, bank_accounts: newBankAccounts }));
    };

    const addBankAccount = () => {
        setFormData(prev => ({
            ...prev,
            bank_accounts: [...prev.bank_accounts, { bank_name: '', account_title: '', account_number: '', branch_code: '' }]
        }));
    };

    const removeBankAccount = (index) => {
        const newBankAccounts = formData.bank_accounts.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, bank_accounts: newBankAccounts }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'bank_accounts') {
                formData.bank_accounts.forEach((acc, i) => {
                    Object.keys(acc).forEach(accKey => {
                        if (acc[accKey] !== null && acc[accKey] !== '') {
                            data.append(`bank_accounts[${i}][${accKey}]`, acc[accKey]);
                        }
                    });
                });
            } else if (formData[key] !== null && formData[key] !== '') {
                data.append(key, formData[key]);
            }
        });

        if (isEdit) {
            data.append('_method', 'PUT');
        }

        try {
            const url = isEdit
                ? `/api/organizations/${organization.id}/campuses/${campus.id}`
                : `/api/organizations/${organization.id}/campuses`;

            await axios.post(url, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showSuccess(isEdit ? 'College updated successfully!' : 'College created successfully!');
            onSuccess();
        } catch (error) {
            if (error.response && error.response.data.errors) {
                setErrors(error.response.data.errors);
                showError('Please fix the validation errors.');
            } else {
                const message = error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} campus`;
                showError(message);
                console.error(`Failed to ${isEdit ? 'update' : 'create'} campus:`, error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {isEdit ? 'Edit College' : 'New College'}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        {isEdit ? `Editing ${campus.name}` : `Adding a new campus under ${organization.name}`}
                    </p>
                </div>
            </div>

            <Card className="p-8 border-slate-200 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">College Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. City Campus"
                            className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500 animate-shake' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50 font-medium`}
                            required
                        />
                        {errors.name && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.name[0]}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Campus Code</label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="MC-01"
                                className={`w-full px-4 py-3 rounded-xl border ${errors.code ? 'border-red-500 animate-shake' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50 font-medium`}
                            />
                            {errors.code && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.code[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50 font-bold text-slate-700"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4 p-6 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Logo Configuration</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Upload Logo
                                </label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        name="logo"
                                        onChange={handleChange}
                                        accept="image/*"
                                        className="hidden"
                                        id="campus-logo-upload"
                                    />
                                    <label
                                        htmlFor="campus-logo-upload"
                                        className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed ${formData.logo ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-300 hover:border-indigo-400 bg-white text-slate-500'} cursor-pointer transition-all font-bold`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                        {formData.logo ? formData.logo.name : 'Choose file...'}
                                    </label>
                                </div>
                                {errors.logo && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.logo[0]}</p>}
                                {isEdit && campus.logo_url && !formData.logo && (
                                    <p className="text-xs text-slate-500 font-medium mt-1">Leave empty to keep current logo</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    Logo URL
                                </label>
                                <input
                                    type="url"
                                    name="logo_url"
                                    value={formData.logo_url}
                                    onChange={handleChange}
                                    placeholder="https://example.com/college-logo.png"
                                    className={`w-full px-4 py-3 rounded-xl border ${errors.logo_url ? 'border-red-500 animate-shake' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-white font-medium`}
                                />
                                {errors.logo_url && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.logo_url[0]}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Location / Address / City</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="123 Main St, City"
                            className={`w-full px-4 py-3 rounded-xl border ${errors.location ? 'border-red-500 animate-shake' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50 font-medium`}
                        />
                        {errors.location && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.location[0]}</p>}
                    </div>

                    <div className="space-y-4 p-6 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Fee Voucher Payment Terms</h3>
                        <p className="text-xs text-slate-500 mb-4 font-medium">These terms will be dynamically printed on the bottom of the fee vouchers. Leave blank to use the default terms.</p>
                        
                        <div className="space-y-2">
                            <textarea
                                name="payment_terms"
                                value={formData.payment_terms}
                                onChange={handleChange}
                                placeholder="e.g. A fine of Rs. 200 will be charged if the fee is not paid by the due date."
                                className={`w-full px-4 py-3 rounded-xl border ${errors.payment_terms ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium min-h-[100px] resize-y`}
                            />
                            {errors.payment_terms && <p className="text-red-500 text-xs font-bold mt-1 uppercase">{errors.payment_terms[0]}</p>}
                        </div>
                    </div>

                    <div className="space-y-4 p-6 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Bank Account Details</h3>
                                <p className="text-xs text-slate-500 font-medium">These details will be dynamically printed on the fee vouchers generated for students of this campus.</p>
                            </div>
                            <button type="button" onClick={addBankAccount} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                + Add Bank Account
                            </button>
                        </div>

                        {formData.bank_accounts.map((account, index) => (
                            <div key={index} className="relative bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm animate-in slide-in-from-top-2">
                                {formData.bank_accounts.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeBankAccount(index)}
                                        className="absolute top-2 right-2 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Remove Account"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bank Name</label>
                                        <input
                                            type="text"
                                            value={account.bank_name}
                                            onChange={(e) => handleBankChange(index, 'bank_name', e.target.value)}
                                            placeholder="e.g. Bank Islami Pakistan"
                                            className={`w-full px-3 py-2 rounded-lg border ${errors[`bank_accounts.${index}.bank_name`] ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-medium text-sm`}
                                            required
                                        />
                                        {errors[`bank_accounts.${index}.bank_name`] && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors[`bank_accounts.${index}.bank_name`][0]}</p>}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Title</label>
                                        <input
                                            type="text"
                                            value={account.account_title}
                                            onChange={(e) => handleBankChange(index, 'account_title', e.target.value)}
                                            placeholder="e.g. The Integrity Global Education System"
                                            className={`w-full px-3 py-2 rounded-lg border ${errors[`bank_accounts.${index}.account_title`] ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-medium text-sm`}
                                            required
                                        />
                                        {errors[`bank_accounts.${index}.account_title`] && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors[`bank_accounts.${index}.account_title`][0]}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Number</label>
                                        <input
                                            type="text"
                                            value={account.account_number}
                                            onChange={(e) => handleBankChange(index, 'account_number', e.target.value)}
                                            placeholder="e.g. 31000223490001"
                                            className={`w-full px-3 py-2 rounded-lg border ${errors[`bank_accounts.${index}.account_number`] ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-medium text-sm`}
                                            required
                                        />
                                        {errors[`bank_accounts.${index}.account_number`] && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors[`bank_accounts.${index}.account_number`][0]}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch Code</label>
                                        <input
                                            type="text"
                                            value={account.branch_code}
                                            onChange={(e) => handleBankChange(index, 'branch_code', e.target.value)}
                                            placeholder="e.g. 3100"
                                            className={`w-full px-3 py-2 rounded-lg border ${errors[`bank_accounts.${index}.branch_code`] ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-medium text-sm`}
                                        />
                                        {errors[`bank_accounts.${index}.branch_code`] && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors[`bank_accounts.${index}.branch_code`][0]}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-slate-100">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Processing...</span>
                                </div>
                            ) : (isEdit ? 'Update College' : 'Create College')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default NewCampusForm;
