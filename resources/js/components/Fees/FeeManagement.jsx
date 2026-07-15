import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import FeeHeadManagement from './FeeHeadManagement';
import FeeStructureManagement from './FeeStructureManagement';
import FinePolicyManagement from './FinePolicyManagement';
import StudentFeeManagement from './StudentFeeManagement';
import StudentLedgerList from './StudentLedgerList';
import StudentLedgerDetail from './StudentLedgerDetail';
import FeeDeposit from './FeeDeposit';
import FeeReceiptList from './FeeReceiptList';
import VoucherList from './VoucherList';

const FeeManagement = () => {
    const location = useLocation();
    
    const tabs = [
        { name: 'Fee Heads', path: '/fees/heads' },
        { name: 'Fee Structures', path: '/fees/structures' },
        { name: 'Fine Policies', path: '/fees/policies' },
        { name: 'Student Ledgers', path: '/fees/ledgers' },
        { name: 'Generated Vouchers', path: '/fees/vouchers-list' },
        { name: 'Fee Deposit', path: '/fees/deposit' },
        { name: 'Fee Receipts', path: '/fees/receipts' },
        { name: 'Misc Fee Operations', path: '/fees/billing' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Fee Management</h1>
                <p className="text-slate-500 mt-2">Configure fee heads, structures, and late fee policies.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={`px-8 py-4 text-sm font-semibold transition-all duration-200 ${
                                location.pathname.startsWith(tab.path)
                                    ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                            }`}
                        >
                            {tab.name}
                        </Link>
                    ))}
                </div>

                <div className="p-8">
                    <Routes>
                        <Route path="heads" element={<FeeHeadManagement />} />
                        <Route path="structures" element={<FeeStructureManagement />} />
                        <Route path="policies" element={<FinePolicyManagement />} />
                        <Route path="ledgers" element={<StudentLedgerList />} />
                        <Route path="vouchers-list" element={<VoucherList />} />
                        <Route path="ledger/:studentId" element={<StudentLedgerDetail />} />
                        <Route path="deposit" element={<FeeDeposit />} />
                        <Route path="receipts" element={<FeeReceiptList />} />
                        <Route path="billing" element={<StudentFeeManagement />} />
                        <Route path="/" element={<Navigate to="heads" replace />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default FeeManagement;
