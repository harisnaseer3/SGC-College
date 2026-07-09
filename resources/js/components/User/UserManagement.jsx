import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import UserList from './UserList';
import UserForm from './UserForm';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../UI/Card';

const UserManagement = () => {
    const { showSuccess, showError } = useNotifications();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });

    const fetchUsers = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get('/api/users', { params: { page } });
            setUsers(response.data.data.data);
            setPagination({
                current_page: response.data.data.current_page,
                last_page: response.data.data.last_page,
                total: response.data.data.total,
                per_page: response.data.data.per_page
            });
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(pagination.current_page);
    }, [pagination.current_page]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            showSuccess('User deleted successfully!');
            fetchUsers(pagination.current_page);
        } catch (error) {
            const message = error.response?.data?.message || 'Error deleting user';
            showError(message);
            console.error('Error deleting user:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Routes>
                <Route index element={
                    <UserList 
                        users={users} 
                        loading={loading} 
                        onAddNew={() => navigate('new')}
                        onEdit={(user) => navigate(`edit/${user.id}`)}
                        onDelete={handleDelete}
                        pagination={pagination}
                        setPagination={setPagination}
                    />
                } />
                <Route path="new" element={
                    <UserForm 
                        onSuccess={() => { fetchUsers(pagination.current_page); navigate('/users'); }}
                        onCancel={() => navigate('/users')}
                    />
                } />
                <Route path="edit/:id" element={
                    <UserForm 
                        onSuccess={() => { fetchUsers(pagination.current_page); navigate('/users'); }}
                        onCancel={() => navigate('/users')}
                    />
                } />
            </Routes>
        </div>
    );
};

export default UserManagement;
