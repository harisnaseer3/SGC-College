import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../UI/Button';

const RegisterForm = ({ onToggleLogin }) => {
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        organization_id: '',
    });
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            const response = await axios.get('/api/admissions/form-data'); // Reusing this for now to get orgs if mapped or fetch separately
            // Actually, let's just fetch organizations directly if we have an endpoint. 
            // I'll assume we can get them or I'll create a simple endpoint.
            // For now, I'll try to fetch from a generic endpoint or fallback.
            const orgResponse = await axios.get('/api/admissions/form-data');
            setOrganizations(orgResponse.data.data.campuses.map(c => ({ id: c.id, name: c.name }))); // Placeholder logic
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            await register(formData);
        } catch (error) {
            console.error('Registration error:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-indigo-100 rounded-2xl px-5 py-3.5 focus:ring-4 outline-none transition-all font-medium"
                    required
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-indigo-100 rounded-2xl px-5 py-3.5 focus:ring-4 outline-none transition-all font-medium"
                    required
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Organization</label>
                <select 
                    name="organization_id"
                    value={formData.organization_id}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-indigo-100 rounded-2xl px-5 py-3.5 focus:ring-4 outline-none transition-all font-medium"
                    required
                >
                    <option value="">Select Organization</option>
                    <option value="1">Tenacious</option>
                    <option value="2">Tiges</option>
                    <option value="3">CICON</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-slate-50 border border-slate-200 focus:ring-indigo-100 rounded-2xl px-5 py-3.5 pr-12 focus:ring-4 outline-none transition-all font-medium"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        >
                            {showPassword ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Confirm</label>
                    <div className="relative">
                        <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            name="password_confirmation"
                            value={formData.password_confirmation}
                            onChange={handleChange}
                            className="w-full bg-slate-50 border border-slate-200 focus:ring-indigo-100 rounded-2xl px-5 py-3.5 pr-12 focus:ring-4 outline-none transition-all font-medium"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        >
                            {showConfirmPassword ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-4 text-lg mt-4 shadow-xl shadow-indigo-500/30">
                {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <div className="pt-4 text-center">
                <p className="text-slate-500 font-medium text-sm">
                    Already have an account? {' '}
                    <button 
                        type="button"
                        onClick={onToggleLogin}
                        className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
                    >
                        Sign in instead
                    </button>
                </p>
            </div>
        </form>
    );
};

export default RegisterForm;
