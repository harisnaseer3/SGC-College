import React from 'react';
import DataTable from '../UI/DataTable';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

const OrganizationList = ({ organizations, loading, onAddNew, onEdit, onManageCampuses, pagination, setPagination }) => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organizations</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage all registered organizations in the system.</p>
                </div>
                <Button onClick={onAddNew}>Add New Organization</Button>
            </div>

            <DataTable
                columns={['Name', 'Slug', 'Status', 'Created At', { name: 'Actions', align: 'center' }]}
                data={organizations}
                loading={loading}
                emptyMessage="No organizations found. Click 'Add New' to get started."
                pagination={pagination}
                onPageChange={(page) => setPagination(prev => ({ ...prev, current_page: page }))}
                renderRow={(org) => (
                    <>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shadow-inner">
                                    {org.logo_url ? (
                                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                                    ) : (
                                        org.name.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <span className="font-semibold text-slate-700">{org.name}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{org.slug}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                org.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                                {org.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm italic">
                            {new Date(org.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => onManageCampuses(org)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title="Manage Colleges"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={() => onEdit(org)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title="Edit"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </>
                )}
            />


        </div>
    );
};

export default OrganizationList;
