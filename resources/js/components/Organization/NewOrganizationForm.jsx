import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import Card from '../UI/Card';

const NewOrganizationForm = ({ onSuccess }) => {
    const { showSuccess, showError } = useNotifications();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        logo: null,
        logo_url: '',
        status: 'active'
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const onCancel = () => navigate('/colleges');

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'logo') {
            setFormData(prev => ({ ...prev, logo: files[0] }));
            return;
        }

        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            // Auto-generate slug from name if name changes and slug is empty or was auto-generated
            if (name === 'name' && (!prev.slug || prev.slug === prev.name.toLowerCase().replace(/\s+/g, '-'))) {
                newData.slug = value.toLowerCase().replace(/\s+/g, '-');
            }
            return newData;
        });
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== '') {
                data.append(key, formData[key]);
            }
        });

        try {
            await axios.post('/api/organizations', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showSuccess('Organization registered successfully!');
            onSuccess();
        } catch (error) {
            if (error.response && error.response.data.errors) {
                setErrors(error.response.data.errors);
                showError('Please fix the validation errors.');
            } else {
                const message = error.response?.data?.message || 'Failed to create organization';
                showError(message);
                console.error('Failed to create organization:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onCancel}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">New Organization</h1>
            </div>

            <Card className="p-8 border-slate-200 shadow-xl overflow-visible">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Organization Name</label>
                            <input 
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Tenacious Group"
                                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500 animate-shake' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50 font-medium`}
                                required
                            />
                            {errors.name && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.name[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Unique Slug</label>
                            <input 
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                placeholder="tenacious-group"
                                className={`w-full px-4 py-3 rounded-xl border ${errors.slug ? 'border-red-500 animate-shake' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50 font-medium`}
                                required
                            />
                            {errors.slug && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.slug[0]}</p>}
                        </div>

                        <div className="space-y-4 md:col-span-2 p-6 bg-slate-100/50 rounded-2xl border border-slate-200/50">
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
                                            id="logo-upload"
                                        />
                                        <label 
                                            htmlFor="logo-upload"
                                            className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed ${formData.logo ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-300 hover:border-indigo-400 bg-white text-slate-500'} cursor-pointer transition-all font-bold`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                            {formData.logo ? formData.logo.name : 'Choose file...'}
                                        </label>
                                    </div>
                                    {errors.logo && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.logo[0]}</p>}
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
                                        placeholder="https://example.com/logo.png"
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.logo_url ? 'border-red-500 animate-shake' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-white font-medium`}
                                    />
                                    {errors.logo_url && <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-tight">{errors.logo_url[0]}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Initial Status</label>
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
                            ) : 'Register Organization'}
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

export default NewOrganizationForm;
