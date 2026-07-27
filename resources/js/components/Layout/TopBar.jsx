import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import CampusSwitcher from './CampusSwitcher';

const TopBar = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="h-24 bg-indigo-100 border-b border-slate-200 px-8 flex items-center justify-between md:justify-end sticky top-0 z-40 print:hidden">
            {/* Hamburger Menu Button for Mobile */}
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-200/50 rounded-xl transition-colors"
                aria-label="Toggle Menu"
            >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <div className="flex items-center gap-6">
                <CampusSwitcher />
                
                <div className="relative pl-6 border-l border-slate-100" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-4 text-left focus:outline-none"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900 leading-none">{user?.name}</p>
                            <p className="text-xs font-medium text-slate-400 mt-1">{user?.organization?.name || 'Administrator'}</p>
                        </div>
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg ring-4 ring-slate-50 transition-all hover:ring-indigo-100">
                            {user?.name ? user.name[0].toUpperCase() : 'U'}
                        </div>
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                            <Link 
                                to="/profile" 
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Profile
                            </Link>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;
