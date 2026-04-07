import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../UI/DataTable';
import Button from '../UI/Button';
import Card from '../UI/Card';
import StatusBadge from '../UI/StatusBadge';

const AdmissionByDateReport = () => {
    const { selectedCampus } = useAuth();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [campusDetails, setCampusDetails] = useState(null);
    const [filters, setFilters] = useState({
        start_date: '2025-01-01', // Wide default starting range
        end_date: new Date().toLocaleDateString('sv-SE')  // YYYY-MM-DD local
    });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = { 
                ...filters,
                campus_id: selectedCampus 
            };
            const response = await axios.get('/api/reports/admissions/by-date', { params });
            if (response.data.success) {
                setData(response.data.data.students || []);
            }
        } catch (err) {
            console.error('Failed to fetch report:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCampusDetails = async () => {
        if (!selectedCampus) {
            setCampusDetails(null);
            return;
        }
        try {
            const orgId = localStorage.getItem('selected_org_id');
            if (orgId) {
                const response = await axios.get(`/api/organizations/${orgId}/campuses`);
                const campuses = response.data.data?.data || response.data.data || [];
                const active = campuses.find(c => String(c.id) === String(selectedCampus));
                setCampusDetails(active || null);
            }
        } catch (err) {
            console.error('Failed to fetch campus details:', err);
        }
    };

    useEffect(() => {
        fetchReport();
        fetchCampusDetails();
    }, [selectedCampus]);

    const handleApplyFilters = (e) => {
        if (e) e.preventDefault();
        fetchReport();
    };

    const columns = [
        "Admission #",
        "Student Name",
        "Program",
        "Campus",
        "Batch",
        "Adm. Date",
        "Status"
    ];

    const renderRow = (item, index) => (
        <React.Fragment key={item?.id || index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">
                {String(item?.admission_number || '—')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {String(item?.first_name?.[0] || '')}{String(item?.last_name?.[0] || '') || '?'}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                        {String(item?.first_name || '')} {String(item?.last_name || '')}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                {String(item?.program?.name || '—')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                {String(item?.campus?.name || '—')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                {String(item?.academic_batch?.name || '—')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                {String(item?.admission_date || '—')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={String(item?.status || '')} />
            </td>
        </React.Fragment>
    );

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 print:p-0">
            {/* Report Header - Screen Only */}
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admission by Date Report</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">View and filter admissions across a specific period.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print Report
                    </Button>
                </div>
            </div>

            {/* Filters - Screen Only */}
            <Card className="p-6 no-print border-indigo-50 shadow-indigo-50/50" hover={false}>
                <form onSubmit={handleApplyFilters} className="flex flex-wrap items-end gap-6">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.start_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">End Date</label>
                        <input
                            type="date"
                            value={filters.end_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50"
                        />
                    </div>
                    <div className="flex-none">
                        <Button type="submit" loading={loading} className="px-8 shadow-lg shadow-indigo-200">
                            Apply Filters
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Print Header - Visible only when printing */}
            <div className="hidden print:block text-center mb-8 border-b-2 border-slate-900 pb-6">
                {campusDetails?.logo_url && (
                    <img 
                        src={`/storage/${campusDetails.logo_url}`} 
                        alt="Campus Logo" 
                        className="h-20 mx-auto mb-4 object-contain"
                    />
                )}
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{campusDetails?.name || 'CAMPUS REPORT'}</h1>
                <p className="text-lg font-bold text-slate-700 mt-1 uppercase tracking-widest">Admission by Date Report</p>
                <div className="flex justify-center gap-6 mt-4 text-sm font-bold text-slate-500">
                    <span>PERIOD: {filters.start_date} TO {filters.end_date}</span>
                    <span>GENERATED: {new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Report Data */}
            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                renderRow={renderRow}
                emptyMessage="No admissions found for the selected date range."
                className="print:shadow-none print:border-none"
            />

            {/* Print Footer */}
            <div className="hidden print:flex justify-between mt-12 pt-8 border-t border-slate-200 text-xs font-bold text-slate-400">
                <p>System Generated Report - {new Date().toLocaleString()}</p>
                <p>Page 1 of 1</p>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .print\\:block { display: block !important; }
                    .print\\:flex { display: flex !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:shadow-none { shadow: none !important; box-shadow: none !important; }
                    .print\\:border-none { border: none !important; }
                }
            `}</style>
        </div>
    );
};

export default AdmissionByDateReport;
