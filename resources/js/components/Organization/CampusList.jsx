import React, { useState } from 'react';
import DataTable from '../UI/DataTable';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

// Inline delete confirmation modal
const DeleteConfirmModal = ({ campus, onConfirm, onCancel, loading }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onCancel}
        />
        {/* Dialog */}
        <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-5">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center mb-2">Delete Campus</h3>
            <p className="text-slate-500 text-center font-medium mb-6">
                Are you sure you want to delete{' '}
                <span className="font-bold text-slate-800">{campus.name}</span>?
                This action cannot be undone.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Deleting...
                        </>
                    ) : 'Yes, Delete'}
                </button>
            </div>
        </div>
    </div>
);

const CampusList = ({ organization, campuses, loading, onAddNew, onBack, onEdit, onDelete, isSuperAdmin, pagination, setPagination }) => {
    const [confirmCampus, setConfirmCampus] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleDeleteConfirm = async () => {
        setDeleteLoading(true);
        await onDelete(confirmCampus);
        setDeleteLoading(false);
        setConfirmCampus(null);
    };

    const columns = [
        'Campus Name',
        'Code',
        'Location',
        'Status',
        { name: 'Created At', align: 'center' },
        ...(isSuperAdmin ? [{ name: 'Actions', align: 'center' }] : []),
    ];

    return (
        <>
            {confirmCampus && (
                <DeleteConfirmModal
                    campus={confirmCampus}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setConfirmCampus(null)}
                    loading={deleteLoading}
                />
            )}

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
                    {isSuperAdmin && <Button onClick={onAddNew}>Add New College</Button>}
                </div>

                <DataTable
                    columns={columns}
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
                            <td className="px-6 py-4 text-slate-500 text-sm italic text-center">
                                {new Date(campus.created_at).toLocaleDateString()}
                            </td>
                            {isSuperAdmin && (
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        {/* Edit */}
                                        <button
                                            onClick={() => onEdit(campus)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            title="Edit Campus"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                                            </svg>
                                        </button>
                                        {/* Delete */}
                                        <button
                                            onClick={() => setConfirmCampus(campus)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete Campus"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            )}
                        </>
                    )}
                />

                {pagination?.total > 0 && (
                    <Pagination 
                        currentPage={pagination.current_page}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.per_page}
                        onPageChange={(page) => setPagination(prev => ({ ...prev, current_page: page }))}
                    />
                )}
            </div>
        </>
    );
};

export default CampusList;
