import React from 'react';
import Card from '../UI/Card';

const RecentActivity = () => {
    const activities = [
        { id: 1, title: 'New Admission', location: 'Tenacious Main Campus', time: '2m ago' },
        { id: 2, title: 'New Admission', location: 'Tenacious Main Campus', time: '2m ago' },
        { id: 3, title: 'New Admission', location: 'Tenacious Main Campus', time: '2m ago' },
        { id: 4, title: 'New Admission', location: 'Tenacious Main Campus', time: '2m ago' },
    ];

    return (
        <Card className="p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-violet-600 rounded-full"></span>
                Recent Activity
            </h3>
            <div className="space-y-6">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900 leading-tight">{activity.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{activity.location} • {activity.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default RecentActivity;
