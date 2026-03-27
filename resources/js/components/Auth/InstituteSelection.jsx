import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import AuthLayout from './AuthLayout';
import Button from '../UI/Button';

const InstituteSelection = () => {
    const { setOrganization, logout } = useAuth();
    const { showError } = useNotifications();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchOrganizations = async () => {
            try {
                // Since super_admin has no org attached by default and no scope restricts them,
                // they can see all orgs. 
                // We use per_page=-1 to get all or assuming the list comes paginated.
                const response = await axios.get('/api/organizations?per_page=100');
                const orgs = response.data.data?.data || response.data.data || [];
                setOrganizations(orgs);
            } catch (error) {
                console.error('Error fetching organizations:', error);
                showError('Failed to load institutes. Please try logging in again.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizations();
    }, [showError]);

    const handleSelect = (e) => {
        e.preventDefault();
        if (!selectedId) {
            showError('Please select an institute from the list to continue.');
            return;
        }

        setSubmitting(true);
        // Small delay for smooth transition UX
        setTimeout(() => {
            setOrganization(selectedId);
        }, 300);
    };

    return (
        <AuthLayout title="Select Institute" subtitle="Choose an organization to manage">
            <form onSubmit={handleSelect} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">
                        Available Institutes
                    </label>
                    <div className="relative group">
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            disabled={loading || submitting}
                            className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 outline-none transition-all font-medium text-slate-900 group-hover:border-indigo-300 appearance-none`}
                            required
                        >
                            <option value="" disabled>
                                {loading ? 'Loading institutes...' : 'Select an institute...'}
                            </option>
                            {organizations.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={logout}
                        disabled={loading || submitting} 
                        className="w-1/3 py-4 text-base"
                    >
                        Logout
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={loading || submitting || !selectedId} 
                        className="w-2/3 py-4 text-base shadow-xl shadow-indigo-500/30"
                    >
                        {submitting ? 'Entering Dashboard...' : 'Continue to Dashboard'}
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
};

export default InstituteSelection;
