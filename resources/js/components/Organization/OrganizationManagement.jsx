import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OrganizationList from './OrganizationList';
import NewOrganizationForm from './NewOrganizationForm';
import CampusManagement from './CampusManagement';

const OrganizationManagement = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState([]);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/organizations');
            setOrganizations(response.data.data);
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const handleCreateSuccess = () => {
        fetchOrganizations();
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
                        onManageCampuses={(org) => navigate(`${org.id}/campuses`)}
                    />
                } />
                <Route path="new" element={
                    <NewOrganizationForm 
                        onCancel={() => navigate('/organizations')} 
                        onSuccess={handleCreateSuccess}
                    />
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
