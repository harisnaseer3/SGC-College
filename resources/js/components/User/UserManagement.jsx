import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import UserList from './UserList';
import UserForm from './UserForm';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../UI/Card';

const UserManagement = () => {
    const { showSuccess, showError } = useNotifications();
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.roles?.some(r => r.name === 'super_admin');
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('active'); // 'active' or 'trashed'
    const [trashedCount, setTrashedCount] = useState(0);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });

    const fetchUsers = async (page = 1, searchQuery = search, mode = viewMode) => {
        setLoading(true);
        try {
            const perPage = Number(localStorage.getItem('per_page')) || 10;
            const params = { page, per_page: perPage };
            if (searchQuery) params.search = searchQuery;
            if (isSuperAdmin && mode === 'trashed') {
                params.trashed = 'only';
            }
            const response = await axios.get('/api/users', { params });
            const payload = response.data.data;
            setUsers(payload.data || []);
            if (typeof payload.trashed_count === 'number') {
                setTrashedCount(payload.trashed_count);
            }
            setPagination({
                current_page: payload.current_page,
                last_page: payload.last_page,
                total: payload.total,
                per_page: payload.per_page
            });
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(pagination.current_page, search, viewMode);
    }, [pagination.current_page, viewMode, isSuperAdmin]);

    useEffect(() => {
        const handleCustomPerPage = () => {
            fetchUsers(1, search, viewMode);
        };
        window.addEventListener('perPageChange', handleCustomPerPage);
        return () => window.removeEventListener('perPageChange', handleCustomPerPage);
    }, [search, viewMode]);

    const handleSearchChange = (value) => {
        setSearch(value);
        setPagination(prev => ({ ...prev, current_page: 1 }));
        fetchUsers(1, value, viewMode);
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const handleToggleStatus = async (user) => {
        const actionText = user.is_active !== false ? 'disable' : 'enable';
        if (!window.confirm(`Are you sure you want to ${actionText} ${user.name}'s account?`)) return;
        try {
            const response = await axios.patch(`/api/users/${user.id}/toggle-status`);
            showSuccess(response.data.message || `User account ${actionText}d successfully!`);
            fetchUsers(pagination.current_page, search, viewMode);
        } catch (error) {
            const message = error.response?.data?.message || error.response?.data?.error || `Error updating user status`;
            showError(message);
            console.error('Error toggling status:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user? They will be moved to Soft Deleted Users where a Super Admin can restore or permanently delete them.')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            showSuccess('User soft-deleted successfully!');
            fetchUsers(pagination.current_page, search, viewMode);
        } catch (error) {
            const message = error.response?.data?.message || 'Error deleting user';
            showError(message);
            console.error('Error deleting user:', error);
        }
    };

    const handleRestore = async (user) => {
        if (!window.confirm(`Are you sure you want to restore ${user.name}'s account?`)) return;
        try {
            await axios.post(`/api/users/${user.id}/restore`);
            showSuccess(`User ${user.name} restored successfully!`);
            fetchUsers(pagination.current_page, search, viewMode);
        } catch (error) {
            const message = error.response?.data?.message || 'Error restoring user';
            showError(message);
            console.error('Error restoring user:', error);
        }
    };

    const handleForceDelete = async (user) => {
        if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${user.name} (${user.email})? This action cannot be undone!`)) return;
        try {
            await axios.delete(`/api/users/${user.id}/force-delete`);
            showSuccess(`User ${user.name} permanently deleted!`);
            fetchUsers(pagination.current_page, search, viewMode);
        } catch (error) {
            const message = error.response?.data?.message || 'Error permanently deleting user';
            showError(message);
            console.error('Error permanently deleting user:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Routes>
                <Route index element={
                    <UserList 
                        users={users} 
                        loading={loading} 
                        search={search}
                        onSearchChange={handleSearchChange}
                        onAddNew={() => navigate('new')}
                        onEdit={(user) => navigate(`edit/${user.id}`)}
                        onDelete={handleDelete}
                        onToggleStatus={handleToggleStatus}
                        onRestore={handleRestore}
                        onForceDelete={handleForceDelete}
                        onReload={() => fetchUsers(pagination.current_page, search, viewMode)}
                        isSuperAdmin={isSuperAdmin}
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                        trashedCount={trashedCount}
                        pagination={pagination}
                        setPagination={setPagination}
                    />
                } />
                <Route path="new" element={
                    <UserForm 
                        onSuccess={() => { fetchUsers(pagination.current_page, search, viewMode); navigate('/users'); }}
                        onCancel={() => navigate('/users')}
                    />
                } />
                <Route path="edit/:id" element={
                    <UserForm 
                        onSuccess={() => { fetchUsers(pagination.current_page, search, viewMode); navigate('/users'); }}
                        onCancel={() => navigate('/users')}
                    />
                } />
            </Routes>
        </div>
    );
};

export default UserManagement;
