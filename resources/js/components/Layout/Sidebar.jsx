import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import SidebarItem from './SidebarItem';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [openSubmenu, setOpenSubmenu] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const isSuperAdmin = user?.roles?.some(role => role.name === 'super_admin');

    const menuItems = [
        { path: '/dashboard', name: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        ...(isSuperAdmin ? [{ path: '/organizations', name: 'Organizations', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' }] : []),
        { path: '/users', name: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        ...(isSuperAdmin ? [{ path: '/roles', name: 'Roles & Permissions', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }] : []),
        { 
            path: '/academic', 
            name: 'Academic', 
            icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
            subItems: [
                { name: 'Programs', path: '/academic/programs' },
                { name: 'Courses', path: '/academic/courses' },
                { name: 'Batches', path: '/academic/batches' },
            ]
        },
        { 
            path: '/fees', 
            name: 'Fees', 
            icon: 'M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z M12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z',
            subItems: [
                { name: 'Fee Heads', path: '/fees/heads' },
                { name: 'Fee Structures', path: '/fees/structures' },
                { name: 'Fine Policies', path: '/fees/policies' },
                { name: 'Student Ledgers', path: '/fees/ledgers' },
                { name: 'Fee Deposit', path: '/fees/deposit' },
                { name: 'Fee Receipts', path: '/fees/receipts' },
                { name: 'Misc Fee Operations', path: '/fees/billing' },
            ]
        },
        { 
            path: '/finance', 
            name: 'Finance', 
            icon: 'M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z M12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z',
            subItems: [
                { name: 'Extra Income', path: '/extra-income' },
                { name: 'Extra Expense', path: '/extra-expense' },
            ]
        },
        { path: '/admissions', name: 'Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { 
            path: '/reports', 
            name: 'Reports', 
            icon: 'M9 17v-2m3 2v-4m3 2v-6m-8 2.5L12 10.5l4.5 4.5m1.5-1.5V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-3.5M9 5h6',
            subItems: [
                { name: 'Admissions By Date', path: '/reports/admissions-by-date' },
                { name: 'Extra Income By Date', path: '/reports/extra-income-by-date' },
                { name: 'Extra Expense By Date', path: '/reports/extra-expense-by-date' }
            ]
        },
        { 
            path: '/system', 
            name: 'System', 
            icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
            subItems: [
                { name: 'Backups', path: '/system/backups' }
            ]
        },
        { path: '/profile', name: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ];

    useEffect(() => {
        // Auto-expand the submenu that contains the current active path
        const activeSubmenu = menuItems.find(item => 
            item.subItems && location.pathname.startsWith(item.path)
        );
        if (activeSubmenu) {
            setOpenSubmenu(activeSubmenu.path);
        }
    }, [location.pathname]);

    const handleToggleSubmenu = (path) => {
        setOpenSubmenu(prev => prev === path ? null : path);
    };

    return (
        <aside className={`bg-white h-screen flex flex-col border-r border-slate-200 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'} print:hidden`}>
            <Link to="/dashboard" className={`p-6 border-b border-slate-100 flex items-center hover:bg-slate-50 transition-colors cursor-pointer ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
                <img 
                    src="/assets/images/logo.png" 
                    alt="Logo" 
                    className="w-10 h-10 object-contain shrink-0"
                />
                {!isCollapsed && <span className="text-slate-900 font-bold text-xl tracking-tight whitespace-nowrap">SGC Education</span>}
            </Link>
            
            <nav className={`flex-1 overflow-y-auto space-y-2 ${isCollapsed ? 'p-4' : 'p-6'}`}>
                {menuItems.map((item) => (
                    <SidebarItem 
                        key={item.path} 
                        {...item} 
                        isOpen={openSubmenu === item.path}
                        isCollapsed={isCollapsed}
                        onToggle={() => {
                            if (isCollapsed) setIsCollapsed(false);
                            handleToggleSubmenu(item.path);
                        }}
                    />
                ))}
            </nav>
            
            <div className="p-4 border-t border-slate-100 mt-auto">
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className={`flex items-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all ${isCollapsed ? 'w-12 h-12 justify-center mx-auto' : 'w-full p-3 justify-start gap-4'}`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isCollapsed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        )}
                    </svg>
                    {!isCollapsed && <span className="font-medium whitespace-nowrap">Collapse</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
