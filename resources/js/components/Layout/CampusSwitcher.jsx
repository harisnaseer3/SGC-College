import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

const CampusSwitcher = () => {
    const { user, selectedOrganization, selectedCampus, setCampus } = useAuth();
    const { showError } = useNotifications();
    const [campuses, setCampuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Only super_admin and org_admin can see this
    const isEligible = user?.roles?.some(role => ['super_admin', 'org_admin'].includes(role.name));
    
    // Determine the orgId to fetch campuses for:
    const orgId = selectedOrganization || user?.organization_id;

    useEffect(() => {
        if (!isEligible || !orgId) return;

        const fetchCampuses = async () => {
            setLoading(true);
            try {
                // Fetch campuses for the active organization
                const response = await axios.get(`/api/organizations/${orgId}/campuses?per_page=100`);
                const data = response.data.data?.data || response.data.data || [];
                setCampuses(data);
            } catch (error) {
                console.error('Error fetching campuses:', error);
                showError('Failed to load campuses for this organization.');
            } finally {
                setLoading(false);
            }
        };

        fetchCampuses();
    }, [isEligible, orgId, showError]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isEligible || !orgId) return null;

    const handleSelect = (campusId) => {
        setCampus(campusId);
        setIsOpen(false);
        // Optionally reload the page or rely on React state to re-fetch data components
        window.location.reload(); 
    };

    const activeCampus = campuses.find(c => c.id == selectedCampus);

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 transition-colors group"
            >
                <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Campus</span>
                    <span className="text-sm font-bold text-slate-700">
                        {loading ? 'Loading...' : (activeCampus ? activeCampus.name : 'All Campuses')}
                    </span>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-56 right-0 bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        <button
                            onClick={() => handleSelect(null)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                !selectedCampus ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span className="flex items-center justify-between">
                                All Campuses
                                {!selectedCampus && (
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </span>
                        </button>

                        <div className="h-px bg-slate-100 my-1"></div>

                        {campuses.map(campus => (
                            <button
                                key={campus.id}
                                onClick={() => handleSelect(campus.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors line-clamp-1 ${
                                    selectedCampus == campus.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                                title={campus.name}
                            >
                                <span className="flex items-center justify-between">
                                    <span className="truncate pr-2">{campus.name}</span>
                                    {selectedCampus == campus.id && (
                                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </span>
                            </button>
                        ))}

                        {campuses.length === 0 && !loading && (
                            <div className="px-3 py-2 text-sm text-slate-400 italic text-center">
                                No campuses found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampusSwitcher;
