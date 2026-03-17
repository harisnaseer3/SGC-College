import React, { useState } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const ForgotPassword = ({ onToggleLogin }) => {
    const { showError } = useNotifications();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/forgot-password', { email });
            setMessage(response.data.message);
        } catch (error) {
            const msg = error.response?.data?.message || 'Something went wrong. Please try again.';
            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {!message ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-slate-500 font-medium text-center">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
                        <input 
                            type="email" 
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your-email@example.com"
                            className="w-full bg-slate-50 border border-slate-200 focus:ring-indigo-100 rounded-2xl px-5 py-4 focus:ring-4 outline-none transition-all font-medium"
                            required
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full py-4 text-lg mt-2 shadow-xl shadow-indigo-500/30">
                        {loading ? 'Sending link...' : 'Send Reset Link'}
                    </Button>
                </form>
            ) : (
                <div className="text-center py-4 space-y-6">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-slate-900 font-bold text-xl leading-tight">{message}</p>
                    <Button variant="secondary" onClick={onToggleLogin} className="w-full py-3">
                        Back to Login
                    </Button>
                </div>
            )}

            {!message && (
                <div className="text-center">
                    <button 
                        type="button"
                        onClick={onToggleLogin}
                        className="text-slate-500 font-bold hover:text-indigo-600 transition-colors"
                    >
                        Wait, I remember it! Back to Login
                    </button>
                </div>
            )}
        </div>
    );
};

export default ForgotPassword;
