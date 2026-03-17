import React from 'react';

const Button = ({ children, onClick, className = '', variant = 'primary', disabled = false }) => {
    const variants = {
        primary: 'premium-button',
        secondary: 'px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors',
        ghost: 'p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-50',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${variants[variant] || variants.primary} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;
