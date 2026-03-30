import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Card from '../UI/Card';
import Button from '../UI/Button';

const statusColors = {
    Enrolled: 'bg-emerald-100 text-emerald-700',
    Pending:  'bg-amber-100 text-amber-700',
    Active:   'bg-emerald-100 text-emerald-700',
};

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

    useEffect(() => { fetchStudents(); }, []);

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

    const avatarSrc = (student) =>
        student.student_picture
            ? `/storage/${student.student_picture}`
            : null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admission Register</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage and view all student admissions.</p>
                </div>
                <Button onClick={() => navigate('/new-admission')}>New Admission</Button>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50/50">
                                {['Student Name','Admission #','Program / Semester','Batch','Intake','Campus','Status','Actions'].map(h => (
                                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-medium">Loading admissions...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-medium">No student records found.</td></tr>
                            ) : students.map((student) => {
                                const pic = avatarSrc(student);
                                const statusCls = statusColors[student.status] || 'bg-slate-100 text-slate-600';
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
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
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusCls}`}>
                                                {student.status ?? 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelected(student)}
                                                title="View Details"
                                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

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
                                    <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white`}>
                                        {selected.status ?? 'Pending'}
                                    </span>
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
