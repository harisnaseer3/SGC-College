import React from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

const ucwords = (str) => {
    return str.toLowerCase().replace(/\b[a-z]/g, function(letter) {
        return letter.toUpperCase();
    });
};

const UserList = ({
    users,
    loading,
    search = '',
    onSearchChange,
    onAddNew,
    onEdit,
    onDelete,
    onToggleStatus,
    onRestore,
    onForceDelete,
    onReload,
    isSuperAdmin = false,
    viewMode = 'active',
    onViewModeChange,
    trashedCount = 0,
    pagination,
    setPagination
}) => {
    const isTrashedView = viewMode === 'trashed';

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage administrators, teachers, and other staff.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            placeholder="Search user by name, email..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => onSearchChange && onSearchChange('')}
                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {onReload && (
                        <button
                            type="button"
                            onClick={onReload}
                            title="Reload Users"
                            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-xl transition-all shadow-sm shrink-0"
                        >
                            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}

                    <Button onClick={onAddNew} className="w-full sm:w-auto shrink-0">
                        Add New User
                    </Button>
                </div>
            </div>

            {isSuperAdmin && (
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                        <button
                            type="button"
                            onClick={() => onViewModeChange && onViewModeChange('active')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                !isTrashedView
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Active Users
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewModeChange && onViewModeChange('trashed')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                isTrashedView
                                    ? 'bg-white text-rose-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Soft Deleted Users
                            {trashedCount > 0 && (
                                <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-full ${
                                    isTrashedView ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {trashedCount}
                                </span>
                            )}
                        </button>
                    </div>
                    {isTrashedView && (
                        <span className="text-xs font-medium text-rose-600 hidden sm:inline">
                            Showing soft-deleted accounts. Restore (Undo) to reactivate, or Delete Forever to permanently remove.
                        </span>
                    )}
                </div>
            )}

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned College</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {isTrashedView ? 'Deleted On' : 'Created'}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">Loading users...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">
                                        {isTrashedView ? 'No soft-deleted users found.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors group text-sm ${user.deleted_at ? 'bg-rose-50/20' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                                                    user.deleted_at ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                                                }`}>
                                                    {user.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-none">{user.name}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                user.roles?.[0]?.name === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                                                user.roles?.[0]?.name === 'org_admin' ? 'bg-blue-100 text-blue-700' :
                                                user.roles?.[0]?.name === 'campus_admin' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {user.roles?.[0]?.name ? ucwords(user.roles[0].name.replace('_', ' ')) : 'No Role'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-600">
                                            {user.campus?.name || (['super_admin', 'org_admin'].includes(user.roles?.[0]?.name) ? 'Global Access' : 'Personal')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.deleted_at ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 border border-rose-200">
                                                    Soft Deleted
                                                </span>
                                            ) : (
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    user.is_active !== false
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {user.is_active !== false ? 'Active' : 'Disabled'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-xs italic">
                                            {new Date(user.deleted_at || user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {user.deleted_at ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onRestore && onRestore(user)}
                                                        title="Restore / Undo Delete"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                        </svg>
                                                        Restore / Undo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onForceDelete && onForceDelete(user)}
                                                        title="Permanently Delete User"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Permanent Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => onToggleStatus && onToggleStatus(user)}
                                                        title={user.is_active !== false ? "Disable User Account" : "Enable User Account"}
                                                        className={`p-1.5 rounded-lg transition-all ${
                                                            user.is_active !== false
                                                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                                        }`}
                                                    >
                                                        {user.is_active !== false ? (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <button 
                                                        onClick={() => onEdit(user)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Edit User"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => onDelete(user.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Soft Delete User"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {pagination?.total > 0 && (
                    <Pagination 
                        currentPage={pagination.current_page}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.per_page}
                        onPageChange={(page) => setPagination(prev => ({ ...prev, current_page: page }))}
                    />
                )}
            </Card>
        </div>
    );
};

export default UserList;
