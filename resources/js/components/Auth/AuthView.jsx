import React, { useState } from 'react';
import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPassword from './ForgotPassword';

const AuthView = () => {
    const [view, setView] = useState('login'); // login, register, forgot

    const renderForm = () => {
        switch (view) {
            case 'login':
                return (
                    <LoginForm 
                        onToggleRegister={() => setView('register')} 
                        onToggleForgot={() => setView('forgot')} 
                    />
                );
            case 'register':
                return <RegisterForm onToggleLogin={() => setView('login')} />;
            case 'forgot':
                return <ForgotPassword onToggleLogin={() => setView('login')} />;
            default:
                return <LoginForm onToggleRegister={() => setView('register')} />;
        }
    };

    const getLayoutConfig = () => {
        switch (view) {
            case 'login':
                return { title: 'Welcome Back', subtitle: 'Sign in to access your dashboard' };
            case 'register':
                return { title: 'Create Account', subtitle: 'Join SGC Education Management System' };
            case 'forgot':
                return { title: 'Reset Password', subtitle: "We'll help you get back into your account" };
            default:
                return { title: 'Authentication', subtitle: 'Secure your account' };
        }
    };

    const { title, subtitle } = getLayoutConfig();

    return (
        <AuthLayout title={title} subtitle={subtitle}>
            {renderForm()}
        </AuthLayout>
    );
};

export default AuthView;
