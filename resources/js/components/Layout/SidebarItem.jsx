import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const SidebarItem = ({ name, icon, path, subItems, isOpen, onToggle }) => {
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
                    `w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group
                    ${isActive && !hasSubItems
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                        : (location.pathname.startsWith(path) && hasSubItems ? 'bg-slate-50 text-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50')}`
                }
            >
                {({ isActive }) => (
                    <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                        </svg>
                        <span className="font-medium tracking-wide flex-1 text-left">{name}</span>
                        {hasSubItems && (
                            <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        )}
                        {isActive && !hasSubItems && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50"></div>
                        )}
                    </>
                )}
            </NavLink>

            {hasSubItems && isOpen && (
                <div className="ml-10 space-y-1 py-1 border-l-2 border-slate-100 pl-4">
                    {subItems.map((sub) => (
                        <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) => 
                                `block py-2 text-sm font-medium transition-colors duration-200
                                ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`
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
