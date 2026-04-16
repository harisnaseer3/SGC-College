import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DataTable from '../UI/DataTable';
import Card from '../UI/Card';
import Button from '../UI/Button';
import StatusBadge from '../UI/StatusBadge';
import StatusUpdateModal from './Status/StatusUpdateModal';

const DetailRow = ({ label, value }) => value ? (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
) : null;

const AdmissionList = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    
    // Status Modal State
    const [statusModal, setStatusModal] = useState({
        isOpen: false,
        student: null
    });

    const [filters, setFilters] = useState({
        search: '',
        program_id: '',
        campus_id: '',
        academic_batch_id: '',
        status: '',
        intake_session: ''
    });

    const [formOptions, setFormOptions] = useState({
        campuses: [],
        programs: [],
        batches: [],
    });

    useEffect(() => {
        fetchStudents();
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const response = await axios.get('/api/admissions/form-data');
            setFormOptions(response.data.data);
        } catch (error) {
            console.error('Error fetching form data:', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await axios.get('/api/admissions');
            setStudents(response.data.data);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this student record? This action can be recovered later.')) return;
        
        try {
            await axios.delete(`/api/admissions/${id}`);
            setStudents(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('Failed to delete student. Please try again.');
        }
    };

    const handleStatusUpdated = (updatedStudent) => {
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
        if (selected?.id === updatedStudent.id) {
            setSelected(updatedStudent);
        }
    };

    const avatarSrc = (student) =>
        student.student_picture
            ? `/storage/${student.student_picture}`
            : null;

    const filteredStudents = students.filter(s => {
        const matchesSearch = !filters.search || 
            `${s.first_name} ${s.last_name} ${s.admission_number} ${s.email}`.toLowerCase()
            .includes(filters.search.toLowerCase());
        
        const matchesProgram = !filters.program_id || s.program_id == filters.program_id;
        const matchesCampus  = !filters.campus_id || s.campus_id == filters.campus_id;
        const matchesBatch   = !filters.academic_batch_id || s.academic_batch_id == filters.academic_batch_id;
        const matchesStatus  = !filters.status || s.status == filters.status;
        const matchesIntake  = !filters.intake_session || s.intake_session == filters.intake_session;

        return matchesSearch && matchesProgram && matchesCampus && matchesBatch && matchesStatus && matchesIntake;
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            program_id: '',
            campus_id: '',
            academic_batch_id: '',
            status: '',
            intake_session: ''
        });
    };

    const filterInputCls = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admission Register</h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Advanced student lookup and registry management.</p>
                </div>
                <Button onClick={() => navigate('/new-admission')}>New Admission</Button>
            </div>

            {/* ── Filter Bar ── */}
            <Card className="p-5 bg-slate-50/50 border-slate-200/60 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <div className="relative group xl:col-span-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            name="search"
                            placeholder="Name, ID or Email..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            className={`${filterInputCls} pl-9`}
                        />
                    </div>

                    <select name="program_id" value={filters.program_id} onChange={handleFilterChange} className={filterInputCls}>
                        <option value="">All Programs</option>
                        {formOptions.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <select name="academic_batch_id" value={filters.academic_batch_id} onChange={handleFilterChange} className={filterInputCls}>
                        <option value="">All Batches</option>
                        {formOptions.batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <select name="campus_id" value={filters.campus_id} onChange={handleFilterChange} className={filterInputCls}>
                        <option value="">All Campuses</option>
                        {formOptions.campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select name="status" value={filters.status} onChange={handleFilterChange} className={filterInputCls}>
                        <option value="">All Status</option>
                        <option value="Enrolled">Enrolled</option>
                        <option value="Struck Off">Struck Off</option>
                        <option value="Passed Out">Passed Out</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Transferred">Transferred</option>
                        <option value="Pending">Pending</option>
                    </select>

                    <div className="flex gap-2">
                        <select name="intake_session" value={filters.intake_session} onChange={handleFilterChange} className={`${filterInputCls} flex-1`}>
                            <option value="">Intake</option>
                            <option value="Fall">Fall</option>
                            <option value="Spring">Spring</option>
                        </select>
                        <button
                            onClick={clearFilters}
                            title="Reset Filters"
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-slate-200 bg-white transition-all shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </Card>

            <DataTable
                columns={['Student Name', 'Admission #', 'Program / Semester', 'Batch', 'Intake', 'Campus', 'Status', { name: 'Actions', align: 'left' }]}
                data={filteredStudents}
                loading={loading}
                emptyMessage="No student records found."
                renderRow={(student) => {
                    const pic = avatarSrc(student);
                    return (
                        <>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    {pic ? (
                                        <img src={pic} alt={student.first_name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm select-none">
                                            {student.first_name?.[0]}{student.last_name?.[0]}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-slate-900 leading-none">{student.first_name} {student.last_name}</p>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">{student.email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-600">{student.admission_number}</td>
                            <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-900">{student.program?.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                    {student.program_semester ? `Semester ${student.program_semester.semester_number}` : 'N/A'}
                                </p>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{student.academic_batch?.name ?? '—'}</td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{student.intake_session ?? '—'}</td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{student.campus?.name}</td>
                            <td className="px-6 py-4">
                                <StatusBadge status={student.status} />
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSelected(student); }}
                                        title="View Details"
                                        className="p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                                    >
                                        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setStatusModal({ isOpen: true, student: student });
                                        }}
                                        title="Lifecycle Actions (Promote, Transfer, etc.)"
                                        className="p-2 text-indigo-400 hover:text-indigo-600 transition-all rounded-xl hover:bg-indigo-50 border border-indigo-100/50 hover:border-indigo-200 shadow-sm bg-white"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/edit-admission/${student.id}`); }}
                                        title="Edit student"
                                        className="p-2 text-slate-400 hover:text-amber-600 transition-all rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100"
                                    >
                                        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-10l-1.5 1.5M19 4a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            handleDelete(student.id); 
                                        }}
                                        title="Delete student"
                                        className="p-2 text-slate-400 hover:text-rose-600 transition-all rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
                                    >
                                        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </>
                    );
                }}
            />

            {/* ── Status Update Modal ── */}
            <StatusUpdateModal
                isOpen={statusModal.isOpen}
                student={statusModal.student}
                campuses={formOptions.campuses}
                onClose={() => setStatusModal({ isOpen: false, student: null })}
                onStatusUpdated={handleStatusUpdated}
            />

            {/* ── Detail Slide-over Panel ── */}
            {selected && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />

                    {/* Panel */}
                    <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-8 text-white relative">
                            <button
                                onClick={() => setSelected(null)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="flex items-center gap-4">
                                {avatarSrc(selected) ? (
                                    <img
                                        src={avatarSrc(selected)}
                                        alt={selected.first_name}
                                        className="w-16 h-16 rounded-full object-cover border-2 border-white/50"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl select-none">
                                        {selected.first_name?.[0]}{selected.last_name?.[0]}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold">{selected.first_name} {selected.last_name}</h2>
                                    <p className="text-indigo-200 text-sm mt-0.5">{selected.email || 'No email'}</p>
                                    <div className="mt-2">
                                        <StatusBadge status={selected.status} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6 space-y-6">
                            {/* Academic */}
                            <div>
                                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Academic</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailRow label="Admission #" value={selected.admission_number} />
                                    <DetailRow label="Roll Number" value={selected.roll_number} />
                                    <DetailRow label="Program" value={selected.program?.name} />
                                    <DetailRow label="Semester" value={selected.program_semester ? `Semester ${selected.program_semester.semester_number}` : null} />
                                    <DetailRow label="Batch" value={selected.academic_batch?.name} />
                                    <DetailRow label="Intake" value={selected.intake_session} />
                                    <DetailRow label="Campus" value={selected.campus?.name} />
                                    <DetailRow label="Admission Date" value={selected.admission_date} />
                                </div>
                            </div>

                            {/* Personal */}
                            <div className="border-t border-slate-100 pt-5">
                                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Personal</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailRow label="CNIC" value={selected.student_cnic} />
                                    <DetailRow label="Date of Birth" value={selected.date_of_birth} />
                                    <DetailRow label="Contact No" value={selected.phone} />
                                    <DetailRow label="Gender" value={selected.gender} />
                                    <DetailRow label="Religion" value={selected.religion} />
                                    <DetailRow label="Transfer Student" value={selected.is_transfer ? 'Yes' : 'No'} />
                                    <div className="col-span-2">
                                        <DetailRow label="Present Address" value={selected.address} />
                                    </div>
                                </div>
                            </div>

                            {/* Guardian */}
                            <div className="border-t border-slate-100 pt-5">
                                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Guardian</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailRow label="Name" value={selected.guardian_name} />
                                    <DetailRow label="Contact No" value={selected.guardian_phone} />
                                    <DetailRow label="CNIC" value={selected.guardian_cnic} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdmissionList;
