import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';

const StudentFeeManagement = () => {
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
            fetchFees();
        } catch (error) {
            showError('Failed to fetch filter data');
        }
    };

    const fetchFees = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/student-fees');
            setFees(response.data.data.data || []);
        } catch (error) {
            showError('Failed to fetch fee records');
        } finally {
            setLoading(false);
        }
    };

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
                    <h2 className="text-xl font-bold text-slate-800">Billing Engine</h2>
                    <p className="text-slate-500 text-sm">Generate invoices and manage student dues.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleApplyFines}>Apply Overdue Fines</Button>
                    <Button onClick={handleGenerate} loading={generating}>Run Billing Module</Button>
                </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                    <input
                        type="date"
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterData.due_date}
                        onChange={(e) => setFilterData({ ...filterData, due_date: e.target.value })}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Student</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Fee Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr>
                                <td colSpan="5" className="px-6 py-12 text-center">
                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                                    <span className="text-slate-500 text-sm">Loading records...</span>
                                </td>
                            </tr>
                        ) : fees.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic text-sm">No billing records found. Run the engine to generate fees.</td>
                            </tr>
                        ) : (
                            fees.map((fee) => (
                                <tr key={fee.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-slate-800">{fee.student?.first_name} {fee.student?.last_name}</div>
                                        <div className="text-[10px] text-slate-500">Roll No: {fee.student?.roll_number}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{fee.fee_head?.name}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">Rs. {fee.amount}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                            fee.status === 'unpaid' ? 'bg-rose-100 text-rose-700' :
                                            fee.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {fee.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(fee.due_date).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentFeeManagement;
