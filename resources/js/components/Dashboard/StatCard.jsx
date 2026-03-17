import React from 'react';
import Card from '../UI/Card';

const StatCard = ({ name, value, change, icon, color }) => {
    return (
        <Card className="p-6 group">
            <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl ${color} bg-opacity-10 flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform duration-300`}>
                    <svg className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                    </svg>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${change.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {change}
                </span>
            </div>
            <div className="mt-5">
                <p className="text-slate-500 text-sm font-semibold tracking-wide uppercase">{name}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
            </div>
            <div className="mt-4 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} opacity-30`} style={{ width: '60%' }}></div>
            </div>
        </Card>
    );
};

export default StatCard;
