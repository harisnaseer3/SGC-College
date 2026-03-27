import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedOrganization, setSelectedOrganization] = useState(null);
    const [selectedCampus, setSelectedCampus] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const orgId = localStorage.getItem('selected_org_id');
        const campusId = localStorage.getItem('selected_campus_id');

        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            if (orgId) {
                axios.defaults.headers.common['X-Organization-ID'] = orgId;
                setSelectedOrganization(orgId);
            }
            if (campusId) {
                axios.defaults.headers.common['X-Campus-ID'] = campusId;
                setSelectedCampus(campusId);
            }
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const response = await axios.get('/api/profile');
            setUser(response.data.data);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        const response = await axios.post('/api/login', credentials);
        const { user, access_token } = response.data.data;
        
        localStorage.setItem('auth_token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setUser(user);
        return user;
    };

    const register = async (data) => {
        const response = await axios.post('/api/register', data);
        const { user, access_token } = response.data.data;
        
        localStorage.setItem('auth_token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setUser(user);
        return user;
    };

    const setOrganization = (orgId) => {
        localStorage.setItem('selected_org_id', orgId);
        axios.defaults.headers.common['X-Organization-ID'] = orgId;
        setSelectedOrganization(orgId);
        
        // Reset campus when switching orgs
        localStorage.removeItem('selected_campus_id');
        delete axios.defaults.headers.common['X-Campus-ID'];
        setSelectedCampus(null);
    };

    const setCampus = (campusId) => {
        if (campusId) {
            localStorage.setItem('selected_campus_id', campusId);
            axios.defaults.headers.common['X-Campus-ID'] = campusId;
            setSelectedCampus(campusId);
        } else {
            // "All Campuses" case
            localStorage.removeItem('selected_campus_id');
            delete axios.defaults.headers.common['X-Campus-ID'];
            setSelectedCampus(null);
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('selected_org_id');
            localStorage.removeItem('selected_campus_id');
            delete axios.defaults.headers.common['Authorization'];
            delete axios.defaults.headers.common['X-Organization-ID'];
            delete axios.defaults.headers.common['X-Campus-ID'];
            setUser(null);
            setSelectedOrganization(null);
            setSelectedCampus(null);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, loading, login, logout, register, setUser, 
            selectedOrganization, setOrganization,
            selectedCampus, setCampus 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
