import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import Toast from './Toast';

const ToastContainer = () => {
    const { notifications, removeNotification } = useNotifications();

    return (
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full">
            {notifications.map((n) => (
                <Toast 
                    key={n.id} 
                    {...n} 
                    onClose={() => removeNotification(n.id)} 
                />
            ))}
        </div>
    );
};

export default ToastContainer;
