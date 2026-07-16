import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../UI/DataTable';
import Button from '../UI/Button';
import Card from '../UI/Card';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import StatusBadge from '../UI/StatusBadge';

const AdmissionByDateReport = () => {
    const { selectedCampus, selectedOrganization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [campusDetails, setCampusDetails] = useState(null);
    const [orgDetails, setOrgDetails] = useState(null);
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

    const fetchDetails = async () => {
        try {
            const orgId = localStorage.getItem('selected_org_id');
            if (!orgId) return;

            // Fetch Organization Details
            const orgRes = await axios.get(`/api/organizations/${orgId}`);
            if (orgRes.data.success) {
                setOrgDetails(orgRes.data.data);
            }

            // Fetch Campus Details if selected
            if (selectedCampus) {
                const response = await axios.get(`/api/organizations/${orgId}/campuses`);
                const campuses = response.data.data?.data || response.data.data || [];
                const active = campuses.find(c => String(c.id) === String(selectedCampus));
                setCampusDetails(active || null);
            } else {
                setCampusDetails(null);
            }
        } catch (err) {
            console.error('Failed to fetch details:', err);
        }
    };

    const debounceTimer = useRef(null);

    // Instant fetch on date changes
    useEffect(() => {
        fetchReport();
    }, [filters.start_date, filters.end_date, selectedCampus, selectedOrganization]);

    useEffect(() => {
        fetchDetails();
    }, [selectedCampus, selectedOrganization]);

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
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs print:hidden">
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

    const handleExportExcel = async () => {
        if (!data || data.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');

        worksheet.columns = [
            { width: 15 }, // Admission #
            { width: 25 }, // Student Name
            { width: 25 }, // Program
            { width: 25 }, // Campus
            { width: 20 }, // Batch
            { width: 15 }, // Adm. Date
            { width: 15 }  // Status
        ];

        const addMergedHeader = (text, size = 12, isBold = true) => {
            const row = worksheet.addRow([text]);
            worksheet.mergeCells(`A${row.number}:G${row.number}`);
            const cell = row.getCell(1);
            cell.font = { bold: isBold, size: size, color: { argb: 'FF0F172A' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return row;
        };

        addMergedHeader("SGC Education", 16);
        addMergedHeader(campusDetails?.name || orgDetails?.name || 'CAMPUS REPORT', 14);
        addMergedHeader("Admission by Date Report", 12);
        addMergedHeader(`Period: ${filters.start_date} to ${filters.end_date}`, 11, false);
        addMergedHeader(`Generated: ${new Date().toLocaleDateString()}`, 10, false);
        worksheet.addRow([]); // Empty row

        const headerRow = worksheet.addRow(["Admission #", "Student Name", "Program", "Campus", "Batch", "Adm. Date", "Status"]);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        data.forEach(item => {
            const row = worksheet.addRow([
                item.admission_number || '',
                `${item.first_name || ''} ${item.last_name || ''}`.trim(),
                item.program?.name || '',
                item.campus?.name || '',
                item.academic_batch?.name || '',
                item.admission_date || '',
                item.status || ''
            ]);
            row.eachCell((cell, colNumber) => {
                if (colNumber === 1 || colNumber === 6 || colNumber === 7) {
                    cell.alignment = { horizontal: 'center' };
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Admissions_Report_${filters.start_date}_to_${filters.end_date}.xlsx`);
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
                    <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export Excel
                    </Button>
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
                    <div className="flex-none flex gap-2">
                        <Button type="submit" loading={loading} className="px-8 shadow-lg shadow-indigo-200">
                            Filter
                        </Button>
                        <button
                            type="button"
                            onClick={() => setFilters({
                                start_date: '2025-01-01',
                                end_date: new Date().toLocaleDateString('sv-SE')
                            })}
                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200 shadow-sm"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </Card>

            {/* Print Header - Visible only when printing */}
            <div className="hidden print:flex flex-col items-center mb-8 border-b-2 border-slate-900 pb-6 relative">
                <img 
                    src={`${campusDetails?.logo_url || orgDetails?.logo_url || '/assets/images/logo.png'}?v=${new Date().getTime()}`} 
                    alt="Logo" 
                    className="h-24 absolute left-0 top-0 object-contain"
                />
                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">SGC Education</h1>
                <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight mt-1">{campusDetails?.name || orgDetails?.name || 'CAMPUS REPORT'}</h2>
                <p className="text-lg font-bold text-slate-700 mt-4 uppercase tracking-widest bg-slate-100 px-4 py-1 rounded-full">Admission by Date Report</p>
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
                printAll={true}
            />

            {/* Print Footer */}
            <div className="hidden print:flex justify-end mt-12 pt-8 border-t border-slate-200 text-xs font-bold text-slate-400">
                <p>System Generated Report - {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
};

export default AdmissionByDateReport;
