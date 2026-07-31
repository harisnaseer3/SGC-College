import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const SidebarItem = ({ name, icon, path, subItems, isOpen, isCollapsed, onToggle }) => {
    const location = useLocation();

    const hasSubItems = subItems && subItems.length > 0;

    const toggleOpen = (e) => {
        if (hasSubItems) {
            e.preventDefault();
            onToggle();
        }
    };

    return (
        <div className="space-y-1">
            <NavLink
                to={path}
                onClick={toggleOpen}
                className={({ isActive }) => 
                    `flex items-center rounded-xl transition-all duration-300 group
                    ${isCollapsed ? 'justify-center p-3 mx-auto w-12 h-12' : 'w-full gap-4 px-4 py-3.5'}
                    ${isActive && !hasSubItems
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-semibold' 
                        : (location.pathname.startsWith(path) && hasSubItems 
                            ? 'bg-indigo-200/70 text-indigo-800 font-semibold' 
                            : 'text-slate-700 hover:text-indigo-700 hover:bg-indigo-200/50')}`
                }
                title={isCollapsed ? name : undefined}
            >
                {({ isActive }) => (
                    <>
                        <svg className={`w-6 h-6 shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                        </svg>
                        {!isCollapsed && (
                            <>
                                <span className="font-medium tracking-wide flex-1 text-left whitespace-nowrap">{name}</span>
                                {hasSubItems && (
                                    <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                                {isActive && !hasSubItems && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50 shrink-0"></div>
                                )}
                            </>
                        )}
                    </>
                )}
            </NavLink>

            {hasSubItems && isOpen && !isCollapsed && (
                <div className="ml-10 space-y-1 py-1 border-l-2 border-indigo-200 pl-4">
                    {subItems.map((sub) => (
                        <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) => 
                                `block py-2 text-sm font-medium transition-colors duration-200
                                ${isActive ? 'text-indigo-700 font-bold' : 'text-slate-600 hover:text-indigo-700'}`
                            }
                        >
                            {sub.name}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SidebarItem;
