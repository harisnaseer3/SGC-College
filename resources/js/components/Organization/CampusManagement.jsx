import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import CampusList from './CampusList';
import NewCampusForm from './NewCampusForm';

const CampusManagement = ({ onBack }) => {
    const { orgId } = useParams();
    const navigate = useNavigate();
    const [organization, setOrganization] = useState(null);
    const [loading, setLoading] = useState(false);
    const [campuses, setCampuses] = useState([]);

    const fetchOrgAndCampuses = async () => {
        setLoading(true);
        try {
            const [orgRes, campusRes] = await Promise.all([
                axios.get(`/api/organizations/${orgId}`),
                axios.get(`/api/organizations/${orgId}/campuses`)
            ]);
            setOrganization(orgRes.data.data);
            setCampuses(campusRes.data.data);
        } catch (error) {
            console.error('Failed to fetch campuses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgAndCampuses();
    }, [orgId]);

    const handleCreateSuccess = () => {
        fetchOrgAndCampuses();
        navigate(`/colleges/${orgId}/campuses`);
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
                        onAddNew={() => navigate('new')}
                        onBack={onBack}
                    />
                } />
                <Route path="new" element={
                    <NewCampusForm 
                        organization={organization}
                        onCancel={() => navigate(`/colleges/${orgId}/campuses`)} 
                        onSuccess={handleCreateSuccess}
                    />
                } />
            </Routes>
        </div>
    );
};

export default CampusManagement;
