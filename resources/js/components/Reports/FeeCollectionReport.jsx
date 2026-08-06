import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../UI/Button';
import Card from '../UI/Card';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const FeeCollectionReport = () => {
    const { selectedCampus, selectedOrganization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [byMethod, setByMethod] = useState({});
    
    const [campusDetails, setCampusDetails] = useState(null);
    const [orgDetails, setOrgDetails] = useState(null);

    // Default to current month start and end dates
    const getMonthDateRange = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('sv-SE');
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('sv-SE');
        return { start, end };
    };

    const dateRange = getMonthDateRange();
    const [filters, setFilters] = useState({
        start_date: dateRange.start,
        end_date: dateRange.end,
        payment_method: ''
    });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = { 
                ...filters,
                campus_id: selectedCampus 
            };
            const response = await axios.get('/api/reports/fees/collection', { params });
            if (response.data.success) {
                setData(response.data.data.payments || []);
                setTotalAmount(response.data.data.total_amount || 0);
                setByMethod(response.data.data.by_method || {});
            }
        } catch (err) {
            console.error('Failed to fetch collection report:', err);
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
        fetchReport();
    }, [filters.start_date, filters.end_date, filters.payment_method, selectedCampus, selectedOrganization]);

    useEffect(() => {
        fetchDetails();
    }, [selectedCampus, selectedOrganization]);

    const handleApplyFilters = (e) => {
        if (e) e.preventDefault();
        fetchReport();
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = async () => {
        if (!data || data.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Collection');

        worksheet.columns = [
            { width: 15 }, // Receipt #
            { width: 25 }, // Student Name
            { width: 15 }, // Date
            { width: 15 }, // Method
            { width: 20 }, // Reference
            { width: 20 }, // Program
            { width: 20 }, // Deposited By
            { width: 20 }  // Amount
        ];

        const addMergedHeader = (text, size = 12, isBold = true) => {
            const row = worksheet.addRow([text]);
            worksheet.mergeCells(`A${row.number}:H${row.number}`);
            const cell = row.getCell(1);
            cell.font = { bold: isBold, size: size, color: { argb: 'FF0F172A' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return row;
        };

        addMergedHeader("SGC Education", 16);
        addMergedHeader(campusDetails?.name || orgDetails?.name || 'CAMPUS REPORT', 14);
        addMergedHeader("Fee Collection Report", 12);
        addMergedHeader(`Period: ${filters.start_date} to ${filters.end_date}`, 11, false);
        addMergedHeader(`Generated: ${new Date().toLocaleDateString()}`, 10, false);
        worksheet.addRow([]); // Empty row

        const headerRow = worksheet.addRow(["Receipt #", "Student Name", "Date", "Method", "Reference", "Program", "Deposited By", "Amount"]);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        data.forEach(item => {
            const row = worksheet.addRow([
                item.receipt_number || '',
                item.student_name || '',
                item.payment_date || '',
                item.payment_method || '',
                item.transaction_id || '',
                item.program || '',
                item.received_by || '',
                Number(item.amount)
            ]);
            row.getCell(8).numFmt = '"Rs. "#,##0.00';
            row.eachCell((cell, colNumber) => {
                if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 5) {
                    cell.alignment = { horizontal: 'center' };
                }
            });
        });

        // Add Totals
        worksheet.addRow([]);
        const totalRow = worksheet.addRow(["", "", "", "", "", "", "Total Collection", Number(totalAmount)]);
        totalRow.font = { bold: true };
        totalRow.getCell(8).numFmt = '"Rs. "#,##0.00';

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Fee_Collection_Report_${filters.start_date}_to_${filters.end_date}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 print:p-0">
            {/* Header */}
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Fee Collection Report</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium font-sans">Track fee payments collected over a specific period.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                <Card className="p-6 border-indigo-100 bg-indigo-50/30" hover={false}>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Total Collections</span>
                            <h2 className="text-3xl font-black text-indigo-700 mt-1">Rs. {Number(totalAmount).toLocaleString()}</h2>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" /></svg>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-teal-100 bg-teal-50/30" hover={false}>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Bank Deposit / Transfer</span>
                            <h2 className="text-3xl font-black text-teal-700 mt-1">
                                Rs. {Number(
                                    Object.entries(byMethod).reduce((sum, [method, amount]) => {
                                        if (method.toLowerCase().includes('bank')) return sum + Number(amount);
                                        return sum;
                                    }, 0)
                                ).toLocaleString()}
                            </h2>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-fuchsia-100 bg-fuchsia-50/30" hover={false}>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-fuchsia-600 uppercase tracking-widest">Online Received</span>
                            <h2 className="text-3xl font-black text-fuchsia-700 mt-1">
                                Rs. {Number(
                                    Object.entries(byMethod).reduce((sum, [method, amount]) => {
                                        if (method.toLowerCase().includes('online')) return sum + Number(amount);
                                        return sum;
                                    }, 0)
                                ).toLocaleString()}
                            </h2>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-fuchsia-100 flex items-center justify-center text-fuchsia-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-6 no-print border-indigo-50 shadow-indigo-50/50" hover={false}>
                <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">From Date</label>
                        <input
                            type="date"
                            value={filters.start_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50 text-sm font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">To Date</label>
                        <input
                            type="date"
                            value={filters.end_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50 text-sm font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Payment Method</label>
                        <select
                            value={filters.payment_method}
                            onChange={(e) => setFilters(prev => ({ ...prev, payment_method: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50 text-sm font-semibold"
                        >
                            <option value="">All Methods</option>
                            <option value="Bank Transfer">Bank Deposit / Transfer</option>
                            <option value="Online">Online Payment</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" loading={loading} className="flex-1 py-2.5 shadow-lg shadow-indigo-200">
                            Filter
                        </Button>
                        <button
                            type="button"
                            onClick={() => {
                                const range = getMonthDateRange();
                                setFilters({
                                    start_date: range.start,
                                    end_date: range.end,
                                    payment_method: ''
                                });
                            }}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200 shadow-sm"
                        >
                            Reset
                        </button>
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
                <p className="text-lg font-bold text-slate-700 mt-4 uppercase tracking-widest bg-slate-100 px-4 py-1 rounded-full">Fee Collection Report</p>
                <div className="flex justify-center gap-6 mt-4 text-sm font-bold text-slate-500">
                    <span>PERIOD: {filters.start_date} TO {filters.end_date}</span>
                    <span>GENERATED: {new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Data Table */}
            <Card className="overflow-hidden border-slate-200 shadow-sm print:border-none print:shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference / Txn</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deposited By</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Payments...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length > 0 ? (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-black text-slate-900 text-sm">
                                            {item.receipt_number}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-sm">{item.student_name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Roll: {item.roll_number || '—'} | {item.program}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                                            {item.payment_date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                item.payment_method?.toLowerCase().includes('bank') ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                                                item.payment_method?.toLowerCase().includes('online') ? 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200' :
                                                'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                            }`}>
                                                {item.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs italic font-semibold">
                                            {item.transaction_id || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 text-sm font-medium">
                                            {item.received_by}
                                        </td>
                                        <td className="px-6 py-4 text-emerald-600 font-black text-right text-sm">
                                            Rs. {Number(item.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 italic text-sm">No payment collections found matching your filters.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {data.length > 0 && (
                            <tfoot className="bg-slate-50 border-t-2 border-emerald-200">
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">
                                        Total Collection Amount
                                    </td>
                                    <td className="px-6 py-4 text-emerald-700 font-black text-right text-sm">
                                        Rs. {Number(totalAmount).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>

            {/* Print Footer */}
            <div className="hidden print:flex justify-between mt-12 pt-8 border-t border-slate-200 text-xs font-bold text-slate-400">
                <p>System Generated Collection Report</p>
                <p>{new Date().toLocaleString()}</p>
            </div>
        </div>
    );
};

export default FeeCollectionReport;
