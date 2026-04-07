 import React from 'react';
import SidebarItem from './SidebarItem';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const { logout, user } = useAuth();
    
    const isSuperAdmin = user?.roles?.some(role => role.name === 'super_admin');

    const menuItems = [
        { path: '/dashboard', name: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        ...(isSuperAdmin ? [{ path: '/organizations', name: 'Organizations', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' }] : []),
        { path: '/users', name: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { path: '/academic', name: 'Academic', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
        { path: '/admissions', name: 'Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { path: '/reports/admissions-by-date', name: 'Reports', icon: 'M9 17v-2m3 2v-4m3 2v-6m-8 2.5L12 10.5l4.5 4.5m1.5-1.5V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-3.5M9 5h6' },
        { path: '/profile', name: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ];

    return (
        <aside className="w-72 bg-white h-screen flex flex-col border-r border-slate-200 overflow-y-auto shrink-0">
            <div className="p-8 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <img 
                        src="/assets/images/logo.png" 
                        alt="Logo" 
                        className="w-10 h-10 object-contain"
                    />
                    <span className="text-slate-900 font-bold text-xl tracking-tight">SGC Education</span>
                </div>
            </div>
            
            <nav className="flex-1 p-6 space-y-2">
                {menuItems.map((item) => (
                    <SidebarItem 
                        key={item.path} 
                        {...item} 
                    />
                ))}
            </nav>
            

        </aside>
    );
};

export default Sidebar;
