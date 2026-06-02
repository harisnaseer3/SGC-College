import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout = ({ children }) => {
    return (
        <div className="flex h-screen overflow-hidden bg-[#f8fafc] print:h-auto print:overflow-visible print:block">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden print:h-auto print:overflow-visible print:block">
                <TopBar />
                <main className="p-8 flex-1 overflow-y-auto print:p-0 print:overflow-visible print:h-auto print:block">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
