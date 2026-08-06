import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationContext';
import Modal from '../UI/Modal';

const AddIncomeCategoryModal = ({ isOpen, onClose, onSuccess, category = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSuccess, showError } = useNotifications();

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                description: category.description || ''
            });
        }
    }, [category]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        try {
            if (category) {
                await axios.put(`/api/income-categories/${category.id}`, formData);
                showSuccess('Category updated successfully');
            } else {
                await axios.post('/api/income-categories', formData);
                showSuccess('Category created successfully');
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                const apiMessage = error.response?.data?.message;
                showError(apiMessage || 'Failed to save category');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = (hasError) => 
        `w-full rounded-xl border ${hasError ? 'border-red-300' : 'border-slate-200'} px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white transition-all shadow-sm`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={category ? 'Edit Income Category' : 'Add New Category'}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Category Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={inputClasses(errors.name)}
                            placeholder="e.g., Admission Form Fee"
                            required
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name[0]}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            className={inputClasses(errors.description)}
                            placeholder="Optional description..."
                        ></textarea>
                        {errors.description && <p className="text-red-500 text-xs mt-1 font-medium">{errors.description[0]}</p>}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Category'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddIncomeCategoryModal;
