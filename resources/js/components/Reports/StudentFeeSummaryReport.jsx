import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../UI/Button';
import Card from '../UI/Card';
import Pagination from '../UI/Pagination';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const StudentFeeSummaryReport = () => {
    const { selectedCampus, selectedOrganization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(() => Number(localStorage.getItem('per_page')) || 25);
    const [summary, setSummary] = useState({
        total_students: 0,
        grand_total_fee: 0,
        grand_discount_fee: 0,
        grand_paid_fee: 0,
        grand_remaining_fee: 0
    });
    
    const [programs, setPrograms] = useState([]);
    const [batches, setBatches] = useState([]);
    const [campusDetails, setCampusDetails] = useState(null);
    const [orgDetails, setOrgDetails] = useState(null);

    const [filters, setFilters] = useState({
        program_id: '',
        academic_batch_id: '',
        status: 'all',
        include_struck_off: false,
        search: ''
    });

    const [expandedRows, setExpandedRows] = useState({});

    const fetchMetadata = async () => {
        try {
            const [pRes, bRes] = await Promise.all([
                axios.get('/api/programs?all=1'),
                axios.get('/api/academic-batches?all=1')
            ]);
            setPrograms(pRes.data.data || []);
            setBatches(bRes.data.data || []);
        } catch (err) {
            console.error('Failed to fetch metadata:', err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = { 
                ...filters,
                campus_id: selectedCampus 
            };
            const response = await axios.get('/api/reports/fees/student-summary', { params });
            if (response.data.success) {
                setData(response.data.data.students || []);
                setSummary(response.data.data.summary || {
                    total_students: 0,
                    grand_total_fee: 0,
                    grand_discount_fee: 0,
                    grand_paid_fee: 0,
                    grand_remaining_fee: 0
                });
                setCurrentPage(1);
            }
        } catch (err) {
            console.error('Failed to fetch student fee summary report:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetails = async () => {
        try {
            const orgId = localStorage.getItem('selected_org_id');
            if (!orgId) return;

            const orgRes = await axios.get(`/api/organizations/${orgId}`);
            if (orgRes.data.success) {
                setOrgDetails(orgRes.data.data);
            }

            if (selectedCampus) {
                const response = await axios.get(`/api/organizations/${orgId}/campuses`);
                const campuses = response.data.data?.data || response.data.data || [];
                const active = campuses.find(c => String(c.id) === String(selectedCampus));
                setCampusDetails(active || null);
            } else {
                setCampusDetails(null);
            }
        } catch (err) {
            console.error('Failed to fetch institution details:', err);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [filters.program_id, filters.academic_batch_id, filters.status, filters.include_struck_off, selectedCampus, selectedOrganization]);

    const debounceTimer = useRef(null);
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchReport();
        }, 400);
        return () => clearTimeout(debounceTimer.current);
    }, [filters.search]);

    useEffect(() => {
        fetchDetails();
    }, [selectedCampus, selectedOrganization]);

    const handleApplyFilters = (e) => {
        if (e) e.preventDefault();
        fetchReport();
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = async () => {
        if (!data || data.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fee Summary');

        worksheet.columns = [
            { width: 15 }, // Roll #
            { width: 15 }, // Adm #
            { width: 25 }, // Student Name
            { width: 25 }, // Father Name
            { width: 25 }, // Program
            { width: 20 }, // Batch
            { width: 20 }, // Total Net Fee
            { width: 20 }, // Discount
            { width: 20 }, // Paid Fee
            { width: 20 }, // Remaining Fee
            { width: 15 }  // Status
        ];

        const addMergedHeader = (text, size = 12, isBold = true) => {
            const row = worksheet.addRow([text]);
            worksheet.mergeCells(`A${row.number}:K${row.number}`);
            const cell = row.getCell(1);
            cell.font = { bold: isBold, size: size, color: { argb: 'FF0F172A' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return row;
        };

        addMergedHeader("SGC Education", 16);
        addMergedHeader(campusDetails?.name || orgDetails?.name || 'CAMPUS REPORT', 14);
        addMergedHeader("Student Fee Summary Report", 12);
        addMergedHeader(`Generated: ${new Date().toLocaleDateString()}`, 10, false);
        worksheet.addRow([]); // Empty row

        const headerRow = worksheet.addRow([
            "Roll #", 
            "Adm #", 
            "Student Name", 
            "Father Name", 
            "Program", 
            "Batch", 
            "Total Net Fee", 
            "Discount",
            "Paid Fee", 
            "Remaining Dues",
            "Status"
        ]);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        data.forEach(item => {
            const row = worksheet.addRow([
                item.roll_number || '',
                item.admission_number || '',
                `${item.first_name || ''} ${item.last_name || ''}${item.student_status && item.student_status.toLowerCase().includes('struck') ? ' (Struck Off)' : ''}`.trim(),
                item.guardian_name || '',
                item.program || '',
                item.batch || '',
                Number(item.total_fee),
                Number(item.discount_fee || 0),
                Number(item.paid_fee),
                Number(item.remaining_fee),
                item.status.toUpperCase()
            ]);

            row.getCell(7).numFmt = '"Rs. "#,##0.00';
            row.getCell(8).numFmt = '"Rs. "#,##0.00';
            row.getCell(9).numFmt = '"Rs. "#,##0.00';
            row.getCell(10).numFmt = '"Rs. "#,##0.00';

            row.eachCell((cell, colNumber) => {
                if ([1, 2, 6, 11].includes(colNumber)) {
                    cell.alignment = { horizontal: 'center' };
                }
            });
        });

        // Add Total Row
        worksheet.addRow([]);
        const totalRow = worksheet.addRow([
            "", "", "", "", "", "GRAND TOTAL", 
            Number(summary.grand_total_fee), 
            Number(summary.grand_discount_fee || 0),
            Number(summary.grand_paid_fee), 
            Number(summary.grand_remaining_fee),
            ""
        ]);
        totalRow.font = { bold: true };
        totalRow.getCell(7).numFmt = '"Rs. "#,##0.00';
        totalRow.getCell(8).numFmt = '"Rs. "#,##0.00';
        totalRow.getCell(9).numFmt = '"Rs. "#,##0.00';
        totalRow.getCell(10).numFmt = '"Rs. "#,##0.00';

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Student_Fee_Summary_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 print:p-0">
            {/* Header */}
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Fee Summary Report</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Comprehensive report displaying Net Fee, Discounts, Paid Fee, and Remaining Dues per student.</p>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 no-print">
                <Card className="p-5 border-slate-100 bg-white" hover={false}>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Students</span>
                    <h2 className="text-2xl font-black text-slate-800">{summary.total_students}</h2>
                    <p className="text-xs text-slate-400 mt-1">Matching current filters</p>
                </Card>

                <Card className="p-5 border-indigo-100 bg-indigo-50/20" hover={false}>
                    <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">Total Net Fee</span>
                    <h2 className="text-2xl font-black text-indigo-700">Rs. {Number(summary.grand_total_fee).toLocaleString()}</h2>
                    <p className="text-xs text-indigo-400 mt-1">Net fee commitment</p>
                </Card>

                <Card className="p-5 border-amber-100 bg-amber-50/20" hover={false}>
                    <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-1">Total Discount</span>
                    <h2 className="text-2xl font-black text-amber-700">Rs. {Number(summary.grand_discount_fee || 0).toLocaleString()}</h2>
                    <p className="text-xs text-amber-500 mt-1">Concessions granted</p>
                </Card>

                <Card className="p-5 border-fuchsia-100 bg-fuchsia-50/20" hover={false}>
                    <span className="text-[11px] font-bold text-fuchsia-500 uppercase tracking-wider block mb-1">Total Paid Fee</span>
                    <h2 className="text-2xl font-black text-fuchsia-700">Rs. {Number(summary.grand_paid_fee).toLocaleString()}</h2>
                    <p className="text-xs text-fuchsia-500 mt-1">Collected revenue</p>
                </Card>

                <Card className="p-5 border-rose-100 bg-rose-50/20" hover={false}>
                    <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block mb-1">Remaining Dues</span>
                    <h2 className="text-2xl font-black text-rose-700">Rs. {Number(summary.grand_remaining_fee).toLocaleString()}</h2>
                    <p className="text-xs text-rose-400 mt-1">Outstanding balance</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-6 no-print border-indigo-50 shadow-indigo-50/50" hover={false}>
                <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Search Student</label>
                        <input
                            type="text"
                            placeholder="Name, Roll #, Adm #..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50 text-sm font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Program</label>
                        <select
                            value={filters.program_id}
                            onChange={(e) => setFilters(prev => ({ ...prev, program_id: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50 text-sm font-semibold"
                        >
                            <option value="">All Programs</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Academic Batch</label>
                        <select
                            value={filters.academic_batch_id}
                            onChange={(e) => setFilters(prev => ({ ...prev, academic_batch_id: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50 text-sm font-semibold"
                        >
                            <option value="">All Batches</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Fee Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50 text-sm font-semibold"
                        >
                            <option value="all">All Students</option>
                            <option value="defaulter">Defaulters / Remaining Dues</option>
                            <option value="paid">Fully Paid</option>
                            <option value="partial">Partially Paid</option>
                        </select>
                    </div>
                    <div>
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900 select-none bg-slate-50/80 px-4 py-2.5 rounded-xl border border-slate-200 w-full transition-all hover:bg-slate-100/50 h-[42px]">
                            <input
                                type="checkbox"
                                checked={filters.include_struck_off || false}
                                onChange={(e) => setFilters(prev => ({ ...prev, include_struck_off: e.target.checked }))}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Include Struck Off</span>
                        </label>
                    </div>
                </form>
            </Card>

            {/* Printable Header */}
            <div className="hidden print:flex flex-col items-center mb-8 border-b-2 border-slate-900 pb-6 relative">
                <img 
                    src={`${campusDetails?.logo_url || orgDetails?.logo_url || '/assets/images/logo.png'}?v=${new Date().getTime()}`} 
                    alt="Logo" 
                    className="h-20 absolute left-0 top-0 object-contain"
                />
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">SGC Education</h1>
                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight mt-0.5">{campusDetails?.name || orgDetails?.name || 'CAMPUS REPORT'}</h2>
                <p className="text-base font-bold text-slate-700 mt-3 uppercase tracking-widest bg-slate-100 px-4 py-1 rounded-full">Student Fee Summary Report</p>
                <div className="flex justify-center gap-6 mt-3 text-xs font-bold text-slate-500">
                    <span>GENERATED: {new Date().toLocaleDateString()}</span>
                    <span>TOTAL STUDENTS: {summary.total_students}</span>
                </div>
            </div>

            {/* Data Table */}
            <Card className="overflow-hidden border-slate-200 shadow-sm print:border-none print:shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll # / Adm #</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Info</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program / Batch</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Net Fee</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-amber-500 uppercase tracking-widest text-right">Discount</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Paid Fee</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Remaining Dues</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Fee Summaries...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length > 0 ? (
                                data.slice((currentPage - 1) * perPage, currentPage * perPage).map((item) => (
                                    <React.Fragment key={item.id}>
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-900 text-sm">{item.roll_number || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Adm: {item.admission_number || '—'}</div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                    <span>{item.first_name} {item.last_name}</span>
                                                    {item.student_status && item.student_status.toLowerCase().includes('struck') && (
                                                        <span className="px-2 py-0.5 text-[9px] font-black rounded bg-rose-100 text-rose-800 uppercase tracking-wider">
                                                            Struck Off
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">Father: {item.guardian_name || '—'}</div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="text-sm font-semibold text-slate-800">{item.program}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{item.batch} • {item.class_semester}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-indigo-700 text-sm">
                                                Rs. {Number(item.total_fee).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-amber-600 text-sm">
                                                Rs. {Number(item.discount_fee || 0).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-fuchsia-600 text-sm">
                                                Rs. {Number(item.paid_fee).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-rose-600 text-sm">
                                                Rs. {Number(item.remaining_fee).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                {item.status === 'paid' && (
                                                    <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-fuchsia-100 text-fuchsia-800 uppercase tracking-wider">
                                                        Paid
                                                    </span>
                                                )}
                                                {item.status === 'partial' && (
                                                    <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                                                        Partial
                                                    </span>
                                                )}
                                                {item.status === 'unpaid' && (
                                                    <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-rose-100 text-rose-800 uppercase tracking-wider">
                                                        Defaulter
                                                    </span>
                                                )}
                                                {item.status === 'no_fees' && (
                                                    <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                                                        No Fees
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-center no-print">
                                                <button
                                                    onClick={() => toggleRow(item.id)}
                                                    className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-xs font-bold rounded-lg transition-all"
                                                >
                                                    {expandedRows[item.id] ? 'Hide Breakdown' : 'Show Breakdown'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Sub-table for fee head breakdown */}
                                        {(expandedRows[item.id] || window.matchMedia('print').matches) && item.fees && item.fees.length > 0 && (
                                            <tr className="bg-slate-50/40 print:bg-transparent">
                                                <td colSpan="9" className="px-8 py-3">
                                                    <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm print:border-slate-300 print:shadow-none">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Assigned Fee Head Breakdown</h4>
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                                                                    <th className="py-1.5">Fee Head</th>
                                                                    <th className="py-1.5">Due Date</th>
                                                                    <th className="py-1.5 text-right">Net Amount</th>
                                                                    <th className="py-1.5 text-right text-amber-500">Discount</th>
                                                                    <th className="py-1.5 text-right">Paid Amount</th>
                                                                    <th className="py-1.5 text-right">Remaining Dues</th>
                                                                    <th className="py-1.5 text-center">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {item.fees.map((fee, idx) => (
                                                                    <tr key={idx} className="text-slate-600">
                                                                        <td className="py-1.5 font-semibold text-slate-800">{fee.fee_head}</td>
                                                                        <td className="py-1.5">{fee.due_date}</td>
                                                                        <td className="py-1.5 text-right font-bold text-slate-800">Rs. {fee.amount.toLocaleString()}</td>
                                                                        <td className="py-1.5 text-right text-amber-600 font-semibold">Rs. {(fee.discount_amount || 0).toLocaleString()}</td>
                                                                        <td className="py-1.5 text-right text-fuchsia-600 font-bold">Rs. {fee.paid_amount.toLocaleString()}</td>
                                                                        <td className="py-1.5 text-right font-bold text-rose-600">Rs. {fee.balance_amount.toLocaleString()}</td>
                                                                        <td className="py-1.5 text-center">
                                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                                                                fee.status === 'paid' ? 'bg-fuchsia-50 text-fuchsia-700' :
                                                                                fee.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                                                            }`}>
                                                                                {fee.status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 italic text-sm">No student fee records found matching your filters.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {data.length > 0 && (
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan="3" className="px-5 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">
                                        Grand Totals ({summary.total_students} Students)
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-indigo-700 text-sm">
                                        Rs. {Number(summary.grand_total_fee).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-amber-700 text-sm">
                                        Rs. {Number(summary.grand_discount_fee || 0).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-fuchsia-700 text-sm">
                                        Rs. {Number(summary.grand_paid_fee).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-rose-700 text-sm">
                                        Rs. {Number(summary.grand_remaining_fee).toLocaleString()}
                                    </td>
                                    <td colSpan="2" className="no-print"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {data.length > 0 && (
                    <div className="no-print">
                        <Pagination 
                            currentPage={currentPage}
                            totalItems={data.length}
                            itemsPerPage={perPage}
                            onPageChange={(page) => setCurrentPage(page)}
                            onPerPageChange={(newPerPage) => {
                                setPerPage(newPerPage);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                )}
            </Card>

            {/* Printable Footer */}
            <div className="hidden print:flex justify-between mt-12 pt-8 border-t border-slate-200 text-xs font-bold text-slate-400">
                <p>System Generated Student Fee Summary Report</p>
                <p>{new Date().toLocaleString()}</p>
            </div>
        </div>
    );
};

export default StudentFeeSummaryReport;
