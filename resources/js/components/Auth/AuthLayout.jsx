import React from 'react';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] animate-pulse delay-700"></div>

            <div className="w-full max-w-[480px] z-10">
                <div className="text-center mb-10">
                    <img 
                        src="/assets/images/logo.png" 
                        alt="Logo" 
                        className="inline-block w-16 h-16 object-contain mb-6 animate-in zoom-in duration-500"
                    />
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {title}
                    </h1>
                    <p className="text-slate-500 font-medium text-lg animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        {subtitle}
                    </p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-slate-200/50 rounded-[32px] p-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {children}
                </div>

                <p className="mt-10 text-center text-slate-400 font-medium">
                    &copy; 2026 SGC Education. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default AuthLayout;
