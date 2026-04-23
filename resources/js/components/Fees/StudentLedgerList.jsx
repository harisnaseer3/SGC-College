import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import DataTable from '../UI/DataTable';

const StudentLedgerList = () => {
    const navigate = useNavigate();
    const [fees, setFees] = useState([]);
    const [campuses, setCampuses] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterData, setFilterData] = useState({
        campus_id: '',
        program_id: '',
        academic_batch_id: '',
        status: 'Enrolled',
    });
    const { showSuccess, showError } = useNotifications();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [campusRes, progRes, batchRes] = await Promise.all([
                axios.get('/api/admissions/form-data'),
                axios.get('/api/programs'),
                axios.get('/api/academic-batches')
            ]);
            setCampuses(campusRes.data.data.campuses);
            setPrograms(progRes.data.data);
            setBatches(batchRes.data.data);
            fetchFees();
        } catch (error) {
            showError('Failed to fetch filter data');
        }
    };

    const fetchFees = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/student-fees', { params: filterData });
            setFees(response.data.data || []);
        } catch (error) {
            showError('Failed to fetch fee records');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignFee = async (studentId) => {
        try {
            await axios.post(`/api/student-fees/assign/${studentId}`);
            showSuccess('Fees assigned successfully');
            fetchFees();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to assign fees');
        }
    };

    useEffect(() => {
        fetchFees();
    }, [filterData.campus_id, filterData.program_id, filterData.academic_batch_id, filterData.status]);

    return (
        <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campus</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterData.campus_id}
                        onChange={(e) => setFilterData({ ...filterData, campus_id: e.target.value })}
                    >
                        <option value="">All Campuses</option>
                        {campuses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Program</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterData.program_id}
                        onChange={(e) => setFilterData({ ...filterData, program_id: e.target.value })}
                    >
                        <option value="">All Programs</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Batch</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterData.academic_batch_id}
                        onChange={(e) => setFilterData({ ...filterData, academic_batch_id: e.target.value })}
                    >
                        <option value="">All Batches</option>
                        {batches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student Status</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterData.status}
                        onChange={(e) => setFilterData({ ...filterData, status: e.target.value })}
                    >
                        <option value="">All Statuses</option>
                        <option value="Enrolled">Enrolled</option>
                        <option value="Pending">Pending</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Passed Out">Passed Out</option>
                        <option value="Transferred">Transferred</option>
                        <option value="Struck Off">Struck Off</option>
                    </select>
                </div>
            </div>

            <DataTable
                columns={['Student', 'Admission #', 'Program', 'Payable', 'Paid', 'Balance', 'Status', { name: 'Actions', align: 'center' }]}
                data={fees}
                loading={loading}
                emptyMessage="No students found."
                renderRow={(fee) => (
                    <>
                        <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-800">{fee.student?.first_name} {fee.student?.last_name}</div>
                            <div className="text-[10px] text-slate-500">Roll No: {fee.student?.roll_number}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{fee.student?.admission_number}</td>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-700">{fee.student?.program?.name || 'N/A'}</div>
                            <div className="text-[10px] text-slate-400">{fee.student?.academic_class?.name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">Rs. {Number(fee.total_amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">Rs. {Number(fee.total_paid).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-indigo-600 text-right">Rs. {Number(fee.total_balance).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                fee.aggregated_status === 'no fees' ? 'bg-slate-100 text-slate-600' :
                                fee.aggregated_status === 'unpaid' ? 'bg-rose-100 text-rose-700' :
                                fee.aggregated_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                            }`}>
                                {fee.aggregated_status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            {fee.aggregated_status === 'no fees' ? (
                                <button 
                                    onClick={() => handleAssignFee(fee.student_id)}
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-all duration-200"
                                >
                                    Assign Fee
                                </button>
                            ) : (
                                <button 
                                    onClick={() => navigate(`/fees/ledger/${fee.student_id}`)}
                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-all duration-200"
                                >
                                View Ledger
                                </button>
                            )}
                        </td>
                    </>
                )}
            />
        </div>
    );
};

export default StudentLedgerList;
