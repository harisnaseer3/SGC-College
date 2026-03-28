import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const SessionManagement = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [campuses, setCampuses] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        is_active: true,
        campus_id: ''
    });
    const { showSuccess, showError } = useNotifications();

    useEffect(() => {
        fetchSessions();
        fetchCampuses();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await axios.get('/api/academic-sessions');
            setSessions(response.data.data);
        } catch (error) {
            showError('Failed to fetch sessions');
        } finally {
            setLoading(false);
        }
    };

    const fetchCampuses = async () => {
        try {
            const response = await axios.get('/api/admissions/form-data');
            setCampuses(response.data.data.campuses);
        } catch (error) {
            console.error('Failed to fetch campuses');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/academic-sessions', formData);
            showSuccess('Session created successfully');
            setShowForm(false);
            fetchSessions();
            setFormData({ name: '', is_active: true, campus_id: '' });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to create session');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Academic Sessions</h2>
                <Button onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'New Session'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Session Name (e.g. 2023-2027)</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Campus</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                value={formData.campus_id}
                                onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}
                                required
                            >
                                <option value="">Select Campus</option>
                                {campuses?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active Session</label>
                        </div>
                        <div className="md:col-span-2">
                            <Button type="submit">Create Session</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Name</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Campus</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((session) => (
                            <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{session.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{session.campus?.name}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        session.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {session.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SessionManagement;
