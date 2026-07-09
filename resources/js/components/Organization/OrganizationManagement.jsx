import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import OrganizationList from './OrganizationList';
import NewOrganizationForm from './NewOrganizationForm';
import CampusManagement from './CampusManagement';

const EditOrganizationWrapper = ({ organizations, onCancel, onSuccess }) => {
    const { orgId } = useParams();
    const organization = organizations.find(o => o.id === parseInt(orgId));

    if (!organization) {
        return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Organization Not Found</h3>
                <p className="text-slate-500 mt-2">The organization you're trying to edit doesn't exist.</p>
                <button 
                    onClick={onCancel}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Back to List
                </button>
            </div>
        );
    }

    return (
        <NewOrganizationForm 
            organization={organization}
            onCancel={onCancel}
            onSuccess={onSuccess}
        />
    );
};

const OrganizationManagement = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });

    const fetchOrganizations = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get('/api/organizations', { params: { page } });
            setOrganizations(response.data.data.data);
            setPagination({
                current_page: response.data.data.current_page,
                last_page: response.data.data.last_page,
                total: response.data.data.total,
                per_page: response.data.data.per_page
            });
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations(pagination.current_page);
    }, [pagination.current_page]);

    const handleCreateSuccess = () => {
        fetchOrganizations(pagination.current_page);
        navigate('/organizations');
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Routes>
                <Route index element={
                    <OrganizationList 
                        organizations={organizations} 
                        loading={loading}
                        onAddNew={() => navigate('new')}
                        onEdit={(org) => navigate(`${org.id}/edit`)}
                        onManageCampuses={(org) => navigate(`${org.id}/campuses`)}
                        pagination={pagination}
                        setPagination={setPagination}
                    />
                } />
                <Route path="new" element={
                    <NewOrganizationForm 
                        onCancel={() => navigate('/organizations')} 
                        onSuccess={handleCreateSuccess}
                    />
                } />
                <Route path=":orgId/edit" element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                        <EditOrganizationWrapper 
                            organizations={organizations}
                            onCancel={() => navigate('/organizations')}
                            onSuccess={handleCreateSuccess}
                        />
                    </React.Suspense>
                } />
                <Route path=":orgId/campuses/*" element={
                    <CampusManagement 
                        onBack={() => navigate('/organizations')}
                    />
                } />
            </Routes>
        </div>
    );
};

export default OrganizationManagement;
