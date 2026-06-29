import React, { useState } from 'react';
import ExtraIncomeList from './ExtraIncomeList';
import IncomeCategoryList from './IncomeCategoryList';

const ExtraIncomeManagement = () => {
    const [activeTab, setActiveTab] = useState('incomes');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Extra Income</h2>
                <p className="text-slate-500 mt-1">Manage non-fee related income like admission forms, fines, and other collections.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-200">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('incomes')}
                            className={`${
                                activeTab === 'incomes'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            Income Records
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`${
                                activeTab === 'categories'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            Income Categories
                        </button>
                    </nav>
                </div>
                
                <div className="p-6">
                    {activeTab === 'incomes' ? <ExtraIncomeList /> : <IncomeCategoryList />}
                </div>
            </div>
        </div>
    );
};

export default ExtraIncomeManagement;
