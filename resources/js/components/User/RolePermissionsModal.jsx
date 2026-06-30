import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Modal from '../UI/Modal';

const RolePermissionsModal = ({ role, onClose, onSaved }) => {
    const { showSuccess, showError } = useNotifications();
    const [groupedPermissions, setGroupedPermissions] = useState({});
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                // Fetch all grouped permissions
                const [allPermsRes, roleRes] = await Promise.all([
                    axios.get('/api/permissions'),
                    axios.get(`/api/roles/${role.id}`)
                ]);

                setGroupedPermissions(allPermsRes.data.data || {});
                
                // Initialize selected permissions based on what the role already has
                const rolePerms = roleRes.data.data?.permissions?.map(p => p.name) || [];
                setSelectedPermissions(rolePerms);
            } catch (error) {
                console.error('Error fetching permissions:', error);
                showError('Failed to load permissions.');
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, [role.id, showError]);

    const handleCheckboxChange = (permName) => {
        setSelectedPermissions(prev => 
            prev.includes(permName) 
                ? prev.filter(p => p !== permName)
                : [...prev, permName]
        );
    };

    const handleSelectAllModule = (moduleName, isSelectAll) => {
        const modulePerms = groupedPermissions[moduleName].map(p => p.name);
        if (isSelectAll) {
            setSelectedPermissions(prev => [...new Set([...prev, ...modulePerms])]);
        } else {
            setSelectedPermissions(prev => prev.filter(p => !modulePerms.includes(p)));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post(`/api/roles/${role.id}/permissions`, {
                permissions: selectedPermissions
            });
            showSuccess('Permissions saved successfully!');
            onSaved();
        } catch (error) {
            console.error('Error saving permissions:', error);
            showError('Failed to save permissions.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={`Manage Permissions: ${role.label || role.name}`}
            size="3xl"
        >
            <div className="p-6">
                {loading ? (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                        {Object.entries(groupedPermissions).map(([module, perms]) => {
                            const allSelected = perms.every(p => selectedPermissions.includes(p.name));
                            const someSelected = perms.some(p => selectedPermissions.includes(p.name));

                            return (
                                <div key={module} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                                        <h3 className="font-semibold text-slate-800 capitalize text-lg">
                                            {module.replace('_', ' ')}
                                        </h3>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                                checked={allSelected}
                                                ref={input => {
                                                    if (input) {
                                                        input.indeterminate = !allSelected && someSelected;
                                                    }
                                                }}
                                                onChange={(e) => handleSelectAllModule(module, e.target.checked)}
                                            />
                                            Select All
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {perms.map(p => (
                                            <label 
                                                key={p.name} 
                                                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 shrink-0"
                                                    checked={selectedPermissions.includes(p.name)}
                                                    onChange={() => handleCheckboxChange(p.name)}
                                                />
                                                <span className="text-sm text-slate-700 leading-snug">
                                                    {p.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    disabled={saving}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                        </>
                    ) : (
                        <span>Save Permissions</span>
                    )}
                </button>
            </div>
        </Modal>
    );
};

export default RolePermissionsModal;
