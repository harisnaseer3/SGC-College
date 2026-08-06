import React from 'react';
import Card from '../UI/Card';
import Pagination from '../UI/Pagination';

const RoleList = ({ roles, loading, search = '', onSearchChange, onCreate, onEdit, onDelete, onManagePermissions, pagination, setPagination }) => {
    return (
        <Card noPadding>
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">System Roles</h2>
                    <p className="text-sm text-slate-500">Manage user roles and their access permissions</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Search Input Bar */}
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
                            placeholder="Search role by name..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
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

                    <button
                        onClick={onCreate}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 transition duration-200 shadow-sm shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>New Role</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Name</th>
                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan="2" className="py-8 text-center text-slate-500">
                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </td>
                            </tr>
                        ) : roles.length === 0 ? (
                            <tr>
                                <td colSpan="2" className="py-8 text-center text-slate-500">
                                    No roles found.
                                </td>
                            </tr>
                        ) : (
                            roles.map((role) => (
                                <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6 relative">
                                        <div className="font-semibold text-slate-800">{role.label}</div>
                                        <div className="text-sm text-slate-500">System Name: {role.name}</div>
                                    </td>
                                    <td className="py-4 px-6 text-right space-x-3">
                                        {role.name !== 'super_admin' && (
                                            <>
                                                <button
                                                    onClick={() => onManagePermissions(role)}
                                                    className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                                >
                                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Permissions
                                                </button>
                                                <button
                                                    onClick={() => onEdit(role)}
                                                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                                    title="Edit Role"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                {!['student', 'teacher', 'registrar'].includes(role.name) && (
                                                    <button
                                                        onClick={() => onDelete(role.id)}
                                                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                                        title="Delete Role"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </>
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
    );
};

export default RoleList;
