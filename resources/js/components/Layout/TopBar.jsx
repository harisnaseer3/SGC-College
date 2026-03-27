import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CampusSwitcher from './CampusSwitcher';

const TopBar = () => {
    const { user } = useAuth();

    return (
        <header className="h-24 bg-white/70 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-end sticky top-0 z-40">
            <div className="flex items-center gap-6">
                <CampusSwitcher />
                
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
