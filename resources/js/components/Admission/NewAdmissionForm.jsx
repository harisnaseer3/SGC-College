import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

const NewAdmissionForm = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useNotifications();
    const [formData, setFormData] = useState({
        campus_id: '',
        academic_class_id: '',
        section_id: '',
        admission_number: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        address: '',
        guardian_name: '',
        guardian_phone: '',
        admission_date: new Date().toISOString().split('T')[0],
    });

    const [formOptions, setFormOptions] = useState({
        campuses: [],
        classes: [],
        sections: [],
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const response = await axios.get('/api/admissions/form-data');
            setFormOptions(response.data.data);
        } catch (error) {
            console.error('Error fetching form data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post('/api/admissions', formData);
            showSuccess('Student admitted successfully!');
            navigate('/admissions');
        } catch (error) {
            const message = error.response?.data?.message || 'Error creating admission';
            showError(message);
            console.error('Error submitting form:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-12 text-slate-500 font-medium">Loading form configuration...</div>;

    const filteredSections = formOptions.sections.filter(
        s => s.academic_class_id == formData.academic_class_id
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">New Student Admission</h1>
                    <p className="text-slate-500 mt-1 font-medium">Fill in the details to register a new student.</p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/admissions')}>
                    Back to List
                </Button>
            </div>

            <Card className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Campus</label>
                            <select 
                                name="campus_id" 
                                value={formData.campus_id} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                required
                            >
                                <option value="">Select Campus</option>
                                {formOptions.campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Academic Class</label>
                            <select 
                                name="academic_class_id" 
                                value={formData.academic_class_id} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                required
                            >
                                <option value="">Select Class</option>
                                {formOptions.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Section</label>
                            <select 
                                name="section_id" 
                                value={formData.section_id} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                required
                                disabled={!formData.academic_class_id}
                            >
                                <option value="">Select Section</option>
                                {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 italic font-medium text-slate-400 text-xs">Personal Information</div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Admission #</label>
                            <input 
                                type="text" 
                                name="admission_number" 
                                placeholder="e.g. AD-2024-001"
                                value={formData.admission_number} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">First Name</label>
                            <input 
                                type="text" 
                                name="first_name" 
                                value={formData.first_name} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Last Name</label>
                            <input 
                                type="text" 
                                name="last_name" 
                                value={formData.last_name} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Admission Date</label>
                            <input 
                                type="date" 
                                name="admission_date" 
                                value={formData.admission_date} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Guardian Name</label>
                            <input 
                                type="text" 
                                name="guardian_name" 
                                value={formData.guardian_name} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Guardian Phone</label>
                            <input 
                                type="text" 
                                name="guardian_phone" 
                                value={formData.guardian_phone} 
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => navigate('/admissions')} type="button">Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Admitting...' : 'Register Student'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default NewAdmissionForm;
