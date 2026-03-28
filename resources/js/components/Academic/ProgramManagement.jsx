import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const ProgramManagement = () => {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [campuses, setCampuses] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        duration_years: 4,
        total_semesters: 8,
        campus_id: ''
    });
    const { showError, showSuccess } = useNotifications();

    useEffect(() => {
        fetchPrograms();
        fetchCampuses();
    }, []);

    const fetchPrograms = async () => {
        try {
            const response = await axios.get('/api/programs');
            setPrograms(response.data.data);
        } catch (error) {
            showError('Failed to fetch programs');
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
            await axios.post('/api/programs', formData);
            showSuccess('Program created successfully');
            setShowForm(false);
            fetchPrograms();
            setFormData({ name: '', code: '', description: '', duration_years: 4, total_semesters: 8, campus_id: '' });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to create program');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Programs</h2>
                <Button onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'New Program'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Program Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                                {/* We should fetch campuses if not in context */}
                                {campuses?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Years)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                    value={formData.duration_years}
                                    onChange={(e) => setFormData({ ...formData, duration_years: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Total Semesters</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                    value={formData.total_semesters}
                                    onChange={(e) => setFormData({ ...formData, total_semesters: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            ></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <Button type="submit">Create Program</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Name</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Code</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Campus</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Duration</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Semesters</th>
                        </tr>
                    </thead>
                    <tbody>
                        {programs.map((program) => (
                            <tr key={program.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{program.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{program.code}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{program.campus?.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{program.duration_years} Years</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{program.total_semesters}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProgramManagement;
