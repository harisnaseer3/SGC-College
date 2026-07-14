import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import DataTable from '../UI/DataTable';

const StudentFeeManagement = () => {
    const navigate = useNavigate();
    const [fees, setFees] = useState([]);
    const [campuses, setCampuses] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [filterData, setFilterData] = useState({
        campus_id: '',
        program_id: '',
        academic_batch_id: '',
        status: 'Enrolled',
        due_date: new Date().toISOString().split('T')[0]
    });
    const { showError, showSuccess } = useNotifications();

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
            // No need to call fetchFees here as the useEffect will catch it
        } catch (error) {
            showError('Failed to fetch filter data');
        }
    };

    const fetchFees = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/student-fees', { params: filterData });
            const payload = response.data.data;
            setFees(payload.data || payload || []);
        } catch (error) {
            showError('Failed to fetch fee records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFees();
    }, [filterData.campus_id, filterData.program_id, filterData.academic_batch_id, filterData.status]);

    const handleGenerate = async () => {
        if (!filterData.campus_id) {
            showError('Please select a campus first');
            return;
        }

        if (!confirm('This will generate fee invoices for all students matching the selected criteria. Continue?')) return;

        setGenerating(true);
        try {
            const response = await axios.post('/api/student-fees/generate', filterData);
            showSuccess(response.data.message);
            fetchFees();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to generate fees');
        } finally {
            setGenerating(false);
        }
    };

    const handleApplyFines = async () => {
        if (!confirm('This will apply late fees to all overdue records. Continue?')) return;
        
        try {
            const response = await axios.post('/api/student-fees/apply-fines', { campus_id: filterData.campus_id });
            showSuccess(response.data.message);
            fetchFees();
        } catch (error) {
            showError('Failed to apply fines');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Misc Fee Operations</h2>
                    <p className="text-slate-500 text-sm">Generate invoices and manage student dues.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleApplyFines}>Apply Overdue Fines</Button>
                    <Button onClick={handleGenerate} loading={generating}>Run Billing Module</Button>
                </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campus</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterData.campus_id}
                        onChange={(e) => setFilterData({ ...filterData, campus_id: e.target.value })}
                        required
                    >
                        <option value="">Select Campus</option>
                        {campuses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Program (Optional)</label>
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Batch (Optional)</label>
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
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
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                    <input
                        type="date"
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterData.due_date}
                        onChange={(e) => setFilterData({ ...filterData, due_date: e.target.value })}
                    />
                </div>
            </div>

            <DataTable
                columns={['Student', 'Total Payable', 'Arrears', 'Balance', 'Status', 'Due Date', { name: 'Actions', align: 'center' }]}
                data={fees}
                loading={loading}
                emptyMessage="No billing records found. Run the engine to generate fees."
                renderRow={(fee) => (
                    <>
                        <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-800">{fee.student?.first_name} {fee.student?.last_name}</div>
                            <div className="text-[10px] text-slate-500">Roll No: {fee.student?.roll_number}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">Rs. {Number(fee.total_amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-rose-600">Rs. {Number(fee.total_arrears || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-indigo-600">Rs. {Number(fee.total_balance).toLocaleString()}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                fee.aggregated_status === 'unpaid' ? 'bg-rose-100 text-rose-700' :
                                fee.aggregated_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                            }`}>
                                {fee.aggregated_status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{new Date(fee.earliest_due_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-center">
                            <div className="flex justify-end items-center">
                                <button 
                                    onClick={() => navigate(`/fees/voucher/${fee.student_id}`)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
                                >
                                    <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print Voucher
                                </button>
                            </div>
                        </td>
                    </>
                )}
            />
        </div>
    );
};

export default StudentFeeManagement;
