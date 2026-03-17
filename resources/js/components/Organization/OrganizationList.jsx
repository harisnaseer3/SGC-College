import React from 'react';
import Button from '../UI/Button';
import Card from '../UI/Card';

const OrganizationList = ({ organizations, loading, onAddNew, onManageCampuses }) => {
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
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organizations</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage all registered organizations in the system.</p>
                </div>
                <Button onClick={onAddNew}>Add New Organization</Button>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Slug</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created At</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {organizations.length > 0 ? (
                                organizations.map((org) => (
                                    <tr key={org.id} className="hover:bg-slate-50/50 transition-colors group">
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
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                onClick={() => onManageCampuses(org)}
                                            >
                                                Manage Colleges
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                        No organizations found. Click 'Add New' to get started.
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

export default OrganizationList;
