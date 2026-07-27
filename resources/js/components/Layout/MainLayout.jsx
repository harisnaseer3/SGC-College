import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout = ({ children }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8fafc] print:h-auto print:overflow-visible print:block">
            {/* Backdrop for mobile */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
            
            <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
            <div className="flex-1 flex flex-col overflow-hidden print:h-auto print:overflow-visible print:block">
                <TopBar onMenuClick={() => setIsMobileOpen(!isMobileOpen)} />
                <main className="p-8 flex-1 overflow-y-auto print:p-0 print:overflow-visible print:h-auto print:block">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
