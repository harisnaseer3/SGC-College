import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((message, type = 'success', duration = 5000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showSuccess = useCallback((message) => addNotification(message, 'success'), [addNotification]);
    const showError = useCallback((message) => addNotification(message, 'error'), [addNotification]);
    const showInfo = useCallback((message) => addNotification(message, 'info'), [addNotification]);
    const showWarning = useCallback((message) => addNotification(message, 'warning'), [addNotification]);

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, showSuccess, showError, showInfo, showWarning }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
