import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../UI/DataTable';
import Button from '../UI/Button';
import Card from '../UI/Card';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ExtraExpenseByDateReport = () => {
    const { selectedCampus, selectedOrganization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [campusDetails, setCampusDetails] = useState(null);
    const [orgDetails, setOrgDetails] = useState(null);
    const [filters, setFilters] = useState({
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('sv-SE'),
        end_date: new Date().toLocaleDateString('sv-SE')
    });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = { 
                ...filters,
                campus_id: selectedCampus 
            };
            const response = await axios.get('/api/reports/extra-expense/by-date', { params });
            if (response.data.success) {
                setData(response.data.data.expenses || []);
                setTotal(response.data.data.total || 0);
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

    useEffect(() => {
        fetchReport();
        fetchDetails();
    }, [selectedCampus, selectedOrganization]);

    const handleApplyFilters = (e) => {
        if (e) e.preventDefault();
        fetchReport();
    };

    const columns = [
        "Date",
        "Form No",
        "Category",
        "Recorded By",
        "Status",
        "Amount"
    ];

    const renderRow = (item, index) => (
        <React.Fragment key={item?.id || index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                {new Date(item?.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                {String(item?.title || '—')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {String(item?.category?.name || '—')}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                {String(item?.recorder?.name || '—')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {String(item?.status || '—')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                {Number(item?.amount || 0).toLocaleString()}
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
            { width: 15 }, // Date
            { width: 20 }, // Form No
            { width: 25 }, // Category
            { width: 25 }, // Recorded By
            { width: 20 }, // Status
            { width: 15 }  // Amount
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
        addMergedHeader("Extra Expense Report", 12);
        addMergedHeader(`Period: ${filters.start_date} to ${filters.end_date}`, 11, false);
        addMergedHeader(`Generated: ${new Date().toLocaleDateString()}`, 10, false);
        worksheet.addRow([]); // Empty row

        const headerRow = worksheet.addRow(["Date", "Form No", "Category", "Recorded By", "Status", "Amount"]);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        data.forEach(item => {
            const row = worksheet.addRow([
                new Date(item.expense_date).toLocaleDateString('en-GB'),
                item.title || '',
                item.category?.name || '',
                item.recorder?.name || '',
                item.status || '',
                Number(item.amount || 0)
            ]);
            row.getCell(6).alignment = { horizontal: 'right' };
        });

        // Add empty row before total
        worksheet.addRow([]);
        
        const totalRow = worksheet.addRow(['Total Expense', '', '', '', '', Number(total)]);
        worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);
        const totalLabelCell = totalRow.getCell(1);
        totalLabelCell.font = { bold: true };
        totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
        
        const totalAmountCell = totalRow.getCell(6);
        totalAmountCell.font = { bold: true, color: { argb: 'FF4338CA' } };
        totalAmountCell.alignment = { horizontal: 'right', vertical: 'middle' };

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Extra_Expense_Report_${filters.start_date}_to_${filters.end_date}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 print:p-0">
            {/* Report Header - Screen Only */}
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Extra Expense Report</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">View and filter extra Expenses across a specific period.</p>
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
                    <div className="flex-none">
                        <Button type="submit" loading={loading} className="px-8 shadow-lg shadow-indigo-200">
                            Apply Filters
                        </Button>
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
                <p className="text-lg font-bold text-slate-700 mt-4 uppercase tracking-widest bg-slate-100 px-4 py-1 rounded-full">Extra Expense Report</p>
                <div className="flex justify-center gap-6 mt-4 text-sm font-bold text-slate-500">
                    <span>PERIOD: {filters.start_date} TO {filters.end_date}</span>
                    <span>GENERATED: {new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Report Data */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 print:bg-transparent">
                                {columns.map((col, idx) => (
                                    <th key={idx} className={`py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col === 'Amount' ? 'text-right' : ''}`}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length} className="py-8 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="py-8 text-center text-slate-500">
                                        No extra Expense records found for the selected date range.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {data.map((item, index) => (
                                        <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                                            {renderRow(item, index)}
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 print:bg-transparent border-t-2 border-slate-300">
                                        <td colSpan={columns.length - 1} className="py-4 px-6 text-right font-bold text-slate-900 text-sm uppercase">
                                            Total Expense
                                        </td>
                                        <td className="py-4 px-6 text-right font-black text-indigo-700 text-lg">
                                            Rs. {Number(total).toLocaleString()}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print:flex justify-end mt-12 pt-8 border-t border-slate-200 text-xs font-bold text-slate-400">
                <p>System Generated Report - {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
};

export default ExtraExpenseByDateReport;
