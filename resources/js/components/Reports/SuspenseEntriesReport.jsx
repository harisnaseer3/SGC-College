import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../UI/Card';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const SuspenseEntriesReport = () => {
    const { user, selectedOrganization, selectedCampus } = useAuth();
    const { showError } = useNotifications();
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState([]);
    
    // Filters
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        campus_bank_account_id: '',
        status: ''
    });

    const [bankAccounts, setBankAccounts] = useState([]);

    useEffect(() => {
        fetchBankAccounts();
        // Load initial data
        fetchReportData();
    }, [selectedCampus]); // Refetch if campus changes

    const fetchBankAccounts = async () => {
        try {
            let res;
            if (user?.roles?.some(r => r.name === 'super_admin')) {
                res = await axios.get('/api/campuses');
            } else if (selectedOrganization) {
                res = await axios.get(`/api/organizations/${selectedOrganization}/campuses`);
            } else {
                res = await axios.get('/api/campuses');
            }
            if (res && res.data && res.data.data) {
                let banks = [];
                const campusesData = res.data.data.data || res.data.data;
                campusesData.forEach(campus => {
                    if (selectedCampus && campus.id.toString() !== selectedCampus.toString()) return;
                    if (campus.bank_accounts) {
                        banks.push(...campus.bank_accounts.map(ba => ({...ba, campus_name: campus.name})));
                    }
                });
                setBankAccounts(banks);
            }
        } catch(e) {
            console.error('Error fetching bank accounts:', e);
        }
    };

    const fetchReportData = async (exportMode = false) => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);
            if (filters.campus_bank_account_id) params.append('campus_bank_account_id', filters.campus_bank_account_id);
            if (filters.status) params.append('status', filters.status);
            params.append('export', '1'); // Get all up to 1000 for report so we don't paginate the print view heavily
            
            const res = await axios.get(`/api/suspense-entries?${params.toString()}`);
            setEntries(res.data.data.data || res.data.data || res.data || []);
            
            if (exportMode) {
                setTimeout(() => window.print(), 500);
            }
        } catch (error) {
            showError('Failed to load report data.');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = (e) => {
        e.preventDefault();
        fetchReportData();
    };

    const handleReset = () => {
        setFilters({ start_date: '', end_date: '', campus_bank_account_id: '', status: '' });
        // After state update, we should fetch (but useState is async, so we manually clear fetch params)
        setLoading(true);
        axios.get(`/api/suspense-entries?export=1`).then(res => {
            setEntries(res.data.data.data || res.data.data || res.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    const handleExportExcel = async () => {
        if (!entries || entries.length === 0) {
            showError("No data to export.");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Suspense Entries');

        worksheet.columns = [
            { width: 15 }, // Deposit Date
            { width: 30 }, // Bank Account
            { width: 25 }, // Reference
            { width: 35 }, // Notes
            { width: 15 }, // Status
            { width: 25 }, // Matched Student
            { width: 20 }  // Amount
        ];

        const addMergedHeader = (text, size = 12, isBold = true) => {
            const row = worksheet.addRow([text]);
            worksheet.mergeCells(`A${row.number}:G${row.number}`);
            const cell = row.getCell(1);
            cell.font = { bold: isBold, size: size, color: { argb: 'FF0F172A' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return row;
        };

        const bankName = filters.campus_bank_account_id ? bankAccounts.find(b => b.id.toString() === filters.campus_bank_account_id)?.bank_name : 'All Banks';

        addMergedHeader("SGC Education", 16);
        addMergedHeader("Suspense Entries Detailed Report", 14);
        addMergedHeader(`Bank: ${bankName}`, 12, false);
        if (filters.start_date || filters.end_date) {
            addMergedHeader(`Period: ${filters.start_date || 'Start'} to ${filters.end_date || 'End'}`, 11, false);
        }
        addMergedHeader(`Generated: ${new Date().toLocaleDateString()}`, 10, false);
        worksheet.addRow([]); // Empty row

        const headerRow = worksheet.addRow(["Deposit Date", "Bank Account", "Reference", "Notes", "Status", "Matched Student", "Amount"]);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        entries.forEach(entry => {
            const bank = `${entry.campus_bank_account?.bank_name || ''} - ${entry.campus_bank_account?.account_number || ''}`;
            const matched = entry.fee_payment?.student ? `${entry.fee_payment.student.first_name || ''} ${entry.fee_payment.student.last_name || ''} (${entry.fee_payment.student.roll_number || ''})` : 'N/A';
            
            const row = worksheet.addRow([
                entry.deposit_date || '',
                bank,
                entry.reference_number || '',
                entry.notes || '',
                entry.status || '',
                matched,
                Number(entry.amount || 0)
            ]);
            row.getCell(7).numFmt = '"Rs. "#,##0.00';
            row.eachCell((cell, colNumber) => {
                if (colNumber === 1 || colNumber === 5) {
                    cell.alignment = { horizontal: 'center' };
                }
            });
        });

        // Add Totals
        worksheet.addRow([]);
        const totalRow = worksheet.addRow(["", "", "", "", "", "Grand Total", Number(totalAmount)]);
        totalRow.font = { bold: true };
        totalRow.getCell(7).numFmt = '"Rs. "#,##0.00';

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Suspense_Entries_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Calculations
    const totalAmount = entries.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <div className="space-y-6 print:m-0 print:p-0">
            <div className="flex justify-between items-center print:hidden">
                <h2 className="text-xl font-bold text-slate-800">Suspense Entries Report</h2>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg flex items-center gap-2 transition-colors border border-emerald-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export Excel
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center gap-2 transition-colors border border-indigo-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print Report
                    </button>
                </div>
            </div>

            {/* Hidden specific print header */}
            <div className="hidden print:block mb-8 text-center border-b pb-4 border-slate-300">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">CollegeSGC</h1>
                <h2 className="text-xl font-semibold text-slate-700 mt-1">Suspense Entries Detailed Report</h2>
                <div className="text-sm font-medium text-slate-500 mt-2 flex justify-center gap-4">
                    <span>Generated For: {filters.campus_bank_account_id ? bankAccounts.find(b => b.id.toString() === filters.campus_bank_account_id)?.bank_name || 'Selected Bank' : 'All Banks'}</span>
                    {(filters.start_date || filters.end_date) && (
                        <span>
                            Date Range: {filters.start_date || 'Start'} to {filters.end_date || 'End'}
                        </span>
                    )}
                </div>
            </div>

            <Card className="print:hidden bg-slate-50 border-slate-200 shadow-none">
                <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Start Date</label>
                        <input 
                            type="date" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={filters.start_date}
                            onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">End Date</label>
                        <input 
                            type="date" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={filters.end_date}
                            onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Bank Account</label>
                        <select 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={filters.campus_bank_account_id}
                            onChange={(e) => setFilters({...filters, campus_bank_account_id: e.target.value})}
                        >
                            <option value="">All Banks</option>
                            {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Status</label>
                        <select 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={filters.status}
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending (Unallocated)</option>
                            <option value="RECONCILED">Reconciled</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm">
                            Filter
                        </button>
                        <button type="button" onClick={handleReset} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-sm">
                            Reset
                        </button>
                    </div>
                </form>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Total Entries</div>
                        <div className="text-2xl font-black text-indigo-700">{entries.length}</div>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Total Value</div>
                        <div className="text-2xl font-black text-rose-700">Rs. {totalAmount.toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V5m0 14v-3" /></svg>
                    </div>
                </div>
            </div>

            <Card className="print:shadow-none print:border-none print:p-0">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500 animate-pulse">Loading Report Data...</div>
                    ) : (
                        <table className="w-full whitespace-nowrap text-left text-sm print:text-xs">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider print:bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Deposit Date</th>
                                    <th className="px-4 py-3">Bank Account</th>
                                    <th className="px-4 py-3">Reference / Notes</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entries.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-slate-400 font-medium">No records match the current filters.</td>
                                    </tr>
                                )}
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-50 print:break-inside-avoid">
                                        <td className="px-4 py-3 font-semibold text-slate-700">{entry.deposit_date}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {entry.campus_bank_account?.bank_name} - {entry.campus_bank_account?.account_number}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-800 font-medium">{entry.reference_number || 'N/A'}</div>
                                            {entry.notes && <div className="text-xs text-slate-500 truncate max-w-[200px] print:max-w-none">{entry.notes}</div>}
                                            {entry.status === 'RECONCILED' && entry.fee_payment && (
                                                <div className="text-[10px] font-bold text-emerald-600 mt-1">
                                                    Matched: {entry.fee_payment.student?.first_name} {entry.fee_payment.student?.last_name} ({entry.fee_payment.student?.roll_number})
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md print:bg-transparent print:p-0 ${entry.status === 'PENDING' ? 'bg-amber-100 text-amber-700 print:text-amber-700' : 'bg-emerald-100 text-emerald-700 print:text-emerald-700'}`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-rose-600">
                                            {Number(entry.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {entries.length > 0 && (
                                <tfoot className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                                    <tr>
                                        <td colSpan="4" className="px-4 py-4 text-right uppercase tracking-wider text-xs text-slate-500">Grand Total</td>
                                        <td className="px-4 py-4 text-right text-lg text-rose-700">Rs. {totalAmount.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default SuspenseEntriesReport;
