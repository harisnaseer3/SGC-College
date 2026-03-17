import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const LoginForm = ({ onToggleRegister, onToggleForgot }) => {
    const { login } = useAuth();
    const { showError } = useNotifications();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            await login(credentials);
        } catch (error) {
            console.error('Login error:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                showError('Login failed. Please check your credentials.');
            } else {
                const message = error.response?.data?.message || 'Invalid credentials or server error.';
                setErrors({ email: [message] });
                showError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative group">
                    <input 
                        type="email" 
                        name="email"
                        value={credentials.email}
                        onChange={handleChange}
                        placeholder="admin@sgc.com"
                        className={`w-full bg-slate-50 border ${errors.email ? 'border-red-300 ring-red-100' : 'border-slate-200 focus:ring-indigo-100'} rounded-2xl px-5 py-4 focus:ring-4 outline-none transition-all font-medium text-slate-900 group-hover:border-indigo-300`}
                        required
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-2 font-bold ml-1">{errors.email[0]}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Password</label>
                    <button 
                        type="button"
                        onClick={onToggleForgot}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                        Forgot Password?
                    </button>
                </div>
                <div className="relative group">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        name="password"
                        value={credentials.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full bg-slate-50 border ${errors.password ? 'border-red-300 ring-red-100' : 'border-slate-200 focus:ring-indigo-100'} rounded-2xl px-5 py-4 pr-12 focus:ring-4 outline-none transition-all font-medium text-slate-900 group-hover:border-indigo-300`}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                    >
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                    {errors.password && <p className="text-red-500 text-xs mt-2 font-bold ml-1">{errors.password[0]}</p>}
                </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-4 text-lg mt-4 shadow-xl shadow-indigo-500/30">
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </Button>

            <div className="pt-6 text-center">
                <p className="text-slate-500 font-medium">
                    New to SGC? {' '}
                    <button 
                        type="button"
                        onClick={onToggleRegister}
                        className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
                    >
                        Create an account
                    </button>
                </p>
            </div>
        </form>
    );
};

export default LoginForm;
