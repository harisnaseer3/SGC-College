import React, { useState } from 'react';
import ExtraExpenses from './ExtraExpenses';
import ExpenseCategories from './ExpenseCategories';

const ExtraExpenseManagement = () => {
    const [activeTab, setActiveTab] = useState('expenses');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Extra Expense</h2>
                <p className="text-slate-500 mt-1">Manage operational costs, petty cash, and other miscellaneous college expenses.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-200">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={`${
                                activeTab === 'expenses'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            Expense Records
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`${
                                activeTab === 'categories'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            Expense Categories
                        </button>
                    </nav>
                </div>
                
                <div className="p-6">
                    {activeTab === 'expenses' ? <ExtraExpenses /> : <ExpenseCategories />}
                </div>
            </div>
        </div>
    );
};

export default ExtraExpenseManagement;
