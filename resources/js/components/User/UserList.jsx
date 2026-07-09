import React from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';

const ucwords = (str) => {
    return str.toLowerCase().replace(/\b[a-z]/g, function(letter) {
        return letter.toUpperCase();
    });
};

const UserList = ({ users, loading, onAddNew, onEdit, onDelete, pagination, setPagination }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage administrators, teachers, and other staff.</p>
                </div>
                <Button onClick={onAddNew}>
                    Add New User
                </Button>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned College</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">Loading users...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">No users found.</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group text-sm">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
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
                                        <td className="px-6 py-4 text-slate-400 text-xs italic">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => onEdit(user)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(user.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
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
