import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ProgramManagement from './ProgramManagement';
import CourseManagement from './CourseManagement';
import BatchManagement from './BatchManagement';

const AcademicManagement = () => {
    const location = useLocation();
    
    const tabs = [
        { name: 'Programs', path: '/academic/programs' },
        { name: 'Courses', path: '/academic/courses' },
        { name: 'Batches', path: '/academic/batches' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Academic Module</h1>
                <p className="text-slate-500 mt-2">Manage programs, courses, and academic batches.</p>
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
                        <Route path="programs/*" element={<ProgramManagement />} />
                        <Route path="courses" element={<CourseManagement />} />
                        <Route path="batches" element={<BatchManagement />} />
                        <Route path="/" element={<ProgramManagement />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default AcademicManagement;
