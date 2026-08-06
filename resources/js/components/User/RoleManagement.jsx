import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RoleList from './RoleList';
import RolePermissionsModal from './RolePermissionsModal';
import { useNotifications } from '../../contexts/NotificationContext';
import RoleFormModal from './RoleFormModal';

const RoleManagement = () => {
    const { showSuccess, showError } = useNotifications();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isPermissionModalOpen, setPermissionModalOpen] = useState(false);
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });

    const fetchRoles = async (page = 1, searchQuery = search) => {
        setLoading(true);
        try {
            const params = { page };
            if (searchQuery) params.search = searchQuery;
            const response = await axios.get('/api/roles', { params });
            setRoles(response.data.data.data || []);
            setPagination({
                current_page: response.data.data.current_page,
                last_page: response.data.data.last_page,
                total: response.data.data.total,
                per_page: response.data.data.per_page
            });
        } catch (error) {
            console.error('Error fetching roles:', error);
            showError('Failed to load roles.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles(pagination.current_page, search);
    }, [pagination.current_page]);

    const handleSearchChange = (value) => {
        setSearch(value);
        setPagination(prev => ({ ...prev, current_page: 1 }));
        fetchRoles(1, value);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this role?')) return;
        try {
            await axios.delete(`/api/roles/${id}`);
            showSuccess('Role deleted successfully!');
            fetchRoles(pagination.current_page);
        } catch (error) {
            const message = error.response?.data?.message || 'Error deleting role';
            showError(message);
        }
    };

    const handleManagePermissions = (role) => {
        setSelectedRole(role);
        setPermissionModalOpen(true);
    };

    const handleEditRole = (role) => {
        setSelectedRole(role);
        setFormModalOpen(true);
    };

    const handleCreateRole = () => {
        setSelectedRole(null);
        setFormModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <RoleList 
                roles={roles} 
                loading={loading} 
                search={search}
                onSearchChange={handleSearchChange}
                onCreate={handleCreateRole}
                onEdit={handleEditRole}
                onDelete={handleDelete}
                onManagePermissions={handleManagePermissions}
                pagination={pagination}
                setPagination={setPagination}
            />

            {isPermissionModalOpen && selectedRole && (
                <RolePermissionsModal 
                    role={selectedRole}
                    onClose={() => setPermissionModalOpen(false)}
                    onSaved={() => { setPermissionModalOpen(false); fetchRoles(pagination.current_page); }}
                />
            )}

            {isFormModalOpen && (
                <RoleFormModal
                    role={selectedRole}
                    onClose={() => setFormModalOpen(false)}
                    onSaved={() => { setFormModalOpen(false); fetchRoles(pagination.current_page); }}
                />
            )}
        </div>
    );
};

export default RoleManagement;
