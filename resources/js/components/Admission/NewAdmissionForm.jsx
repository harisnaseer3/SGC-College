import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

const inputCls = "w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal";
const labelCls = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2";

const CardSectionHeader = ({ icon, title, subtitle, color = "indigo" }) => {
    const colorClasses = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        sky: "bg-sky-50 text-sky-600 border-sky-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
    };

    return (
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
            <div className={`p-2.5 rounded-xl border ${colorClasses[color] || colorClasses.indigo} shadow-sm shrink-0`}>
                {icon}
            </div>
            <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
};

const NewAdmissionForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useNotifications();
    const { selectedCampus } = useAuth();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        campus_id: '',
        program_id: '',
        program_semester_id: '',
        academic_batch_id: '',
        intake_session: '',
        admission_number: '',
        registration_no: '',
        roll_number: '',
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

    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [deletedAttachments, setDeletedAttachments] = useState([]);

    const [formOptions, setFormOptions] = useState({
        campuses: [],
        programs: [],
        batches: [],
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchOptions();
            if (isEdit) {
                await fetchStudentData();
            }
            setLoading(false);
        };
        init();
    }, [id]);

    useEffect(() => {
        if (selectedCampus && !isEdit) {
            setFormData(prev => ({ ...prev, campus_id: selectedCampus }));
        }
    }, [selectedCampus, isEdit]);

    const fetchOptions = async () => {
        try {
            const response = await axios.get('/api/admissions/form-data');
            const data = response.data.data;
            setFormOptions(data);
        } catch (error) {
            console.error('Error fetching form data:', error);
            showError('Failed to load form options.');
        }
    };

    const fetchStudentData = async () => {
        try {
            const response = await axios.get(`/api/admissions/${id}`);
            const s = response.data.data;
            setFormData({
                campus_id:           s.campus_id || '',
                program_id:          s.program_id || '',
                program_semester_id: s.program_semester_id || '',
                academic_batch_id:   s.academic_batch_id || '',
                intake_session:      s.intake_session || '',
                admission_number:    s.admission_number || '',
                registration_no:     s.registration_no || '',
                roll_number:         s.roll_number || '',
                first_name:          s.first_name || '',
                last_name:           s.last_name || '',
                student_cnic:        s.student_cnic || '',
                date_of_birth:       s.date_of_birth || '',
                phone:               s.phone || '',
                email:               s.email || '',
                gender:              s.gender || '',
                is_transfer:         s.is_transfer ? 'true' : 'false',
                address:             s.address || '',
                religion:            s.religion || '',
                is_enrolled:         s.status === 'Enrolled',
                guardian_name:       s.guardian_name || '',
                guardian_cnic:       s.guardian_cnic || '',
                guardian_phone:      s.guardian_phone || '',
                admission_date:      s.admission_date || '',
            });
            if (s.student_picture) {
                setPicturePreview(`/storage/${s.student_picture}`);
            }
            if (s.attachments && Array.isArray(s.attachments)) {
                setExistingAttachments(s.attachments);
            }
        } catch (error) {
            console.error('Error fetching student:', error);
            showError('Failed to load student data.');
            navigate('/admissions');
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'program_id') {
                updated.program_semester_id = '';
                updated.academic_batch_id = '';
            }
            return updated;
        });
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
            
            if (isEdit) {
                payload.append('_method', 'PUT');
            }

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

            attachmentFiles.forEach((file) => {
                payload.append('attachments[]', file);
            });

            deletedAttachments.forEach((path) => {
                payload.append('deleted_attachments[]', path);
            });

            const url = isEdit ? `/api/admissions/${id}` : '/api/admissions';
            
            await axios.post(url, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            showSuccess(isEdit ? 'Student updated successfully!' : 'Student admitted successfully!');
            navigate('/admissions');
        } catch (error) {
            const errors = error.response?.data?.errors;
            if (errors) {
                const msgs = Object.values(errors).flat().join(' | ');
                showError(msgs);
            } else {
                showError(error.response?.data?.message || 'Error processing admission');
            }
            console.error('Error submitting form:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Loading Registration Form...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
            {/* Top Page Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-3">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Student Management
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">
                        {isEdit ? 'Edit Student Admission' : 'New Student Admission'}
                    </h1>
                    <p className="text-indigo-200/80 text-sm mt-1 max-w-xl">
                        {isEdit ? 'Update student records, program assignments, and documents.' : 'Complete the student profile and academic details to generate admission record.'}
                    </p>
                </div>
                <div className="flex gap-3 relative z-10">
                    <Button variant="secondary" onClick={() => navigate('/admissions')} className="bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur">
                        ← Back to List
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Academic Enrollment */}
                <Card className="p-6 sm:p-8 border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardSectionHeader
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>}
                        title="Academic Enrollment"
                        subtitle="Assign campus, program degree, semester, and batch"
                        color="indigo"
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        <div>
                            <label className={labelCls}>Campus <span className="text-rose-500">*</span></label>
                            <select name="campus_id" value={formData.campus_id} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Campus</option>
                                {formOptions.campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelCls}>Program <span className="text-rose-500">*</span></label>
                            <select name="program_id" value={formData.program_id} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Program</option>
                                {formOptions.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        {formData.program_id ? (
                            <>
                                <div>
                                    <label className={labelCls}>Semester <span className="text-rose-500">*</span></label>
                                    <select name="program_semester_id" value={formData.program_semester_id} onChange={handleChange} className={inputCls} required>
                                        <option value="">Select Semester</option>
                                        {(() => {
                                            const prog = formOptions.programs.find(p => p.id == formData.program_id);
                                            if (!prog) return null;
                                            const totalSems = prog.total_semesters || 8;
                                            return prog.semesters
                                                ?.filter(s => s.semester_number <= totalSems)
                                                .map(s => (
                                                    <option key={s.id} value={s.id}>Semester {s.semester_number}</option>
                                                ));
                                        })()}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Academic Batch <span className="text-rose-500">*</span></label>
                                    <select name="academic_batch_id" value={formData.academic_batch_id} onChange={handleChange} className={inputCls} required>
                                        <option value="">Select Batch</option>
                                        {formOptions.batches
                                            .filter(b => b.campus_id == formOptions.programs.find(p => p.id == formData.program_id)?.campus_id)
                                            .map(b => <option key={b.id} value={b.id}>{b.name}{b.is_active ? ' (Active)' : ''}</option>)}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div className="col-span-1 sm:col-span-2 text-slate-400 italic text-xs flex items-center p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                                Select a program first to choose semester and batch.
                            </div>
                        )}

                        <div>
                            <label className={labelCls}>Intake Session <span className="text-rose-500">*</span></label>
                            <select name="intake_session" value={formData.intake_session} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Intake</option>
                                <option value="Fall">Fall</option>
                                <option value="Spring">Spring</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Section 2: Student Personal Information */}
                <Card className="p-6 sm:p-8 border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardSectionHeader
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        title="Student Information"
                        subtitle="Personal details, identity numbers, and contact info"
                        color="emerald"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div>
                            <label className={labelCls}>Admission No.</label>
                            <input 
                                type="text" 
                                name="admission_number" 
                                placeholder="Auto-generated" 
                                value={formData.admission_number} 
                                onChange={handleChange} 
                                className={`${inputCls} bg-slate-100/80 text-slate-500 font-bold cursor-not-allowed`} 
                                readOnly 
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Registration No. <span className="text-slate-400 text-[10px] normal-case">(optional)</span></label>
                            <input 
                                type="text" 
                                name="registration_no" 
                                placeholder="e.g. REG-12345" 
                                value={formData.registration_no} 
                                onChange={handleChange} 
                                className={inputCls} 
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Roll No. <span className="text-slate-400 text-[10px] normal-case">(optional)</span></label>
                            <input 
                                type="number" 
                                name="roll_number" 
                                placeholder="e.g. 101" 
                                value={formData.roll_number} 
                                onChange={handleChange} 
                                className={inputCls} 
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Admission Date <span className="text-rose-500">*</span></label>
                            <input type="date" name="admission_date" value={formData.admission_date} onChange={handleChange} className={inputCls} required />
                        </div>

                        <div>
                            <label className={labelCls}>First Name <span className="text-rose-500">*</span></label>
                            <input type="text" name="first_name" placeholder="First name" value={formData.first_name} onChange={handleChange} className={inputCls} required />
                        </div>

                        <div>
                            <label className={labelCls}>Last Name <span className="text-rose-500">*</span></label>
                            <input type="text" name="last_name" placeholder="Last name" value={formData.last_name} onChange={handleChange} className={inputCls} required />
                        </div>

                        <div>
                            <label className={labelCls}>Student CNIC / B-Form</label>
                            <input type="text" name="student_cnic" placeholder="35202-1234567-1" value={formData.student_cnic} onChange={handleChange} className={inputCls} />
                        </div>

                        <div>
                            <label className={labelCls}>Date of Birth <span className="text-rose-500">*</span></label>
                            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={inputCls} required />
                        </div>

                        <div>
                            <label className={labelCls}>Contact Phone <span className="text-rose-500">*</span></label>
                            <input type="text" name="phone" placeholder="0300-1234567" value={formData.phone} onChange={handleChange} className={inputCls} required />
                        </div>

                        <div>
                            <label className={labelCls}>Email Address <span className="text-slate-400 text-[10px] normal-case">(optional)</span></label>
                            <input type="email" name="email" placeholder="student@example.com" value={formData.email} onChange={handleChange} className={inputCls} />
                        </div>

                        <div>
                            <label className={labelCls}>Gender <span className="text-rose-500">*</span></label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className={inputCls} required>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelCls}>Transfer / Migration <span className="text-rose-500">*</span></label>
                            <select name="is_transfer" value={formData.is_transfer} onChange={handleChange} className={inputCls} required>
                                <option value="">Select</option>
                                <option value="false">No (Direct Admission)</option>
                                <option value="true">Yes (Migrated Student)</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelCls}>Religion <span className="text-rose-500">*</span></label>
                            <input type="text" name="religion" placeholder="e.g. Islam" value={formData.religion} onChange={handleChange} className={inputCls} required />
                        </div>

                        <div className="sm:col-span-2">
                            <label className={labelCls}>Enrollment Status</label>
                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all group">
                                <input
                                    type="checkbox"
                                    name="is_enrolled"
                                    checked={formData.is_enrolled}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                                />
                                <span className="font-semibold text-slate-700 text-sm group-hover:text-emerald-900">Mark Student as Enrolled Immediately</span>
                            </label>
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                            <label className={labelCls}>Present Home Address <span className="text-rose-500">*</span></label>
                            <input type="text" name="address" placeholder="House no, Street, Colony, City" value={formData.address} onChange={handleChange} className={inputCls} required />
                        </div>
                    </div>
                </Card>

                {/* Section 3: Student Photo & Attachments */}
                <Card className="p-6 sm:p-8 border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardSectionHeader
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        title="Student Photo & Document Uploads"
                        subtitle="Upload profile avatar picture and supporting transcripts / CNIC files"
                        color="purple"
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Avatar Picture Card */}
                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center text-center space-y-4">
                            <div className="relative group">
                                {picturePreview ? (
                                    <img src={picturePreview} alt="Preview" className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg ring-4 ring-indigo-100" />
                                ) : (
                                    <div className="w-28 h-28 rounded-full bg-indigo-50 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-400">
                                        <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Upload Photo</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Student Profile Photo</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG or WEBP (Max 2MB)</p>
                            </div>
                            <label className="cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm">
                                Choose Image
                                <input type="file" name="student_picture" accept="image/*" onChange={handlePictureChange} className="hidden" />
                            </label>
                        </div>

                        {/* File Attachments Box */}
                        <div className="lg:col-span-2 space-y-4">
                            <label className={labelCls}>Supporting Documents (CNIC, Metric/FSc Transcripts)</label>
                            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl p-6 bg-slate-50/50 transition-all text-center">
                                <svg className="w-8 h-8 text-indigo-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <p className="text-xs font-bold text-slate-700">Click to select attachment files</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, JPEG, PNG supported</p>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept=".pdf,.jpg,.jpeg,.png" 
                                    onChange={(e) => {
                                        const newFiles = Array.from(e.target.files);
                                        setAttachmentFiles(prev => [...prev, ...newFiles]);
                                        e.target.value = null;
                                    }} 
                                    className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" 
                                />
                            </div>

                            {/* File List Badges */}
                            {(existingAttachments.length > 0 || attachmentFiles.length > 0) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    {existingAttachments.map((path, idx) => (
                                        <div key={`exist-${idx}`} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                            <a href={`/storage/${path}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:underline truncate max-w-[180px]">
                                                {path.split('/').pop()}
                                            </a>
                                            <button type="button" onClick={() => {
                                                setDeletedAttachments([...deletedAttachments, path]);
                                                setExistingAttachments(existingAttachments.filter(p => p !== path));
                                            }} className="text-rose-600 hover:text-rose-800 text-[10px] font-extrabold uppercase px-2 py-1 bg-rose-50 rounded-lg transition-colors">
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                    {attachmentFiles.map((file, idx) => (
                                        <div key={`new-${idx}`} className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-xs font-bold text-slate-800 truncate">{file.name}</span>
                                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded uppercase">New</span>
                                            </div>
                                            <button type="button" onClick={() => {
                                                setAttachmentFiles(attachmentFiles.filter((_, i) => i !== idx));
                                            }} className="text-rose-600 hover:text-rose-800 text-[10px] font-extrabold uppercase px-2 py-1 bg-rose-50 rounded-lg transition-colors">
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Section 4: Guardian Information */}
                <Card className="p-6 sm:p-8 border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardSectionHeader
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                        title="Guardian Information"
                        subtitle="Father or legal guardian details and contact emergency info"
                        color="amber"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                            <label className={labelCls}>Guardian Name</label>
                            <input type="text" name="guardian_name" placeholder="Father / Guardian Name" value={formData.guardian_name} onChange={handleChange} className={inputCls} />
                        </div>

                        <div>
                            <label className={labelCls}>Guardian CNIC</label>
                            <input type="text" name="guardian_cnic" placeholder="35202-1234567-1" value={formData.guardian_cnic} onChange={handleChange} className={inputCls} />
                        </div>

                        <div>
                            <label className={labelCls}>Guardian Contact Phone <span className="text-rose-500">*</span></label>
                            <input type="text" name="guardian_phone" placeholder="0300-1234567" value={formData.guardian_phone} onChange={handleChange} className={inputCls} required />
                        </div>
                    </div>
                </Card>

                {/* Form Footer Action Buttons */}
                <div className="flex items-center justify-end gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-lg sticky bottom-4 z-20">
                    <Button variant="secondary" onClick={() => navigate('/admissions')} type="button" className="px-6">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="px-8 shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                        {submitting ? (isEdit ? 'Updating Student...' : 'Registering Student...') : (isEdit ? 'Update Student Record' : 'Register Student Admission')}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default NewAdmissionForm;

