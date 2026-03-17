import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import UserList from './UserList';
import UserForm from './UserForm';
import Card from '../UI/Card';

const UserManagement = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/users');
            setUsers(response.data.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            fetchUsers();
        } catch (error) {
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
                    />
                } />
                <Route path="new" element={
                    <UserForm 
                        onSuccess={() => { fetchUsers(); navigate('/users'); }}
                        onCancel={() => navigate('/users')}
                    />
                } />
                <Route path="edit/:id" element={
                    <UserForm 
                        onSuccess={() => { fetchUsers(); navigate('/users'); }}
                        onCancel={() => navigate('/users')}
                    />
                } />
            </Routes>
        </div>
    );
};

export default UserManagement;
