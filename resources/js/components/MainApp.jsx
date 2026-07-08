import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import MainLayout from './Layout/MainLayout';
import Dashboard from './Dashboard/Dashboard';
import AdmissionList from './Admission/AdmissionList';
import NewAdmissionForm from './Admission/NewAdmissionForm';
import OrganizationManagement from './Organization/OrganizationManagement';
import ProfileView from './Profile/ProfileView';
import UserManagement from './User/UserManagement';
import RoleManagement from './User/RoleManagement';
import AcademicManagement from './Academic/AcademicManagement';
import AdmissionByDateReport from './Reports/AdmissionByDateReport';
import ExtraIncomeByDateReport from './Reports/ExtraIncomeByDateReport';
import FeeManagement from './Fees/FeeManagement';
import FeeVoucher from './Fees/FeeVoucher';
import FeePaymentReceipt from './Fees/FeePaymentReceipt';
import ExtraIncomeManagement from './ExtraIncome/ExtraIncomeManagement';
import ExtraIncomeReceipt from './ExtraIncome/ExtraIncomeReceipt';
import BackupManagement from './System/BackupManagement';
import AuthView from './Auth/AuthView';
import InstituteSelection from './Auth/InstituteSelection';
import ToastContainer from './UI/ToastContainer';

const AppContent = () => {
    const { user, loading, selectedOrganization } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold animate-pulse text-sm uppercase tracking-widest">Initializing SGC System...</p>
            </div>
        );
    }

    if (!user) {
        return <AuthView />;
    }

    const isSuperAdmin = user.roles?.some(role => role.name === 'super_admin');
    
    if (isSuperAdmin && !selectedOrganization) {
        return <InstituteSelection />;
    }

    return (
        <Routes>
            <Route path="/fees/voucher/:studentId" element={<FeeVoucher />} />
            <Route path="/fees/receipt/:id" element={<FeePaymentReceipt />} />
            <Route path="/extra-income/receipt/:id" element={<ExtraIncomeReceipt />} />
            <Route
                path="*"
                element={
                    <MainLayout>
                        <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            {isSuperAdmin && <Route path="/organizations/*" element={<OrganizationManagement />} />}
                            <Route path="/users/*" element={<UserManagement />} />
                            <Route path="/roles/*" element={<RoleManagement />} />
                            <Route path="/academic/*" element={<AcademicManagement />} />
                            <Route path="/system/backups" element={<BackupManagement />} />
                            <Route path="/fees/*" element={<FeeManagement />} />
                            <Route path="/admissions" element={<AdmissionList />} />
                            <Route path="/new-admission" element={<NewAdmissionForm />} />
                            <Route path="/edit-admission/:id" element={<NewAdmissionForm />} />
                            <Route path="/reports/admissions-by-date" element={<AdmissionByDateReport />} />
                            <Route path="/reports/extra-income-by-date" element={<ExtraIncomeByDateReport />} />
                            <Route path="/extra-income/*" element={<ExtraIncomeManagement />} />
                            <Route path="/profile" element={<ProfileView />} />
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </MainLayout>
                }
            />
        </Routes>
    );
};

const MainApp = () => {
    return (
        <NotificationProvider>
            <AuthProvider>
                <AppContent />
                <ToastContainer />
            </AuthProvider>
        </NotificationProvider>
    );
};

export default MainApp;
