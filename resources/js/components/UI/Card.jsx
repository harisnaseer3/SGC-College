import React from 'react';

const Card = ({ children, className = '', hover = true }) => {
    return (
        <div className={`glass-card ${hover ? 'hover:-translate-y-1 transition-all duration-300' : ''} ${className}`}>
            {children}
        </div>
    );
};

export default Card;
