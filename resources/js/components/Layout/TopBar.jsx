import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const TopBar = () => {
    const { user } = useAuth();

    return (
        <header className="h-24 bg-white/70 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">Dashboard Overview</h2>
                <p className="text-slate-500 text-sm font-medium mt-0.5">Welcome back, <span className="text-indigo-600 font-bold">{user?.name || 'User'}</span></p>
            </div>
            
            <div className="flex items-center gap-6">
                <button className="relative p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                </button>
                
                <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 leading-none">{user?.name}</p>
                        <p className="text-xs font-medium text-slate-400 mt-1">{user?.organization?.name || 'Administrator'}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg ring-4 ring-slate-50">
                        {user?.name ? user.name[0] : 'U'}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopBar;
