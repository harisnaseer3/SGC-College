import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Pagination from '../UI/Pagination';
import { useNotifications } from '../../contexts/NotificationContext';

const MODULE_OPTIONS = ['Auth', 'Users', 'Admissions', 'Fees', 'Finance', 'Expenses', 'Programs', 'System'];
const ACTION_OPTIONS = ['LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'BLOCKED_LOGIN', 'CREATED', 'UPDATED', 'DELETED', 'TOGGLED_STATUS', 'REGISTER'];

const getActionBadgeColor = (action) => {
    switch (action) {
        case 'LOGIN':
        case 'REGISTER':
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'LOGOUT':
            return 'bg-slate-100 text-slate-700 border-slate-200';
        case 'FAILED_LOGIN':
        case 'BLOCKED_LOGIN':
        case 'DELETED':
            return 'bg-rose-100 text-rose-700 border-rose-200';
        case 'CREATED':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'UPDATED':
        case 'TOGGLED_STATUS':
            return 'bg-amber-100 text-amber-700 border-amber-200';
        default:
            return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }
};

const ActivityLogList = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
    const [selectedLog, setSelectedLog] = useState(null);
    const [showUndoModal, setShowUndoModal] = useState(false);
    const [undoPin, setUndoPin] = useState('');
    const [undoingLog, setUndoingLog] = useState(null);
    const [undoLoading, setUndoLoading] = useState(false);
    const { showError, showSuccess } = useNotifications();

    const handleTriggerUndo = (log) => {
        setUndoingLog(log);
        setUndoPin('');
        setShowUndoModal(true);
    };

    const handleConfirmUndo = async (e) => {
        e.preventDefault();
        if (!undoPin || undoPin.length !== 5) {
            showError('Please enter a valid 5-digit PIN');
            return;
        }
        setUndoLoading(true);
        try {
            await axios.post(`/api/activity-logs/${undoingLog.id}/undo`, { pin: undoPin });
            showSuccess('Activity log successfully undone!');
            setShowUndoModal(false);
            setUndoingLog(null);
            if (selectedLog && selectedLog.id === undoingLog.id) {
                setSelectedLog(null);
            }
            fetchLogs(pagination.current_page);
        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data?.data?.pin || 'Failed to undo action';
            showError(msg);
        } finally {
            setUndoLoading(false);
        }
    };

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const perPage = Number(localStorage.getItem('per_page')) || 15;
            const params = { page, per_page: perPage };
            if (search) params.search = search;
            if (selectedModule) params.module = selectedModule;
            if (selectedAction) params.action = selectedAction;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const response = await axios.get('/api/activity-logs', { params });
            setLogs(response.data.data.data);
            setPagination({
                current_page: response.data.data.current_page,
                last_page: response.data.data.last_page,
                total: response.data.data.total,
                per_page: response.data.data.per_page
            });
        } catch (error) {
            console.error('Error fetching activity logs:', error);
            const msg = error.response?.data?.message || 'Failed to load activity logs';
            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(pagination.current_page);
    }, [pagination.current_page, selectedModule, selectedAction, dateFrom, dateTo]);

    useEffect(() => {
        const handleCustomPerPage = () => {
            fetchLogs(1);
        };
        window.addEventListener('perPageChange', handleCustomPerPage);
        return () => window.removeEventListener('perPageChange', handleCustomPerPage);
    }, [selectedModule, selectedAction, dateFrom, dateTo, search]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, current_page: 1 }));
        fetchLogs(1);
    };

    const handleClearFilters = () => {
        setSearch('');
        setSelectedModule('');
        setSelectedAction('');
        setDateFrom('');
        setDateTo('');
        setPagination(prev => ({ ...prev, current_page: 1 }));
        fetchLogs(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Activity Logs</h1>
                    <p className="text-slate-500 mt-1 font-medium">Audit trail of actions and user activities performed across the system.</p>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="p-6 border-slate-200 shadow-sm bg-slate-50/50">
                <form onSubmit={handleSearchSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {/* Search Input */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Search</label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by user, description, IP..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            />
                        </div>

                        {/* Module Select */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Module</label>
                            <select
                                value={selectedModule}
                                onChange={(e) => { setSelectedModule(e.target.value); setPagination(p => ({ ...p, current_page: 1 })); }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none"
                            >
                                <option value="">All Modules</option>
                                {MODULE_OPTIONS.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                            </select>
                        </div>

                        {/* Action Select */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Action</label>
                            <select
                                value={selectedAction}
                                onChange={(e) => { setSelectedAction(e.target.value); setPagination(p => ({ ...p, current_page: 1 })); }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none"
                            >
                                <option value="">All Actions</option>
                                {ACTION_OPTIONS.map(act => <option key={act} value={act}>{act}</option>)}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setPagination(p => ({ ...p, current_page: 1 })); }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={handleClearFilters}>
                            Clear Filters
                        </Button>
                        <Button type="submit">
                            Apply Search
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Activity Table */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Module</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">Loading activity logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">No activity logs found matching criteria.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap font-medium">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 leading-none">{log.user_name || 'System/Guest'}</div>
                                            {log.user_email && <div className="text-xs text-slate-500 mt-1">{log.user_email}</div>}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {log.module}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getActionBadgeColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 font-medium max-w-xs truncate" title={log.description}>
                                            {log.description}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                            {log.ip_address || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all"
                                            >
                                                View
                                            </button>
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

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Activity Log Details</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Log ID #{selectedLog.id} • {new Date(selectedLog.created_at).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase">User</span>
                                    <p className="font-bold text-slate-800">{selectedLog.user_name} ({selectedLog.user_email || 'No email'})</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase">Module & Action</span>
                                    <p className="font-bold text-slate-800">{selectedLog.module} — {selectedLog.action}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase">IP Address</span>
                                    <p className="font-mono text-slate-800">{selectedLog.ip_address || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase">User Agent</span>
                                    <p className="text-xs text-slate-600 truncate" title={selectedLog.user_agent}>{selectedLog.user_agent || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-600 uppercase mb-1">Description</h4>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium">
                                    {selectedLog.description}
                                </div>
                            </div>

                            {selectedLog.properties && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-1">Payload / Properties</h4>
                                    <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
                                        {JSON.stringify(selectedLog.properties, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <Button 
                                type="button" 
                                variant="danger"
                                onClick={() => handleTriggerUndo(selectedLog)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Undo Action
                            </Button>
                            <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Security PIN Modal for Undo */}
            {showUndoModal && undoingLog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Security Verification</h3>
                                    <p className="text-xs text-slate-500">Confirm undo for Log #{undoingLog.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUndoModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleConfirmUndo} className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                                <span className="font-bold text-slate-800">Action:</span> {undoingLog.description}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Enter 5-Digit Security PIN / Password
                                </label>
                                <input
                                    type="password"
                                    maxLength="5"
                                    placeholder="•••••"
                                    value={undoPin}
                                    onChange={(e) => setUndoPin(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button 
                                    type="button" 
                                    variant="secondary" 
                                    onClick={() => setShowUndoModal(false)}
                                    disabled={undoLoading}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                                    disabled={undoLoading}
                                >
                                    {undoLoading ? 'Verifying...' : 'Confirm Undo'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogList;
