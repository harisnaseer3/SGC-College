import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

const BackupManagement = () => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const { showSuccess, showError } = useNotifications();

    const fetchBackups = async () => {
        try {
            const response = await axios.get('/api/backups');
            setBackups(response.data.data);
        } catch (error) {
            showError('Failed to fetch backup history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleGenerateBackup = async (type) => {
        if (!window.confirm(`Are you sure you want to generate a new ${type} backup? This may take a few moments.`)) return;

        setIsGenerating(true);
        try {
            await axios.post('/api/backups', { type });
            showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} backup generated successfully.`);
            fetchBackups();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to generate backup.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRestore = async (id) => {
        if (!window.confirm('WARNING: Restoring a backup will overwrite the current database and files. Are you absolutely sure?')) return;

        try {
            await axios.post(`/api/backups/${id}/restore`);
            showSuccess('System restored successfully.');
            // Reload page or force re-auth
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            showError(error.response?.data?.message || 'Restore failed.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this backup file?')) return;

        try {
            await axios.delete(`/api/backups/${id}`);
            showSuccess('Backup deleted successfully.');
            fetchBackups();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to delete backup.');
        }
    };

    const handleDownload = async (backup) => {
        try {
            const response = await axios.get(`/api/backups/${backup.id}/download`, {
                responseType: 'blob', // Important
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', backup.name);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showError('Failed to download backup file.');
        }
    };

    const handleUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Ensure it's a zip file
        if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed' && !file.name.endsWith('.zip')) {
            showError('Only .zip backup files are allowed.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setIsGenerating(true);
        try {
            await axios.post('/api/backups/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showSuccess('Backup uploaded successfully.');
            fetchBackups();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to upload backup.');
        } finally {
            setIsGenerating(false);
            event.target.value = null; // reset input
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Backups</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage, download, and restore system data and files.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <input 
                        type="file" 
                        id="backup-upload" 
                        accept=".zip" 
                        className="hidden" 
                        onChange={handleUpload}
                        disabled={isGenerating}
                    />
                    <Button 
                        onClick={() => document.getElementById('backup-upload').click()} 
                        disabled={isGenerating}
                        variant="secondary"
                    >
                        {isGenerating ? 'Uploading...' : 'Upload Backup'}
                    </Button>
                    <Button 
                        onClick={() => handleGenerateBackup('incremental')} 
                        disabled={isGenerating}
                        variant="secondary"
                    >
                        {isGenerating ? 'Generating...' : 'Incremental Backup'}
                    </Button>
                    <Button 
                        onClick={() => handleGenerateBackup('full')} 
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'Generating...' : 'Full Backup'}
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Backup Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created By</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading backups...</td>
                                </tr>
                            ) : backups.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        No backups found. Generate one to get started.
                                    </td>
                                </tr>
                            ) : (
                                backups.map((backup) => (
                                    <tr key={backup.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                            {backup.name}
                                            {backup.status === 'failed' && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                    Failed
                                                </span>
                                            )}
                                            {backup.status === 'pending' && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${backup.type === 'full' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                {backup.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {backup.size_human || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {backup.creator?.name || 'System'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(backup.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleDownload(backup)}
                                                    className={`p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all ${backup.status !== 'completed' ? 'opacity-50 pointer-events-none' : ''}`}
                                                    title="Download"
                                                    disabled={backup.status !== 'completed'}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleRestore(backup.id)}
                                                    className={`p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all ${backup.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    title="Restore System"
                                                    disabled={backup.status !== 'completed'}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(backup.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default BackupManagement;
