import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../UI/DataTable';
import Card from '../UI/Card';

const RecycleBin = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [module, setModule] = useState('all');
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
    const [actionLoading, setActionLoading] = useState(false);
    
    // Comprehensive map of all soft-deletable modules globally supported
    const [modules] = useState([
        { value: 'all', label: 'All Modules' },
        { value: 'students', label: 'Students' },
        { value: 'users', label: 'Users' },
        { value: 'campuses', label: 'Campuses' },
        { value: 'organizations', label: 'Organizations' },
        { value: 'programs', label: 'Programs' },
        { value: 'program_semesters', label: 'Program Semesters' },
        { value: 'courses', label: 'Courses' },
        { value: 'academic_batches', label: 'Academic Batches' },
        { value: 'academic_classes', label: 'Academic Classes' },
        { value: 'sections', label: 'Sections' },
        { value: 'fee_heads', label: 'Fee Heads' },
        { value: 'fee_structures', label: 'Fee Structures' },
        { value: 'fee_structure_items', label: 'Fee Structure Items' },
        { value: 'fee_fine_policies', label: 'Fee Fine Policies' },
        { value: 'student_fees', label: 'Student Fees (Billing)' },
        { value: 'generated_vouchers', label: 'Generated Vouchers' },
        { value: 'fee_payments', label: 'Fee Payments (Receipts)' },
        { value: 'suspense_entries', label: 'Suspense Entries' },
        { value: 'income_categories', label: 'Income Categories' },
        { value: 'extra_incomes', label: 'Extra Income' },
        { value: 'expense_categories', label: 'Expense Categories' },
        { value: 'expenses', label: 'Expenses' },
        { value: 'campus_bank_accounts', label: 'Campus Bank Accounts' },
    ]);

    // Ensure state refreshes immediately upon switching
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchRecords(1);
        }, 300);
        return () => clearTimeout(timeout);
    }, [module, search]);

    const fetchRecords = async (page = 1) => {
        setLoading(true);
        try {
            const perPage = Number(localStorage.getItem('per_page')) || 10;
            const res = await axios.get('/api/recycle-bin', {
                params: { module, page, search, per_page: perPage }
            });
            setRecords(res.data.data.data);
            setPagination({
                current_page: res.data.data.current_page,
                last_page: res.data.data.last_page,
                total: res.data.data.total,
                per_page: res.data.data.per_page
            });
        } catch (error) {
            console.error('Error fetching recycle bin:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (recordId, recordModule) => {
        if (!window.confirm('Are you sure you want to restore this record?')) return;
        
        setActionLoading(true);
        try {
            await axios.post('/api/recycle-bin/restore', { module: recordModule, id: recordId });
            fetchRecords(pagination.current_page);
        } catch (error) {
            console.error('Restore failed:', error);
            alert(error.response?.data?.message || 'Restore failed.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleForceDelete = async (recordId, recordModule) => {
        const pin = window.prompt('WARNING: This will permanently delete the record. Enter Security PIN (42747) to proceed:');
        if (pin !== '42747') {
            if (pin !== null) alert('Invalid PIN.');
            return;
        }

        setActionLoading(true);
        try {
            await axios.delete('/api/recycle-bin/force-delete', { 
                data: { module: recordModule, id: recordId, pin }
            });
            fetchRecords(pagination.current_page);
        } catch (error) {
            console.error('Force delete failed:', error);
            alert(error.response?.data?.message || 'Permanent delete failed.');
        } finally {
            setActionLoading(false);
        }
    };

    const getColumns = () => {
        return ['ID', 'Reference / Details', 'Deleted At', { name: 'Actions', align: 'right' }];
    };

    const renderRow = (record) => {
        // Fallback generic mapping for 22 different data formats to keep the table clean
        const possibleKeys = ['name', 'title', 'description', 'reference_number', 'voucher_number'];
        let title = '';
        const recMod = record.module_name || 'unknown';
        
        if (recMod === 'students' || recMod === 'users') {
            title = `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.name || '';
        } else {
            for (let k of possibleKeys) {
                if (record[k]) {
                    title = record[k];
                    break;
                }
            }
        }
        
        if (!title && record.amount) title = `Amount: ${record.amount}`;
        if (!title) title = `System Record`;

        const subTitle = record.email || record.admission_number || record.status || '';

        return (
            <>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.id}</td>
                <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 capitalize">{title}</div>
                    <div className="flex gap-2 items-center mt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                            {recMod.replace('_', ' ')}
                        </span>
                        {subTitle && <span className="text-xs text-slate-500">{subTitle}</span>}
                    </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                    {new Date(record.deleted_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => handleRestore(record.id, recMod)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 font-semibold text-xs rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                            Restore
                        </button>
                        <button
                            onClick={() => handleForceDelete(record.id, recMod)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 font-semibold text-xs rounded-lg hover:bg-rose-100 transition-colors"
                        >
                            Force Delete
                        </button>
                    </div>
                </td>
            </>
        );
    };

    const filterInputCls = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Recycle Bin</h1>
                <p className="text-slate-500 mt-1 font-medium italic">Safely recover soft-deleted records across all system modules.</p>
            </div>

            <Card className="p-5 bg-slate-50/50 border-slate-200/60 shadow-sm flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Target Module</label>
                        <select 
                            value={module}
                            onChange={(e) => {
                                setModule(e.target.value);
                                setPagination(prev => ({ ...prev, current_page: 1 }));
                            }}
                            className={filterInputCls}
                            disabled={loading || actionLoading}
                        >
                            {modules.map(mod => (
                                <option key={mod.value} value={mod.value}>{mod.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Global Search</label>
                        <input
                            type="text"
                            placeholder={"Search " + module.replace('_', ' ') + "..."}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={filterInputCls}
                        />
                    </div>
                </div>
            </Card>

            <DataTable
                columns={getColumns()}
                data={records}
                loading={loading}
                emptyMessage={`No deleted records found in ${module.replace('_', ' ')}.`}
                pagination={pagination}
                onPageChange={(page) => fetchRecords(page)}
                onPerPageChange={(newPerPage) => fetchRecords(1)}
                renderRow={renderRow}
            />
        </div>
    );
};

export default RecycleBin;
