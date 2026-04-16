import React from 'react';
import DataTable from '../UI/DataTable';
import Button from '../UI/Button';

const CampusList = ({ organization, campuses, loading, onAddNew, onBack }) => {
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

            <DataTable
                columns={['Campus Name', 'Code', 'Location', 'Status', { name: 'Created At', align: 'center' }]}
                data={campuses}
                loading={loading}
                emptyMessage="No campuses found for this organization."
                renderRow={(campus) => (
                    <>
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
                    </>
                )}
            />
        </div>
    );
};

export default CampusList;
