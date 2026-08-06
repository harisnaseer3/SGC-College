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
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showProgramDropdown, setShowProgramDropdown] = useState(false);
    const [showBatchDropdown, setShowBatchDropdown] = useState(false);
    const defaultFilters = {
        campus_id: '',
        program_id: [],
        academic_batch_id: [],
        status: ['Enrolled'],
        search: '',
    };

    const [filterData, setFilterData] = useState(() => {
        try {
            const saved = sessionStorage.getItem('studentLedgerFilters');
            return saved ? JSON.parse(saved) : defaultFilters;
        } catch (e) {
            return defaultFilters;
        }
    });

    const [searchTerm, setSearchTerm] = useState(() => filterData.search);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [printMonth, setPrintMonth] = useState(new Date().getMonth() + 1 >= 7 ? 7 : 1);
    const [printYear, setPrintYear] = useState(new Date().getFullYear());
    const { showSuccess, showError } = useNotifications();

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        sessionStorage.setItem('studentLedgerFilters', JSON.stringify(filterData));
    }, [filterData]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFilterData(prev => ({ ...prev, search: searchTerm }));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleResetFilters = () => {
        setFilterData(defaultFilters);
        setSearchTerm('');
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const fetchInitialData = async () => {
        try {
            const [campusRes, progRes, batchRes] = await Promise.all([
                axios.get('/api/admissions/form-data'),
                axios.get('/api/programs?all=1'),
                axios.get('/api/academic-batches?all=1')
            ]);
            setCampuses(campusRes.data.data.campuses || []);
            
            const programsPayload = progRes.data.data;
            setPrograms(programsPayload.data || programsPayload || []);
            
            const batchesPayload = batchRes.data.data;
            setBatches(batchesPayload.data || batchesPayload || []);
            fetchFees();
        } catch (error) {
            showError('Failed to fetch filter data');
        }
    };

    const fetchFees = async () => {
        setLoading(true);
        try {
            const params = { 
                ...filterData, 
                status: filterData.status.join(','),
                program_id: filterData.program_id.join(','),
                academic_batch_id: filterData.academic_batch_id.join(','),
                month: printMonth,
                year: printYear,
                page: pagination.current_page
            };
            const response = await axios.get('/api/student-fees', { params });
            const data = response.data.data;
            setFees(data.data || []);
            setPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                total: data.total,
                per_page: data.per_page
            });
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
    }, [filterData.campus_id, filterData.program_id, filterData.academic_batch_id, filterData.status, filterData.search, printMonth, printYear, pagination.current_page]);

    return (
        <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 relative">
                <button 
                    onClick={handleResetFilters}
                    className="absolute top-3 right-4 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Reset Filters
                </button>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search</label>
                    <input
                        type="text"
                        placeholder="Name, Roll No, etc."
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
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
                <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Program</label>
                    <div 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white cursor-pointer flex justify-between items-center transition-all hover:border-indigo-400"
                        onClick={() => setShowProgramDropdown(!showProgramDropdown)}
                    >
                        <span className="truncate max-w-[150px]">
                            {filterData.program_id.length === 0 ? 'All Programs' : 
                                programs.filter(p => filterData.program_id.includes(p.id.toString())).map(p => p.name).join(', ') || 'Multiple Selected'}
                        </span>
                        <svg className={`w-4 h-4 transition-transform duration-200 ${showProgramDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    {showProgramDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowProgramDropdown(false)}></div>
                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-200 max-h-64 overflow-y-auto">
                                {programs.map(p => (
                                    <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            checked={filterData.program_id.includes(p.id.toString())}
                                            onChange={(e) => {
                                                const val = p.id.toString();
                                                const newPrograms = e.target.checked 
                                                    ? [...filterData.program_id, val]
                                                    : filterData.program_id.filter(x => x !== val);
                                                setFilterData({ ...filterData, program_id: newPrograms });
                                            }}
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">{p.name}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Batch</label>
                    <div 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white cursor-pointer flex justify-between items-center transition-all hover:border-indigo-400"
                        onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                    >
                        <span className="truncate max-w-[150px]">
                            {filterData.academic_batch_id.length === 0 ? 'All Batches' : 
                                batches.filter(b => filterData.academic_batch_id.includes(b.id.toString())).map(b => b.name).join(', ') || 'Multiple Selected'}
                        </span>
                        <svg className={`w-4 h-4 transition-transform duration-200 ${showBatchDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    {showBatchDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowBatchDropdown(false)}></div>
                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-200 max-h-64 overflow-y-auto">
                                {batches.map(b => (
                                    <label key={b.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            checked={filterData.academic_batch_id.includes(b.id.toString())}
                                            onChange={(e) => {
                                                const val = b.id.toString();
                                                const newBatches = e.target.checked 
                                                    ? [...filterData.academic_batch_id, val]
                                                    : filterData.academic_batch_id.filter(x => x !== val);
                                                setFilterData({ ...filterData, academic_batch_id: newBatches });
                                            }}
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">{b.name}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student Status</label>
                    <div 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white cursor-pointer flex justify-between items-center transition-all hover:border-indigo-400"
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    >
                        <span className="truncate max-w-[150px]">
                            {filterData.status.length === 0 ? 'All Statuses' : filterData.status.join(', ')}
                        </span>
                        <svg className={`w-4 h-4 transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    {showStatusDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)}></div>
                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-200">
                                {['Enrolled', 'Pending', 'Promoted', 'Passed Out', 'Transferred', 'Struck Off'].map(s => (
                                    <label key={s} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            checked={filterData.status.includes(s)}
                                            onChange={(e) => {
                                                const newStatus = e.target.checked 
                                                    ? [...filterData.status, s]
                                                    : filterData.status.filter(x => x !== s);
                                                setFilterData({ ...filterData, status: newStatus });
                                            }}
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">{s}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
            </div>

            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-4">
                    <div className="text-sm font-bold text-indigo-900">Bulk Printing:</div>
                    <select 
                        className="p-1.5 border border-indigo-200 rounded bg-white text-xs font-bold"
                        value={printMonth}
                        onChange={(e) => setPrintMonth(e.target.value)}
                    >
                        <option value="7">Fall Semester (July - Dec)</option>
                        <option value="1">Spring Semester (Jan - June)</option>
                    </select>
                    <select 
                        className="p-1.5 border border-indigo-200 rounded bg-white text-xs font-bold"
                        value={printYear}
                        onChange={(e) => setPrintYear(e.target.value)}
                    >
                        {Array.from({length: 21}, (_, i) => 2020 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <button 
                    disabled={selectedStudents.length === 0}
                    onClick={() => navigate(`/fees/voucher/bulk?student_ids=${selectedStudents.join(',')}&month=${printMonth}&year=${printYear}`)}
                    className={`px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition-all ${
                        selectedStudents.length > 0 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 animate-pulse' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    Generate Vouchers for {selectedStudents.length} Students
                </button>
            </div>

            <DataTable
                columns={[
                    {
                        name: <input 
                            type="checkbox" 
                            onChange={(e) => {
                                if (e.target.checked) setSelectedStudents(fees.map(f => f.student_id));
                                else setSelectedStudents([]);
                            }}
                            checked={selectedStudents.length === fees.length && fees.length > 0}
                        />,
                        width: '40px'
                    },
                    'Student', 'Admission #', 'Program', 'Payable', 'Paid', 'Balance', 'Status', { name: 'Actions', align: 'center' }
                ]}
                data={fees}
                loading={loading}
                emptyMessage="No students found."
                pagination={pagination.total > 0 ? pagination : null}
                onPageChange={(page) => setPagination(prev => ({ ...prev, current_page: page }))}
                renderRow={(fee) => (
                    <>
                        <td className="px-6 py-4">
                            <input 
                                type="checkbox" 
                                checked={selectedStudents.includes(fee.student_id)}
                                onChange={() => {
                                    if (selectedStudents.includes(fee.student_id)) {
                                        setSelectedStudents(selectedStudents.filter(id => id !== fee.student_id));
                                    } else {
                                        setSelectedStudents([...selectedStudents, fee.student_id]);
                                    }
                                }}
                            />
                        </td>
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
                        <td className="px-6 py-4 text-sm font-bold text-fuchsia-600 text-right">Rs. {Number(fee.total_paid).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-rose-600 text-right">Rs. {Number(fee.total_balance).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                fee.aggregated_status === 'no fees' ? 'bg-slate-100 text-slate-600' :
                                fee.aggregated_status === 'unpaid' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                fee.aggregated_status === 'partial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200'
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
