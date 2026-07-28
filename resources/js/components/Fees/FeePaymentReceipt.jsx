import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const FeePaymentReceipt = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { selectedOrganization } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReceiptData = async () => {
            try {
                const response = await axios.get(`/api/student-fees/payments/${id}`);
                setData(response.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch receipt data');
            } finally {
                setLoading(false);
            }
        };

        fetchReceiptData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center">Loading receipt...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!data) return null;

    return (
        <div className="bg-white min-h-screen">
            <div className="print:hidden p-4 bg-slate-800 text-white flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        ← Back
                    </button>
                    <h1 className="font-bold">Fee Receipt</h1>
                </div>
                <button 
                    onClick={handlePrint}
                    className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Receipt
                </button>
            </div>

            <div className="max-w-2xl mx-auto mt-8 p-8 bg-white border border-slate-200 shadow-sm print:shadow-none print:border-0 rounded-xl print:rounded-none" id="receipt-content">
                <div className="text-center mb-8 pb-8 border-b border-slate-200">
                    {(data.campus?.logo_url || data.organization?.logo_url) && (
                        <img 
                            src={data.campus?.logo_url || data.organization?.logo_url} 
                            alt="Logo" 
                            className="h-16 mx-auto mb-4 object-contain"
                        />
                    )}
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">FEE RECEIPT</h1>
                    <p className="text-slate-500 font-medium text-lg">
                        {data.organization?.name || selectedOrganization?.name || 'SGC Education Management System'}
                    </p>
                    {data.campus?.name && (
                        <p className="text-slate-500 mt-1">Campus: {data.campus.name}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Receipt Number</p>
                        <p className="font-bold text-slate-900 mb-2">{data.receipt_number || `REC-${data.id}`}</p>
                        {data.voucher_number && (
                            <>
                                <p className="text-sm text-slate-500 mb-1">Voucher Number</p>
                                <p className="font-bold text-slate-900">{data.voucher_number}</p>
                            </>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500 mb-1">Date</p>
                        <p className="font-bold text-slate-900">
                            {new Date(data.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-2">Student Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block">Name:</span>
                            <span className="font-bold text-slate-900">{data.student?.first_name} {data.student?.last_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block">Roll Number:</span>
                            <span className="font-bold text-slate-900">{data.student?.roll_number || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block">Program:</span>
                            <span className="font-bold text-slate-900">{data.student?.program?.name || '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="text-left py-3 text-sm font-bold text-slate-900">Description</th>
                                <th className="text-right py-3 text-sm font-bold text-slate-900">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="py-4">
                                    <p className="font-medium text-slate-900">Fee Payment</p>
                                    <p className="text-sm text-slate-500 mt-1">Transaction ID: {data.transaction_id || 'N/A'}</p>
                                </td>
                                <td className="py-4 text-right font-medium text-slate-900">
                                    Rs. {Number(data.amount).toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="py-4 text-right font-bold text-slate-900">Total Amount Received:</td>
                                <td className="py-4 text-right font-bold text-slate-900 text-xl">
                                    Rs. {Number(data.amount).toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 mt-12">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Payment Method</p>
                        <p className="font-medium text-slate-900">{data.payment_method}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500 mb-1">Deposited By</p>
                        <p className="font-medium text-slate-900">{data.receiver?.name || '-'}</p>
                    </div>
                </div>

                <div className="mt-16 text-center text-sm text-slate-500 print:mt-32">
                    <p>This is a computer-generated receipt.</p>
                </div>
            </div>

            <style>{`
                @media print {
                    @page {
                        margin: 1cm;
                    }
                    body {
                        background: white;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    .print\\:border-0 {
                        border: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default FeePaymentReceipt;
