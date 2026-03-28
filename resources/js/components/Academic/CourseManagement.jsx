import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const CourseManagement = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        credit_hours: 3,
        description: ''
    });
    const { showError, showSuccess } = useNotifications();

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await axios.get('/api/courses');
            setCourses(response.data.data);
        } catch (error) {
            showError('Failed to fetch courses');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/courses', formData);
            showSuccess('Course created successfully');
            setShowForm(false);
            fetchCourses();
            setFormData({ name: '', code: '', credit_hours: 3, description: '' });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to create course');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Courses</h2>
                <Button onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'New Course'}
                </Button>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Course Name</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Hours</label>
                            <input
                                type="number"
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                value={formData.credit_hours}
                                onChange={(e) => setFormData({ ...formData, credit_hours: e.target.value })}
                                required
                            />
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
                            <Button type="submit">Create Course</Button>
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
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">Credit Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map((course) => (
                            <tr key={course.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{course.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{course.code}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{course.credit_hours}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CourseManagement;
