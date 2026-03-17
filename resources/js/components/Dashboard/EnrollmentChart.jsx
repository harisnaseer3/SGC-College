import React from 'react';
import Card from '../UI/Card';

const EnrollmentChart = () => {
    return (
        <Card className="p-8 min-h-[400px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                Enrollment Trends
            </h3>
            <div className="h-[300px] w-full bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center">
                <p className="text-slate-400 font-medium">Chart visualization loading...</p>
            </div>
        </Card>
    );
};

export default EnrollmentChart;
