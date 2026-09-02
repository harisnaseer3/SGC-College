import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../UI/Button';
import Card from '../UI/Card';
import Pagination from '../UI/Pagination';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const FeeDefaultersReport = () => {
    const { selectedCampus, selectedOrganization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(() => Number(localStorage.getItem('per_page')) || 25);
    const [totalOverdueSum, setTotalOverdueSum] = useState(0);
    
    const [programs, setPrograms] = useState([]);
    const [batches, setBatches] = useState([]);
    const [campusDetails, setCampusDetails] = useState(null);
    const [orgDetails, setOrgDetails] = useState(null);

    const [filters, setFilters] = useState({
        due_date_before: new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD local
        program_id: '',
        academic_batch_id: '',
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
            const response = await axios.get('/api/reports/fees/defaulters', { params });
            if (response.data.success) {
                setData(response.data.data.defaulters || []);
                setTotalOverdueSum(response.data.data.total_overdue_sum || 0);
                setCurrentPage(1);
            }
        } catch (err) {
            console.error('Failed to fetch defaulters report:', err);
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
            console.error('Failed to fetch details:', err);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [filters.due_date_before, filters.program_id, filters.academic_batch_id, filters.include_struck_off, filters.search, selectedCampus, selectedOrganization]);

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
        const worksheet = workbook.addWorksheet('Defaulters');

        worksheet.columns = [
            { width: 15 }, // Roll #
            { width: 25 }, // Student Name
            { width: 25 }, // Program
            { width: 20 }, // Batch
            { width: 20 }, // Campus
            { width: 20 }  // Overdue Amount
        ];

        const addMergedHeader = (text, size = 12, isBold = true) => {
            const row = worksheet.addRow([text]);
            worksheet.mergeCells(`A${row.number}:F${row.number}`);
            const cell = row.getCell(1);
            cell.font = { bold: isBold, size: size, color: { argb: 'FF0F172A' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return row;
        };

        addMergedHeader("SGC Education", 16);
        addMergedHeader(campusDetails?.name || orgDetails?.name || 'CAMPUS REPORT', 14);
        addMergedHeader("Fee Defaulters Report", 12);
        addMergedHeader(`Due Date Before: ${filters.due_date_before}`, 11, false);
        addMergedHeader(`Generated: ${new Date().toLocaleDateString()}`, 10, false);
        worksheet.addRow([]); // Empty row

        const headerRow = worksheet.addRow(["Roll #", "Student Name", "Program", "Batch", "Campus", "Overdue Amount"]);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        data.forEach(item => {
            const row = worksheet.addRow([
                item.roll_number || '',
                `${item.first_name || ''} ${item.last_name || ''}`.trim(),
                item.program || '',
                item.batch || '',
                item.campus || '',
                Number(item.total_overdue)
            ]);
            row.getCell(6).numFmt = '"Rs. "#,##0.00';
            row.eachCell((cell, colNumber) => {
                if (colNumber === 1 || colNumber === 4 || colNumber === 5) {
                    cell.alignment = { horizontal: 'center' };
                }
            });
        });

        // Add Total Row
        worksheet.addRow([]);
        const totalRow = worksheet.addRow(["", "", "", "", "Total Overdue", Number(totalOverdueSum)]);
        totalRow.font = { bold: true };
        totalRow.getCell(6).numFmt = '"Rs. "#,##0.00';

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Fee_Defaulters_Report_${filters.due_date_before}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 print:p-0">
            {/* Header */}
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Fee Defaulters Report</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium font-sans">
                        Track students with overdue fee balances whose payment due date has passed.
                    </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                <Card className="p-6 border-rose-100 bg-rose-50/30" hover={false}>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Total Defaulter Students</span>
                            <h2 className="text-3xl font-black text-rose-700 mt-1">{data.length} Students</h2>
                            <p className="text-[11px] font-semibold text-rose-500 mt-1">Students with fees past due date</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-amber-100 bg-amber-50/30" hover={false}>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Total Overdue Outstanding</span>
                            <h2 className="text-3xl font-black text-amber-700 mt-1">Rs. {Number(totalOverdueSum).toLocaleString()}</h2>
                            <p className="text-[11px] font-semibold text-amber-600 mt-1">Total amount past assigned due date</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" /></svg>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-6 no-print border-indigo-50 shadow-indigo-50/50" hover={false}>
                <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-2 lg:col-span-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Search Student</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name, roll number, or admission number…"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50 text-sm font-semibold"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Due Date Before</label>
                        <input
                            type="date"
                            value={filters.due_date_before}
                            onChange={(e) => setFilters(prev => ({ ...prev, due_date_before: e.target.value }))}
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
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={filters.include_struck_off}
                                    onChange={(e) => setFilters(prev => ({ ...prev, include_struck_off: e.target.checked }))}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                    filters.include_struck_off
                                        ? 'bg-rose-500 border-rose-500'
                                        : 'bg-white border-slate-300 group-hover:border-rose-400'
                                }`}>
                                    {filters.include_struck_off && (
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-600">Include Struck Off Students</span>
                        </label>
                        <div className="flex gap-2">
                            <Button type="submit" loading={loading} className="flex-1 py-2.5 shadow-lg shadow-indigo-200">
                                Filter
                            </Button>
                            <button
                                type="button"
                                onClick={() => setFilters({
                                    due_date_before: new Date().toLocaleDateString('sv-SE'),
                                    program_id: '',
                                    academic_batch_id: '',
                                    include_struck_off: false,
                                    search: ''
                                })}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200 shadow-sm"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </form>
            </Card>

            {/* Print Header */}
            <div className="hidden print:flex flex-col items-center mb-8 border-b-2 border-slate-900 pb-6 relative">
                <img 
                    src={`${campusDetails?.logo_url || orgDetails?.logo_url || '/assets/images/logo.png'}?v=${new Date().getTime()}`} 
                    alt="Logo" 
                    className="h-24 absolute left-0 top-0 object-contain"
                />
                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">SGC Education</h1>
                <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight mt-1">{campusDetails?.name || orgDetails?.name || 'CAMPUS REPORT'}</h2>
                <p className="text-lg font-bold text-slate-700 mt-4 uppercase tracking-widest bg-slate-100 px-4 py-1 rounded-full">Fee Defaulters Report</p>
                <div className="flex justify-center gap-6 mt-4 text-sm font-bold text-slate-500">
                    <span>DUE DATE BEFORE: {filters.due_date_before}</span>
                    <span>GENERATED: {new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Data Table */}
            <Card className="overflow-hidden border-slate-200 shadow-sm print:border-none print:shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll # / Adm #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program / Batch</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campus</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Overdue Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center no-print">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Defaulters...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length > 0 ? (
                                data.slice((currentPage - 1) * perPage, currentPage * perPage).map((item) => (
                                    <React.Fragment key={item.id}>
                                        <tr className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm">{item.roll_number || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Adm: {item.admission_number || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                                                {item.first_name} {item.last_name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-700">{item.program}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{item.batch}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                                                {item.campus}
                                            </td>
                                            <td className="px-6 py-4 text-rose-600 font-black text-right text-sm">
                                                Rs. {Number(item.total_overdue).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <button
                                                    onClick={() => toggleRow(item.id)}
                                                    className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 text-xs font-bold rounded-lg transition-all"
                                                >
                                                    {expandedRows[item.id] ? 'Hide Breakdown' : 'Show Breakdown'}
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Sub-table for fee breakdown */}
                                        {(expandedRows[item.id] || window.matchMedia('print').matches) && (
                                            <tr className="bg-slate-50/40 print:bg-transparent">
                                                <td colSpan="6" className="px-8 py-4">
                                                    <div className="border border-slate-100 rounded-xl bg-white p-4 shadow-inner print:border-slate-300 print:shadow-none">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Outstanding Fee Head Breakdown</h4>
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                                                                    <th className="py-2">Fee Head</th>
                                                                    <th className="py-2">Due Date</th>
                                                                    <th className="py-2 text-right">Total Amount</th>
                                                                    <th className="py-2 text-right">Paid</th>
                                                                    <th className="py-2 text-right">Balance Due</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                 {item.fees.map((fee, idx) => (
                                                                    <tr key={idx} className="text-slate-600">
                                                                        <td className="py-2 font-semibold text-slate-800">{fee.fee_head}</td>
                                                                        <td className="py-2">{fee.due_date}</td>
                                                                        <td className="py-2 text-right">Rs. {fee.amount.toLocaleString()}</td>
                                                                        <td className="py-2 text-right text-fuchsia-600 font-bold">Rs. {fee.paid_amount.toLocaleString()}</td>
                                                                        <td className="py-2 text-right font-bold text-rose-600">Rs. {fee.balance_amount.toLocaleString()}</td>
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
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 italic text-sm">No defaulters found matching your filters.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {data.length > 0 && (
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">
                                        Total Outstanding
                                    </td>
                                    <td className="px-6 py-4 text-rose-700 font-black text-right text-sm">
                                        Rs. {Number(totalOverdueSum).toLocaleString()}
                                    </td>
                                    <td className="no-print"></td>
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

            {/* Print Footer */}
            <div className="hidden print:flex justify-between mt-12 pt-8 border-t border-slate-200 text-xs font-bold text-slate-400">
                <p>System Generated Defaulter Report</p>
                <p>{new Date().toLocaleString()}</p>
            </div>
        </div>
    );
};

export default FeeDefaultersReport;
