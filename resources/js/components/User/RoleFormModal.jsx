import React, { useState } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Modal from '../UI/Modal';

const RoleFormModal = ({ role, onClose, onSaved }) => {
    const { showSuccess, showError } = useNotifications();
    const [name, setName] = useState(role ? role.label : '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (role) {
                await axios.put(`/api/roles/${role.id}`, { name });
                showSuccess('Role updated successfully!');
            } else {
                await axios.post('/api/roles', { name });
                showSuccess('Role created successfully!');
            }
            onSaved();
        } catch (error) {
            console.error('Error saving role:', error);
            const msg = error.response?.data?.message || 'Failed to save role.';
            showError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={role ? 'Edit Role' : 'Create New Role'}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Role Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="e.g. Content Manager"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            The system will automatically convert this to a safe format (e.g., "content_manager").
                        </p>
                    </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <span>{role ? 'Save Changes' : 'Create Role'}</span>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RoleFormModal;
