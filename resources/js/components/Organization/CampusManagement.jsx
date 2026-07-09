import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import CampusList from './CampusList';
import NewCampusForm from './NewCampusForm';

// Wrapper to resolve the campus being edited from the URL param
const EditCampusWrapper = ({ organization, campuses, onSuccess }) => {
    const { campusId } = useParams();
    const navigate = useNavigate();
    const campus = campuses.find(c => c.id === parseInt(campusId));

    if (!campus) {
        return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Campus Not Found</h3>
                <p className="text-slate-500 mt-2">The campus you're trying to edit doesn't exist.</p>
                <button
                    onClick={() => navigate(`/colleges/${organization.id}/campuses`)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Back to List
                </button>
            </div>
        );
    }

    return (
        <NewCampusForm
            organization={organization}
            campus={campus}
            onSuccess={onSuccess}
        />
    );
};

const CampusManagement = ({ onBack }) => {
    const { orgId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showSuccess, showError } = useNotifications();

    const [organization, setOrganization] = useState(null);
    const [loading, setLoading] = useState(false);
    const [campuses, setCampuses] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });

    const isSuperAdmin = user?.roles?.some(role => role.name === 'super_admin');

    const fetchOrgAndCampuses = async (page = 1) => {
        setLoading(true);
        try {
            const [orgRes, campusRes] = await Promise.all([
                axios.get(`/api/organizations/${orgId}`),
                axios.get(`/api/organizations/${orgId}/campuses`, { params: { page } }),
            ]);
            setOrganization(orgRes.data.data);
            setCampuses(campusRes.data.data.data);
            setPagination({
                current_page: campusRes.data.data.current_page,
                last_page: campusRes.data.data.last_page,
                total: campusRes.data.data.total,
                per_page: campusRes.data.data.per_page
            });
        } catch (error) {
            console.error('Failed to fetch campuses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgAndCampuses(pagination.current_page);
    }, [orgId, pagination.current_page]);

    const handleCreateSuccess = () => {
        fetchOrgAndCampuses(pagination.current_page);
        navigate(`/colleges/${orgId}/campuses`);
    };

    const handleDelete = async (campus) => {
        try {
            await axios.delete(`/api/organizations/${orgId}/campuses/${campus.id}`);
            showSuccess(`${campus.name} deleted successfully.`);
            setCampuses(prev => prev.filter(c => c.id !== campus.id));
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to delete campus.';
            showError(message);
        }
    };

    if (loading && !organization) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!organization) return null;

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <Routes>
                <Route index element={
                    <CampusList
                        organization={organization}
                        campuses={campuses}
                        loading={loading}
                        isSuperAdmin={isSuperAdmin}
                        onAddNew={() => navigate('new')}
                        onEdit={(campus) => navigate(`${campus.id}/edit`)}
                        onDelete={handleDelete}
                        onBack={onBack}
                        pagination={pagination}
                        setPagination={setPagination}
                    />
                } />
                <Route path="new" element={
                    <NewCampusForm
                        organization={organization}
                        onSuccess={handleCreateSuccess}
                    />
                } />
                <Route path=":campusId/edit" element={
                    <EditCampusWrapper
                        organization={organization}
                        campuses={campuses}
                        onSuccess={handleCreateSuccess}
                    />
                } />
            </Routes>
        </div>
    );
};

export default CampusManagement;
