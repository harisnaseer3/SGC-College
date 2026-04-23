import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const FeeVoucher = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVoucherData = async () => {
            try {
                // Pass along the query parameters (month/year) if present
                const response = await axios.get(`/api/student-fees/voucher/${studentId}${location.search}`);
                setData(response.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch voucher data');
            } finally {
                setLoading(false);
            }
        };

        fetchVoucherData();
    }, [studentId, location.search]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center">Loading voucher...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!data) return null;

    return (
        <div className="bg-white min-h-screen">
            {/* Action Bar - Hidden during print */}
            <div className="print:hidden p-4 bg-slate-800 text-white flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        ← Back
                    </button>
                    <h1 className="font-bold">Fee Voucher - {data.student.full_name}</h1>
                </div>
                <button 
                    onClick={handlePrint}
                    className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-bold transition-all shadow-lg"
                >
                    Print Voucher
                </button>
            </div>

            {/* Voucher Container */}
            <div className="voucher-container max-w-7xl mx-auto p-4 flex gap-4 overflow-x-auto">
                {data.copy_names.map((copyName, index) => (
                    <VoucherCopy key={index} copyName={copyName} data={data} />
                ))}
            </div>

            <style>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 0.5cm;
                    }
                    body {
                        background: white;
                    }
                    .voucher-container {
                        padding: 0 !important;
                        gap: 0 !important;
                        display: flex !important;
                        flex-direction: row !important;
                        width: 100% !important;
                    }
                    .voucher-copy {
                        width: 33.33% !important;
                        border: 1px solid #000 !important;
                        height: auto !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }

                .voucher-copy {
                    flex: 1;
                    min-width: 400px;
                    border: 1px solid #000;
                    padding: 10px;
                    font-family: Arial, sans-serif;
                    background: white;
                }

                .v-header-top {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 2px solid #000;
                    padding-bottom: 2px;
                    font-size: 11px;
                    font-weight: bold;
                }

                .v-main-header {
                    display: flex;
                    align-items: center;
                    padding: 8px 0;
                    gap: 10px;
                }

                .v-logo {
                    width: 50px;
                    height: 50px;
                    object-fit: contain;
                }

                .v-institution-details {
                    flex: 1;
                    text-align: center;
                }

                .v-institution-details h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: bold;
                    color: #000;
                }

                .v-institution-details p {
                    margin: 0;
                    font-size: 12px;
                }

                .v-info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr 1fr;
                    border: 1px solid #000;
                    font-size: 11px;
                }

                .v-info-grid div {
                    border: 0.5px solid #000;
                    padding: 4px;
                }

                .v-label { font-weight: normal; }
                .v-value { font-weight: bold; }

                .v-student-header {
                    text-align: center;
                    padding: 10px 0;
                    border-bottom: 1px solid #000;
                }

                .v-student-name {
                    font-size: 14px;
                    font-weight: bold;
                    text-decoration: underline;
                }

                .v-class-box {
                    font-weight: bold;
                    font-size: 12px;
                    padding: 4px;
                    border: 1px solid #000;
                    margin: 5px 0;
                }

                .v-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 5px;
                }

                .v-table th, .v-table td {
                    border: 1px solid #000;
                    padding: 4px;
                    font-size: 11px;
                    text-align: left;
                }

                .v-table th { background: #f0f0f0; }

                .v-summary-row {
                    display: flex;
                    justify-content: space-between;
                    border: 1px solid #000;
                    border-top: none;
                    padding: 3px 5px;
                    font-size: 11px;
                }

                .v-summary-row.bold { font-weight: bold; background: #f8f8f8; }

                .v-note {
                    font-size: 10px;
                    margin-top: 10px;
                    color: #333;
                }

                .v-bank-info {
                    text-align: center;
                    font-weight: bold;
                    font-size: 10px;
                    margin-top: 10px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                }

                .v-barcode {
                    text-align: center;
                    font-size: 24px;
                    margin-top: 8px;
                    letter-spacing: 2px;
                }
            `}</style>
        </div>
    );
};

const VoucherCopy = ({ copyName, data }) => {
    return (
        <div className="voucher-copy">
            <div className="v-header-top">
                <span>Voucher#: {data.academic.voucher_number}</span>
                <span>{copyName}</span>
            </div>

            <div className="v-main-header">
                <img src={data.institution.logo_url} className="v-logo" alt="Logo" />
                <div className="v-institution-details">
                    <h2>{data.institution.name}</h2>
                    <p>{data.institution.location}</p>
                </div>
            </div>

            <div className="v-info-grid">
                <div className="v-label">Voucher No:</div><div className="v-value">{data.academic.voucher_number}</div>
                <div className="v-label">Roll No:</div><div className="v-value">{data.academic.roll_no}</div>
                
                <div className="v-label">Fee Month:</div><div className="v-value">{data.academic.fee_month}</div>
                <div className="v-label">Valid Date:</div><div className="v-value">{data.academic.valid_date}</div>
                
                <div className="v-label">Issue Date:</div><div className="v-value">{data.academic.issue_date}</div>
                <div className="v-label">Due Date:</div><div className="v-value">{data.academic.due_date}</div>
                
                <div className="v-label">Student Id:</div><div className="v-value">{data.academic.student_id}</div>
                <div className="v-label">Adm/Reg #:</div><div className="v-value">{data.academic.adm_reg_no}</div>
            </div>

            <div className="v-student-header">
                <div className="v-student-name">
                    {data.student.full_name} {data.student.parent_relation} {data.student.guardian_name}
                </div>
            </div>

            <div className="v-class-box">
                Class: {data.student.class}
            </div>

            <table className="v-table">
                <thead>
                    <tr>
                        <th style={{ width: '15%' }}>Sr No.</th>
                        <th style={{ width: '60%' }}>Head Name</th>
                        <th style={{ width: '25%' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {data.fee_items.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.sr_no}</td>
                            <td>{item.head}</td>
                            <td>{item.amount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="v-summary-row">
                <span>Arrears:</span>
                <span className="v-value">{data.summary.arrears}</span>
            </div>
            <div className="v-summary-row">
                <span>Previous Fee Fine:</span>
                <span className="v-value">{data.summary.previous_fine}</span>
            </div>
            <div className="v-summary-row bold">
                <span>Payable within due date:</span>
                <span className="v-value">{data.summary.payable_within_due_date}</span>
            </div>
            <div className="v-summary-row">
                <span>Late fee fine:</span>
                <span className="v-value">{data.summary.late_fee_fine}</span>
            </div>
            <div className="v-summary-row">
                <span>Absent Fine:</span>
                <span className="v-value">{data.summary.absent_fine}</span>
            </div>
            <div className="v-summary-row bold">
                <span>Payable after due date:</span>
                <span className="v-value">{data.summary.payable_after_due_date}</span>
            </div>

            <div className="v-note">
                <strong>Note:</strong><br/>
                Payment Terms<br/>
                A fine of Rs. 200 will be charged if the fee is not paid by the due date.<br/>
                A fine of Rs. 500 will be applicable if the payment remains unpaid in the following month.
            </div>

            <div className="v-bank-info">
                {data.bank.info}
            </div>

            <div className="v-barcode">
                ||||||||||||||||||||||||||||||||||||||||||
            </div>
        </div>
    );
};

export default FeeVoucher;
