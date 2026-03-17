import React from 'react';

const OrgSwitcher = () => {
    return (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Organization</p>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    T
                </div>
                <span className="text-slate-900 font-bold text-sm">Tenacious Group</span>
                <svg className="w-4 h-4 text-slate-400 ml-auto group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
};

export default OrgSwitcher;
