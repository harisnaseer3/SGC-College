import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const FeePaymentReceipt = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
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

    const handleDownload = () => {
        const originalTitle = document.title;
        if (data?.receipt_number) {
            document.title = `Fee_Receipt_${data.receipt_number}`;
        } else {
            document.title = `Fee_Receipt_${id}`;
        }
        window.print();
        document.title = originalTitle;
    };

    useEffect(() => {
        if (data && searchParams.get('download') === '1') {
            const timer = setTimeout(() => {
                handleDownload();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [data, searchParams]);

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
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold transition-all shadow flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Receipt
                    </button>
                    <button 
                        onClick={handleDownload}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-bold transition-all shadow flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Receipt
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto my-4 p-6 bg-white border border-slate-200 shadow-sm print:shadow-none print:border-0 rounded-xl print:rounded-none print:m-0 print:p-2" id="receipt-content">
                <div className="text-center mb-4 pb-4 border-b border-slate-200">
                    {(data.campus?.logo_url || data.organization?.logo_url) && (
                        <img 
                            src={data.campus?.logo_url || data.organization?.logo_url} 
                            alt="Logo" 
                            className="h-12 mx-auto mb-2 object-contain"
                        />
                    )}
                    <h1 className="text-xl font-bold text-slate-900 mb-1">FEE RECEIPT</h1>
                    <p className="text-slate-600 font-semibold text-base">
                        {data.organization?.name || selectedOrganization?.name || 'SGC Education Management System'}
                    </p>
                    {data.campus?.name && (
                        <p className="text-slate-500 text-xs mt-0.5">Campus: {data.campus.name}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                    <div>
                        <p className="text-slate-500 mb-0.5">Receipt Number</p>
                        <p className="font-bold text-slate-900 text-sm mb-1">{data.receipt_number || `REC-${data.id}`}</p>
                        {data.voucher_number && (
                            <>
                                <p className="text-slate-500 mb-0.5">Voucher Number</p>
                                <p className="font-bold text-slate-900 text-sm">{data.voucher_number}</p>
                            </>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 mb-0.5">Date</p>
                        <p className="font-bold text-slate-900 text-sm">
                            {new Date(data.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100 print:bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 text-xs mb-2 border-b border-slate-200 pb-1 uppercase tracking-wide">Student Details</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div>
                            <span className="text-slate-500 block text-[11px]">Student Name:</span>
                            <span className="font-bold text-slate-900">{data.student?.first_name} {data.student?.last_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">Father / Guardian Name:</span>
                            <span className="font-bold text-slate-900">{data.student?.guardian_name || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">Roll Number:</span>
                            <span className="font-bold text-slate-900">{data.student?.roll_number || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">Admission Number:</span>
                            <span className="font-bold text-slate-900">{data.student?.admission_number || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">Program:</span>
                            <span className="font-bold text-slate-900">{data.student?.program?.name || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">Batch / Session:</span>
                            <span className="font-bold text-slate-900">{data.student?.academic_batch?.name || data.student?.intake_session || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">Class / Semester:</span>
                            <span className="font-bold text-slate-900">
                                {data.student?.academic_class?.name || data.student?.program_semester?.name || '-'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 text-xs">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="text-left py-2 font-bold text-slate-900">Description</th>
                                <th className="text-right py-2 font-bold text-slate-900">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="py-2.5">
                                    <p className="font-medium text-slate-900">Fee Payment</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Transaction ID: {data.transaction_id || 'N/A'}</p>
                                    {data.remarks && (
                                        <p className="text-[11px] text-slate-500 mt-0.5 italic">Remarks: {data.remarks}</p>
                                    )}
                                </td>
                                <td className="py-2.5 text-right font-medium text-slate-900">
                                    Rs. {Number(data.amount).toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr className="border-b border-slate-200">
                                <td className="py-2 text-right font-bold text-slate-900">Total Amount Received:</td>
                                <td className="py-2 text-right font-bold text-emerald-700 text-lg">
                                    Rs. {Number(data.amount).toLocaleString()}
                                </td>
                            </tr>
                            {data.remaining_balance !== undefined && (
                                <tr>
                                    <td className="py-1.5 text-right text-[11px] text-slate-500">Remaining Balance / Dues:</td>
                                    <td className={`py-1.5 text-right text-xs font-bold ${Number(data.remaining_balance) > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                                        Rs. {Number(data.remaining_balance).toLocaleString()}
                                    </td>
                                </tr>
                            )}
                        </tfoot>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 mt-4 text-xs">
                    <div>
                        <p className="text-slate-500 mb-0.5 text-[11px]">Payment Method</p>
                        <p className="font-medium text-slate-900">{data.payment_method}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 mb-0.5 text-[11px]">Deposited By / Collector</p>
                        <p className="font-medium text-slate-900">{data.receiver?.name || '-'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-10 pt-4 print:mt-10">
                    <div className="text-center">
                        <div className="border-b border-slate-400 w-40 mx-auto mb-1"></div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Student / Depositor Sign</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-slate-400 w-40 mx-auto mb-1"></div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Authorized Signatory & Stamp</p>
                    </div>
                </div>

                <div className="mt-6 text-center text-[10px] text-slate-400 print:mt-6">
                    <p>This is an official computer-generated receipt issued by {data.organization?.name || selectedOrganization?.name || 'SGC Education Management System'}.</p>
                </div>
            </div>

            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 5mm 8mm;
                    }
                    html, body {
                        height: 100%;
                        background: white !important;
                        font-size: 12px;
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
                    #receipt-content {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default FeePaymentReceipt;
