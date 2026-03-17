import React from 'react';
import Button from '../UI/Button';
import Card from '../UI/Card';

const CampusList = ({ organization, campuses, loading, onAddNew, onBack }) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{organization.name} - Colleges</h1>
                        <p className="text-slate-500 mt-1 font-medium">Manage all campuses (colleges) under this organization.</p>
                    </div>
                </div>
                <Button onClick={onAddNew}>Add New College</Button>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Campus Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {campuses.length > 0 ? (
                                campuses.map((campus) => (
                                    <tr key={campus.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shadow-inner">
                                                    {campus.logo_url ? (
                                                        <img src={campus.logo_url} alt={campus.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="font-semibold text-slate-700">{campus.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                            <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                {campus.code || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">
                                            {campus.location || 'Not Specified'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                campus.status === 'active' 
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                            }`}>
                                                {campus.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm italic text-right">
                                            {new Date(campus.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                        No campuses found for this organization.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default CampusList;
