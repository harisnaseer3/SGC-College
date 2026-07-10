import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../UI/Button';
import Card from '../UI/Card';

const UserForm = ({ onSuccess, onCancel }) => {
    const { id } = useParams();
    const { user: currentUser, selectedCampus, selectedOrganization } = useAuth();
    const { showSuccess, showError } = useNotifications();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: '',
        campus_id: ''
    });

    const [roles, setRoles] = useState([]);
    const [campuses, setCampuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (!isEdit && selectedCampus) {
            setFormData(prev => ({ ...prev, campus_id: selectedCampus }));
        }
    }, [selectedCampus, isEdit]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            
            // Try fetching roles first as they don't depend on organization
            try {
                const rolesRes = await axios.get('/api/roles');
                setRoles(rolesRes.data.data?.data || rolesRes.data.data || []);
            } catch (error) {
                console.error('Error fetching roles:', error);
            }

            // Fetch campuses if organization_id exists
            const orgId = selectedOrganization || currentUser?.organization_id;
            if (orgId) {
                try {
                    const campusesRes = await axios.get(`/api/organizations/${orgId}/campuses`);
                    // Ensure we handle both paginated and unpaginated responses
                    const data = campusesRes.data.data?.data || campusesRes.data.data || [];
                    setCampuses(data);
                } catch (error) {
                    console.error('Error fetching campuses:', error);
                }
            }

            try {
                if (isEdit) {
                    const userRes = await axios.get(`/api/users/${id}`);
                    const user = userRes.data.data;
                    setFormData({
                        name: user.name,
                        email: user.email,
                        password: '',
                        password_confirmation: '',
                        role: user.roles?.[0]?.name || '',
                        campus_id: user.campus_id || ''
                    });
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchData();
        }
    }, [id, currentUser, isEdit]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Clean data: convert empty strings to null
        const cleanData = Object.keys(formData).reduce((acc, key) => {
            acc[key] = formData[key] === '' ? null : formData[key];
            return acc;
        }, {});

        try {
            if (isEdit) {
                await axios.put(`/api/users/${id}`, cleanData);
                showSuccess('User updated successfully!');
            } else {
                await axios.post('/api/users', cleanData);
                showSuccess('User created successfully!');
            }
            onSuccess();
        } catch (error) {
            if (error.response && error.response.data.errors) {
                setErrors(error.response.data.errors);
                showError('Please fix the validation errors.');
            } else {
                const message = error.response?.data?.message || 'Error saving user';
                showError(message);
                console.error('Error saving user:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && !formData.name && isEdit) {
        return <div className="text-center py-12 text-slate-500 font-medium">Loading user data...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onCancel}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {isEdit ? 'Edit User' : 'Create New User'}
                </h1>
            </div>

            <Card className="p-8 border-slate-200 shadow-xl overflow-visible">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                            <input 
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium`}
                                required
                            />
                            {errors.name && <p className="text-red-500 text-xs font-bold mt-1">{errors.name[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                            <input 
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="john@example.com"
                                className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium`}
                                required
                            />
                            {errors.email && <p className="text-red-500 text-xs font-bold mt-1">{errors.email[0]}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Role</label>
                            <select 
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.role ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-bold text-slate-700`}
                                required
                            >
                                <option value="">Select Role</option>
                                {roles.filter(r => r.name !== 'student').map(r => <option key={r.id} value={r.name}>{r.label}</option>)}
                            </select>
                            {errors.role && <p className="text-red-500 text-xs font-bold mt-1">{errors.role[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Assign College</label>
                            <select 
                                name="campus_id"
                                value={formData.campus_id}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.campus_id ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-bold text-slate-700`}
                                disabled={['super_admin', 'org_admin'].includes(formData.role)}
                                required={!['super_admin', 'org_admin'].includes(formData.role)}
                            >
                                <option value="">{['super_admin', 'org_admin'].includes(formData.role) ? 'Global Access' : 'Select College'}</option>
                                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {errors.campus_id && <p className="text-red-500 text-xs font-bold mt-1">{errors.campus_id[0]}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                {isEdit ? 'New Password (Optional)' : 'Password'}
                            </label>
                            <div className="relative group">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl border ${errors.password ? 'border-red-500' : 'border-slate-200'} pr-12 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium`}
                                    required={!isEdit}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs font-bold mt-1">{errors.password[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Confirm Password</label>
                            <div className="relative group">
                                <input 
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="password_confirmation"
                                    value={formData.password_confirmation}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium"
                                    required={!isEdit || !!formData.password}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                >
                                    {showConfirmPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-slate-100">
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Processing...' : isEdit ? 'Update User' : 'Create User'}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default UserForm;
