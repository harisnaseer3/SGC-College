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
    const [isPermissionModalOpen, setPermissionModalOpen] = useState(false);
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/roles');
            setRoles(response.data.data || []);
        } catch (error) {
            console.error('Error fetching roles:', error);
            showError('Failed to load roles.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this role?')) return;
        try {
            await axios.delete(`/api/roles/${id}`);
            showSuccess('Role deleted successfully!');
            fetchRoles();
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
                onCreate={handleCreateRole}
                onEdit={handleEditRole}
                onDelete={handleDelete}
                onManagePermissions={handleManagePermissions}
            />

            {isPermissionModalOpen && selectedRole && (
                <RolePermissionsModal 
                    role={selectedRole}
                    onClose={() => setPermissionModalOpen(false)}
                    onSaved={() => { setPermissionModalOpen(false); fetchRoles(); }}
                />
            )}

            {isFormModalOpen && (
                <RoleFormModal
                    role={selectedRole}
                    onClose={() => setFormModalOpen(false)}
                    onSaved={() => { setFormModalOpen(false); fetchRoles(); }}
                />
            )}
        </div>
    );
};

export default RoleManagement;
