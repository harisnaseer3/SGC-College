import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium";
const labelCls = "text-sm font-bold text-slate-700 uppercase tracking-wider";
const SectionHeader = ({ title }) => (
    <div className="flex items-center gap-4 py-2">
        <span className="shrink-0 text-indigo-600 font-bold text-xs uppercase tracking-widest">{title}</span>
        <div className="h-px bg-slate-200 w-full" />
    </div>
);

const NewAdmissionForm = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useNotifications();
    const { selectedCampus } = useAuth();

    const [formData, setFormData] = useState({
        campus_id: '',
        program_id: '',
        program_semester_id: '',
        academic_batch_id: '',
        intake_session: '',
        admission_number: '',
        first_name: '',
        last_name: '',
        student_cnic: '',
        date_of_birth: '',
        phone: '',
        email: '',
        gender: '',
        is_transfer: '',
        address: '',
        religion: '',
        is_enrolled: false,
        guardian_name: '',
        guardian_cnic: '',
        guardian_phone: '',
        admission_date: new Date().toISOString().split('T')[0],
    });

    const [pictureFile, setPictureFile] = useState(null);
    const [picturePreview, setPicturePreview] = useState(null);

    const [formOptions, setFormOptions] = useState({
        campuses: [],
        programs: [],
        batches: [],
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (selectedCampus) {
            setFormData(prev => ({ ...prev, campus_id: selectedCampus }));
        }
    }, [selectedCampus]);

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
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPictureFile(file);
            setPicturePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = new FormData();
            Object.entries(formData).forEach(([key, val]) => {
                if (key === 'is_transfer') {
                    payload.append(key, val === 'true' || val === true ? '1' : '0');
                } else if (key === 'is_enrolled') {
                    payload.append(key, val ? '1' : '0');
                } else {
                    payload.append(key, val ?? '');
                }
            });
            if (pictureFile) {
                payload.append('student_picture', pictureFile);
            }
            await axios.post('/api/admissions', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showSuccess('Student admitted successfully!');
            navigate('/admissions');
        } catch (error) {
            const errors = error.response?.data?.errors;
            if (errors) {
                const msgs = Object.values(errors).flat().join(' | ');
                showError(msgs);
            } else {
                showError(error.response?.data?.message || 'Error creating admission');
            }
            console.error('Error submitting form:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-12 text-slate-500 font-medium">Loading form configuration...</div>;

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

                    {/* ── Academic Details ── */}
                    <SectionHeader title="Academic Details" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        <div className="space-y-2">
                            <label className={labelCls}>Campus</label>
                            <select name="campus_id" value={formData.campus_id} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Campus</option>
                                {formOptions.campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Program</label>
                            <select name="program_id" value={formData.program_id} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Program</option>
                                {formOptions.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Semester</label>
                            <select name="program_semester_id" value={formData.program_semester_id} onChange={handleChange} className={inputCls} required disabled={!formData.program_id}>
                                <option value="">Select Semester</option>
                                {formOptions.programs.find(p => p.id == formData.program_id)?.semesters?.map(s => (
                                    <option key={s.id} value={s.id}>Semester {s.semester_number}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Academic Batch</label>
                            <select name="academic_batch_id" value={formData.academic_batch_id} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Batch</option>
                                {formOptions.batches.map(b => <option key={b.id} value={b.id}>{b.name}{b.is_active ? ' (Active)' : ''}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Intake Session</label>
                            <select name="intake_session" value={formData.intake_session} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Intake</option>
                                <option value="Fall">Fall</option>
                                <option value="Spring">Spring</option>
                            </select>
                        </div>
                    </div>

                    {/* ── Student Information ── */}
                    <SectionHeader title="Student Information" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className={labelCls}>Admission #</label>
                            <input type="text" name="admission_number" placeholder="e.g. AD-2024-001" value={formData.admission_number} onChange={handleChange} className={inputCls} required />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>First Name</label>
                            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className={inputCls} required />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Last Name</label>
                            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className={inputCls} required />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Student CNIC</label>
                            <input type="text" name="student_cnic" placeholder="e.g. 35202-1234567-1" value={formData.student_cnic} onChange={handleChange} className={inputCls} />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Date of Birth <span className="text-red-500">*</span></label>
                            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={inputCls} required />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Contact No <span className="text-red-500">*</span></label>
                            <input type="text" name="phone" placeholder="e.g. 0300-1234567" value={formData.phone} onChange={handleChange} className={inputCls} required />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Email <span className="text-slate-400 text-xs normal-case">(optional)</span></label>
                            <input type="email" name="email" placeholder="student@example.com" value={formData.email} onChange={handleChange} className={inputCls} />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Transfer / Migration <span className="text-red-500">*</span></label>
                            <select name="is_transfer" value={formData.is_transfer} onChange={handleChange} className={inputCls} required>
                                <option value="">Select</option>
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </select>
                        </div>
                        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                            <label className={labelCls}>Present Address <span className="text-red-500">*</span></label>
                            <input type="text" name="address" placeholder="Full present address" value={formData.address} onChange={handleChange} className={inputCls} required />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Religion <span className="text-red-500">*</span></label>
                            <input type="text" name="religion" placeholder="e.g. Islam" value={formData.religion} onChange={handleChange} className={inputCls} required />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Admission Date</label>
                            <input type="date" name="admission_date" value={formData.admission_date} onChange={handleChange} className={inputCls} required />
                        </div>

                        {/* Mark as Enrolled */}
                        <div className="space-y-2 flex flex-col justify-end">
                            <label className={labelCls}>Enrollment Status</label>
                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:bg-indigo-50 hover:border-indigo-300 transition-all">
                                <input
                                    type="checkbox"
                                    name="is_enrolled"
                                    checked={formData.is_enrolled}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded accent-indigo-600"
                                />
                                <span className="font-semibold text-slate-700 text-sm">Mark as Enrolled</span>
                            </label>
                        </div>

                        {/* Student Picture */}
                        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                            <label className={labelCls}>Student Picture</label>
                            <div className="flex items-center gap-4">
                                {picturePreview ? (
                                    <img src={picturePreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-300" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                )}
                                <input type="file" name="student_picture" accept="image/*" onChange={handlePictureChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    {/* ── Guardian Information ── */}
                    <SectionHeader title="Guardian Information" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className={labelCls}>Guardian Name</label>
                            <input type="text" name="guardian_name" value={formData.guardian_name} onChange={handleChange} className={inputCls} />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Guardian CNIC</label>
                            <input type="text" name="guardian_cnic" placeholder="e.g. 35202-1234567-1" value={formData.guardian_cnic} onChange={handleChange} className={inputCls} />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Guardian Contact No <span className="text-red-500">*</span></label>
                            <input type="text" name="guardian_phone" placeholder="e.g. 0300-1234567" value={formData.guardian_phone} onChange={handleChange} className={inputCls} required />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
