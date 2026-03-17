import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-[#f8fafc]">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <TopBar />
                <main className="p-8 flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
