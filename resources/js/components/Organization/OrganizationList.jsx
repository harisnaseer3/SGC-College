import React from 'react';
import DataTable from '../UI/DataTable';
import Button from '../UI/Button';

const OrganizationList = ({ organizations, loading, onAddNew, onEdit, onManageCampuses }) => {
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
                columns={['Name', 'Slug', 'Status', 'Created At', 'Actions']}
                data={organizations}
                loading={loading}
                emptyMessage="No organizations found. Click 'Add New' to get started."
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
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={() => onManageCampuses(org)}
                                >
                                    Manage Colleges
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => onEdit(org)}
                                >
                                    Edit
                                </Button>
                            </div>
                        </td>
                    </>
                )}
            />
        </div>
    );
};

export default OrganizationList;
