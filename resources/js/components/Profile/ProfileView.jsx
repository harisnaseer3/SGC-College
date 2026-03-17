import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

const ProfileView = () => {
    const { user, setUser } = useAuth();
    const { showSuccess, showError } = useNotifications();
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [loading, setLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const toggleShowPassword = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.put('/api/profile', profileData);
            setUser(response.data.data);
            showSuccess(response.data.message || 'Profile updated successfully!');
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to update profile.';
            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    const updatePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.put('/api/password', passwordData);
            setPasswordData({ current_password: '', password: '', password_confirmation: '' });
            showSuccess(response.data.message || 'Password changed successfully!');
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to change password.';
            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
                <p className="text-slate-500 mt-1 font-medium">Manage your profile information and security settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        General Information
                    </h3>
                    <form onSubmit={updateProfile} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Full Name</label>
                            <input 
                                type="text" 
                                name="name"
                                value={profileData.name}
                                onChange={handleProfileChange}
                                className="w-full bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-100/50 rounded-2xl px-5 py-3.5 outline-none transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Email Address</label>
                            <input 
                                type="email" 
                                name="email"
                                value={profileData.email}
                                onChange={handleProfileChange}
                                className="w-full bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-100/50 rounded-2xl px-5 py-3.5 outline-none transition-all font-medium"
                                required
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full mt-2">
                            Update Profile
                        </Button>
                    </form>
                </Card>

                <Card className="p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        Security & Password
                    </h3>
                    <form onSubmit={updatePassword} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Current Password</label>
                            <div className="relative">
                                <input 
                                    type={showPasswords.current ? "text" : "password"} 
                                    name="current_password"
                                    value={passwordData.current_password}
                                    onChange={handlePasswordChange}
                                    className="w-full bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-rose-100/50 rounded-2xl px-5 py-3 pr-12 outline-none transition-all font-medium"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleShowPassword('current')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors p-1"
                                >
                                    {showPasswords.current ? (
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
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">New Password</label>
                            <div className="relative">
                                <input 
                                    type={showPasswords.new ? "text" : "password"} 
                                    name="password"
                                    value={passwordData.password}
                                    onChange={handlePasswordChange}
                                    className="w-full bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-rose-100/50 rounded-2xl px-5 py-3 pr-12 outline-none transition-all font-medium"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleShowPassword('new')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors p-1"
                                >
                                    {showPasswords.new ? (
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
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Confirm New Password</label>
                            <div className="relative">
                                <input 
                                    type={showPasswords.confirm ? "text" : "password"} 
                                    name="password_confirmation"
                                    value={passwordData.password_confirmation}
                                    onChange={handlePasswordChange}
                                    className="w-full bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-rose-100/50 rounded-2xl px-5 py-3 pr-12 outline-none transition-all font-medium"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleShowPassword('confirm')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors p-1"
                                >
                                    {showPasswords.confirm ? (
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
                        <Button type="submit" disabled={loading} className="w-full mt-4 bg-rose-600 hover:bg-rose-700 border-none shadow-rose-200">
                            Change Password
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default ProfileView;
