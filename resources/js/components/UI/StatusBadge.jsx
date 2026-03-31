import React from 'react';

const StatusBadge = ({ status }) => {
    const getStatusStyles = (status) => {
        const base = "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm transition-all duration-300";
        
        switch (status?.toLowerCase()) {
            case 'enrolled':
            case 'active':
                return `${base} bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100`;
            case 'pending':
                return `${base} bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100`;
            case 'struck off':
                return `${base} bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100`;
            case 'promoted':
                return `${base} bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 shadow-indigo-100`;
            case 'passed out':
                return `${base} bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100`;
            case 'transferred':
                return `${base} bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100`;
            default:
                return `${base} bg-slate-50 text-slate-500 border-slate-200`;
        }
    };

    return (
        <span className={getStatusStyles(status)}>
            {status || 'Unknown'}
        </span>
    );
};

export default StatusBadge;
