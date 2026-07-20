import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell,
    RadialBarChart, RadialBar, Legend,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Button from '../UI/Button';
import FeeAnalyticsChart from './FeeAnalyticsChart';

// ─── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();

const GENDER_COLORS  = { Male: '#6366f1', Female: '#ec4899', Other: '#8b5cf6' };
const INTAKE_COLORS  = { Fall: '#f59e0b', Spring: '#10b981' };
const PROG_PALETTE   = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg text-sm">
            <p className="font-bold text-slate-700 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

// ─── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, gradient, icon, trend, onClick }) {
    return (
        <div 
            onClick={onClick}
            className={`rounded-2xl p-6 text-white ${gradient} shadow-lg relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200' : ''}`}
        >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-2 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />
            <div className="relative z-10">
                <div className="flex items-start justify-between">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                        </svg>
                    </div>
                    {trend !== undefined && (
                        <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 font-bold">
                            {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mt-4">{label}</p>
                <p className="text-3xl font-extrabold mt-1">{value}</p>
                {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Card Wrapper ────────────────────────────────────────────────────────────────
function ChartCard({ title, sub, children, action, className = "" }) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${className}`}>
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

const Skeleton = ({ h = 'h-40' }) => (
    <div className={`animate-pulse bg-slate-100 rounded-xl ${h}`} />
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
    const navigate = useNavigate();
    const { user, selectedOrganization, selectedCampus } = useAuth();
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [voucherMonth, setVoucherMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [feeIntakeSession, setFeeIntakeSession] = useState('');
    const [feeBatchId, setFeeBatchId] = useState('');

    useEffect(() => {
        setLoading(true);
        axios.get('/api/dashboard/stats', { params: { voucher_month: voucherMonth, fee_intake_session: feeIntakeSession, fee_batch_id: feeBatchId } })
            .then(r => setData(r.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedOrganization, selectedCampus, voucherMonth, feeIntakeSession, feeBatchId]);

    const counts   = data?.counts ?? {};
    const monthly  = data?.monthly_admissions ?? [];
    const byProg   = data?.students_by_program ?? [];
    const gender   = data?.gender_breakdown ?? {};
    const intake   = data?.intake_breakdown ?? {};

    // Pie data
    const genderPie = Object.entries(gender).map(([name, value]) => ({ name, value }));
    const intakePie = Object.entries(intake).map(([name, value]) => ({ name, value }));

    // Enrollment ratio for radial bar
    const total    = counts.students || 1;
    const enrolled = counts.enrolled ?? 0;
    const pending  = counts.pending ?? 0;
    const enrollPct = Math.round((enrolled / total) * 100);

    const radialData = [
        { name: 'Enrolled', value: enrollPct,       fill: '#10b981' },
        { name: 'Pending',  value: Math.round((pending / total) * 100), fill: '#f59e0b' },
    ];

    const statCards = [
        {
            label: 'Total Students',
            value: fmt(counts.students),
            sub: `${fmt(enrolled)} enrolled · ${fmt(pending)} pending`,
            gradient: 'bg-gradient-to-br from-indigo-500 to-violet-600',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
            onClick: () => navigate('/admissions')
        },
        {
            label: 'Promoted',
            value: fmt(counts.promoted),
            sub: 'Advanced to next semester',
            gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-100',
            icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            onClick: () => navigate('/admissions?status=Promoted')
        },
        {
            label: 'Enrolled',
            value: fmt(counts.enrolled),
            sub: 'Currently active students',
            gradient: 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-blue-100',
            icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
            onClick: () => navigate('/admissions?status=Enrolled')
        },
        {
            label: 'Lifecycle Losses',
            value: fmt((counts.struck_off || 0) + (counts.passed_out || 0)),
            sub: `${fmt(counts.struck_off)} Struck Off · ${fmt(counts.passed_out)} Graduated`,
            gradient: 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-200',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            onClick: () => navigate('/admissions?status=Losses')
        },
    ];

    const [voucherYear, voucherM] = voucherMonth.split('-');
    
    const voucherCards = [
        {
            label: 'Total Vouchers',
            value: fmt(counts.vouchers_total),
            sub: 'All issued fee vouchers',
            gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-100',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            onClick: () => navigate(`/fees/vouchers-list?month=${parseInt(voucherM)}&year=${voucherYear}`)
        },
        {
            label: 'Paid Vouchers',
            value: fmt(counts.vouchers_paid),
            sub: 'Fully paid by students',
            gradient: 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-100',
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            onClick: () => navigate(`/fees/vouchers-list?month=${parseInt(voucherM)}&year=${voucherYear}&status=paid`)
        },
        {
            label: 'Unpaid Vouchers',
            value: fmt(counts.vouchers_unpaid),
            sub: 'Fully unpaid vouchers',
            gradient: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-100',
            icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            onClick: () => navigate(`/fees/vouchers-list?month=${parseInt(voucherM)}&year=${voucherYear}&status=unpaid`)
        },
        {
            label: 'Carried Fwd Vouchers',
            value: fmt(counts.vouchers_carried_forward),
            sub: 'Vouchers rolled over as arrears',
            gradient: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-100',
            icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
            onClick: () => navigate(`/fees/vouchers-list?month=${parseInt(voucherM)}&year=${voucherYear}&status=carried_forward`)
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Here's what's happening at your institution today.</p>
                </div>
                <div className="flex gap-3">
                    {data?.debug && counts.students === 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 font-mono">
                            DEBUG: Head: {data.debug.campus_id_header || 'None'} | 
                            User: {data.debug.user_id || 'None'} | 
                            Unscoped: {data.debug.unscoped_students}
                        </div>
                    )}
                    <Button onClick={() => navigate('/new-admission')}>+ New Admission</Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {loading
                    ? Array(4).fill(0).map((_, i) => <div key={i} className="animate-pulse h-36 bg-slate-100 rounded-2xl" />)
                    : statCards.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Voucher Cards */}
            <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Financial Overview</h2>
                    <div className="flex items-center gap-2">
                        <label htmlFor="voucher_month" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Billing Month</label>
                        <input 
                            id="voucher_month"
                            type="month"
                            value={voucherMonth}
                            onChange={(e) => setVoucherMonth(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                        {voucherMonth !== new Date().toISOString().slice(0, 7) && (
                            <button 
                                onClick={() => setVoucherMonth(new Date().toISOString().slice(0, 7))}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4 ml-1"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {loading
                        ? Array(4).fill(0).map((_, i) => <div key={i} className="animate-pulse h-36 bg-slate-100 rounded-2xl" />)
                        : voucherCards.map(s => <StatCard key={s.label} {...s} />)}
                </div>
            </div>

            {/* Fee Analytics Chart */}
            <div className={`mt-8 mb-8 transition-opacity duration-300 ${loading && data ? 'opacity-50 pointer-events-none' : ''}`}>
                <FeeAnalyticsChart 
                    data={data?.fee_analytics} 
                    intakeSessions={Object.keys(intake)} 
                    feeIntakeSession={feeIntakeSession} 
                    setFeeIntakeSession={setFeeIntakeSession} 
                    academicBatches={data?.academic_batches}
                    feeBatchId={feeBatchId}
                    setFeeBatchId={setFeeBatchId}
                />
            </div>

            {/* Row 2: Area Chart (Monthly) + Enrollment Radial */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <ChartCard
                    title="Monthly Admissions Trend"
                    sub={`${new Date().getFullYear()} — all campuses`}
                    action={<span className="text-2xl font-extrabold text-indigo-600">{fmt(counts.students)}</span>}
                    className="lg:col-span-2"
                >
                    <div className="lg:col-span-2">
                        {loading ? <Skeleton h="h-56" /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="total" name="Admissions" stroke="#6366f1" strokeWidth={2.5} fill="url(#admGrad)" dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </ChartCard>

                {/* Student Status Distribution Pie */}
                <ChartCard title="Student Life Cycle" sub="Current status distribution">
                    {loading ? <Skeleton h="h-56" /> : (
                        <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie 
                                        data={Object.entries(data?.status_breakdown || {}).map(([name, value]) => ({ name, value }))} 
                                        cx="50%" cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={85} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                    >
                                        {Object.keys(data?.status_breakdown || {}).map((name, i) => (
                                            <Cell 
                                                key={i} 
                                                fill={
                                                    name === 'Enrolled' ? '#10b981' : 
                                                    name === 'Promoted' ? '#6366f1' : 
                                                    name === 'Transferred' ? '#0ea5e9' : 
                                                    name === 'Struck Off' ? '#ef4444' : 
                                                    name === 'Passed Out' ? '#64748b' : 
                                                    '#f59e0b'
                                                } 
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [fmt(v), n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-4 px-2">
                                {Object.entries(data?.status_breakdown || {}).map(([name, value]) => (
                                    <div key={name} className="flex items-center gap-2">
                                        <div 
                                            className="w-2.5 h-2.5 rounded-full" 
                                            style={{ background: 
                                                name === 'Enrolled' ? '#10b981' : 
                                                name === 'Promoted' ? '#6366f1' : 
                                                name === 'Transferred' ? '#0ea5e9' : 
                                                name === 'Struck Off' ? '#ef4444' : 
                                                name === 'Passed Out' ? '#64748b' : 
                                                '#f59e0b' 
                                            }} 
                                        />
                                        <span className="text-[11px] font-bold text-slate-600 truncate">{name} ({fmt(value)})</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </ChartCard>
            </div>

            {/* Row 3: Bar chart (programs) + Pie (gender) + Pie (intake) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Students by Program — Horizontal Bar */}
                <div className="lg:col-span-2">
                    <ChartCard title="Students by Program" sub="Top enrolled programs">
                        {loading ? <Skeleton h="h-56" /> : byProg.length === 0 ? (
                            <p className="text-sm text-slate-400 py-10 text-center">No data yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={byProg} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={110} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total" name="Students" radius={[0, 6, 6, 0]}>
                                        {byProg.map((_, i) => (
                                            <Cell key={i} fill={PROG_PALETTE[i % PROG_PALETTE.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </div>

                {/* Gender Pie */}
                <ChartCard title="Gender Distribution">
                    {loading ? <Skeleton h="h-56" /> : genderPie.length === 0 ? (
                        <p className="text-sm text-slate-400 py-10 text-center">No data yet.</p>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={genderPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                                        {genderPie.map((e, i) => (
                                            <Cell key={i} fill={GENDER_COLORS[e.name] ?? '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [fmt(v), n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                                {genderPie.map(e => (
                                    <div key={e.name} className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full" style={{ background: GENDER_COLORS[e.name] ?? '#94a3b8' }} />
                                        <span className="text-xs font-semibold text-slate-600">{e.name} ({fmt(e.value)})</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </ChartCard>
            </div>

            {/* Row 4: Intake Pie + Recent admissions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Intake Pie */}
                <ChartCard title="Intake Session Split" sub="Fall vs Spring">
                    {loading ? <Skeleton h="h-56" /> : intakePie.length === 0 ? (
                        <p className="text-sm text-slate-400 py-10 text-center">No data yet.</p>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={intakePie} cx="50%" cy="50%" outerRadius={75} paddingAngle={4} dataKey="value">
                                        {intakePie.map((e, i) => (
                                            <Cell key={i} fill={INTAKE_COLORS[e.name] ?? '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [fmt(v), n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-6 mt-2">
                                {intakePie.map(e => (
                                    <div key={e.name} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ background: INTAKE_COLORS[e.name] ?? '#94a3b8' }} />
                                        <span className="text-xs font-semibold text-slate-600">{e.name} ({fmt(e.value)})</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </ChartCard>

                {/* Recent admissions */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Recent Admissions</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Latest 8 students</p>
                        </div>
                        <button onClick={() => navigate('/admissions')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                            View all →
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? Array(5).fill(0).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                <div className="w-9 h-9 rounded-full bg-slate-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                                    <div className="h-2 bg-slate-100 rounded w-1/3" />
                                </div>
                            </div>
                        )) : (data?.recent_admissions ?? []).length === 0 ? (
                            <p className="px-6 py-10 text-sm text-slate-400 text-center">No admissions yet.</p>
                        ) : (data?.recent_admissions ?? []).map((s) => {
                            const pic = s.student_picture ? `/storage/${s.student_picture}` : null;
                            const statusCls = s.status === 'Enrolled'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700';
                            return (
                                <div key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                                    {pic ? (
                                        <img src={pic} alt={s.first_name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0 select-none">
                                            {s.first_name?.[0]}{s.last_name?.[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-sm leading-none truncate">{s.first_name} {s.last_name}</p>
                                        <p className="text-xs text-slate-500 mt-1 truncate">
                                            {s.admission_number} · {s.program?.name ?? '—'} · {s.intake_session ?? '—'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusCls}`}>{s.status ?? 'Pending'}</span>
                                        <span className="text-xs text-slate-400">{s.campus?.name ?? '—'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
