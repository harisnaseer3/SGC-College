import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Card from '../UI/Card';

const FeeAnalyticsChart = ({ data }) => {
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'semester'

    if (!data) {
        return (
            <Card className="p-8 min-h-[400px]">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-fuchsia-600 rounded-full"></span>
                    Fee Collection Analytics
                </h3>
                <div className="h-[300px] w-full bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center">
                    <p className="text-slate-400 font-medium">Chart visualization loading...</p>
                </div>
            </Card>
        );
    }

    const chartData = viewMode === 'monthly' ? data.monthly : data.semester;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
                    <p className="text-slate-700 font-bold mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm font-semibold">
                            {entry.name}: Rs. {Number(entry.value).toLocaleString()}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="p-8 min-h-[400px] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-fuchsia-600 rounded-full"></span>
                    Fee Collection Analytics
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                            viewMode === 'monthly'
                                ? 'bg-white text-fuchsia-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setViewMode('semester')}
                        className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                            viewMode === 'semester'
                                ? 'bg-white text-fuchsia-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Semester-wise
                    </button>
                </div>
            </div>

            <div className="w-full mt-4">
                {chartData && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                tickFormatter={(value) => `Rs. ${value / 1000}k`}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="current_fee" name="Current Fee" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="arrears" name="Arrears" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="received" name="Total Received" fill="#d946ef" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pending" name="Total Pending" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[350px] w-full flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No fee data available for this view.</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default FeeAnalyticsChart;
