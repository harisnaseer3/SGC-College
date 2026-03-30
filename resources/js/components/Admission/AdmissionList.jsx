import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Card from '../UI/Card';
import Button from '../UI/Button';

const AdmissionList = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudents();
    }, []);

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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admission Register</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage and view all student admissions.</p>
                </div>
                <Button onClick={() => navigate('/new-admission')}>
                    New Admission
                </Button>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Student Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Admission #</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Program / Semester</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Batch</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Intake</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Campus</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">Loading admissions...</td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">No student records found.</td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                    {student.first_name[0]}{student.last_name[0]}
                                                </div>
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
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                            {student.academic_batch?.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                            {student.intake_session}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{student.campus?.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
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

export default AdmissionList;
