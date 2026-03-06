import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Package, AlertTriangle, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { DashboardSummary, RevenueTrend, TopProduct } from '../types';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [trend, setTrend] = useState<RevenueTrend[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = useAuthStore((s) => s.isAdmin());
    const { settings } = useSettingsStore();
    const currency = settings?.currency_symbol || 'GH₵';

    useEffect(() => {
        // Use allSettled so summary stats load even if admin-only chart endpoints return 403
        Promise.allSettled([
            api.get<DashboardSummary>('/analytics/dashboard'),
            api.get<RevenueTrend[]>('/analytics/revenue-trend?days=14'),
            api.get<TopProduct[]>('/analytics/top-products?limit=8'),
        ]).then(([s, t, tp]) => {
            if (s.status === 'fulfilled') setSummary(s.value.data);
            else toast.error('Failed to load dashboard summary');
            if (t.status === 'fulfilled') setTrend(t.value.data);
            if (tp.status === 'fulfilled') setTopProducts(tp.value.data);
        }).finally(() => setLoading(false));
    }, []);

    const fmt = (n: number) => `${currency} ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

    if (loading) return (
        <>
            <Topbar title="Dashboard" subtitle="Overview of your business performance" />
            <div className="page-body full-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        </>
    );

    return (
        <>
            <Topbar
                title="Dashboard"
                subtitle={new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                actions={<Link to="/pos" className="btn btn-primary"><ShoppingBag size={16} /> New Sale</Link>}
            />
            <div className="page-body">
                {/* Summary Stats */}
                <div className="stat-grid">
                    <div className="stat-card">
                        <div className="stat-header">
                            <div><div className="stat-label">Today's Revenue</div><div className="stat-value">{fmt(summary?.daily_revenue || 0)}</div></div>
                            <div className="stat-icon blue"><DollarSign size={20} /></div>
                        </div>
                        <div className="stat-trend">Sales today: {summary?.total_sales_today}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-header">
                            <div><div className="stat-label">This Week</div><div className="stat-value">{fmt(summary?.weekly_revenue || 0)}</div></div>
                            <div className="stat-icon green"><DollarSign size={20} /></div>
                        </div>
                        <div className="stat-trend">Weekly performance</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-header">
                            <div><div className="stat-label">This Month</div><div className="stat-value">{fmt(summary?.monthly_revenue || 0)}</div></div>
                            <div className="stat-icon blue"><DollarSign size={20} /></div>
                        </div>
                        <div className="stat-trend">Monthly performance</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-header">
                            <div><div className="stat-label">Total Products</div><div className="stat-value">{summary?.total_products}</div></div>
                            <div className="stat-icon green"><Package size={20} /></div>
                        </div>
                        <div className="stat-trend">Active in inventory</div>
                    </div>
                    {(summary?.low_stock_count || 0) > 0 && (
                        <div className="stat-card" style={{ borderColor: 'var(--warning)', background: 'rgba(245,158,11,0.05)' }}>
                            <div className="stat-header">
                                <div><div className="stat-label">Low Stock Alert</div><div className="stat-value text-warning">{summary?.low_stock_count}</div></div>
                                <div className="stat-icon yellow"><AlertTriangle size={20} /></div>
                            </div>
                            <div className="stat-trend"><Link to="/inventory?low_stock=true" className="text-warning">View low-stock products →</Link></div>
                        </div>
                    )}
                </div>

                {/* Charts Row — admin only */}
                {isAdmin ? (
                    <div className="grid-2 mb-6">
                        <div className="card card-lg">
                            <div className="section-title">Revenue (Last 14 Days)</div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                                        <XAxis dataKey="day" tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                        <YAxis tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ background: '#1f2937', border: '1px solid #30363d', borderRadius: 8 }}
                                            labelStyle={{ color: '#e6edf3' }}
                                            formatter={(v: number) => [`GH₵ ${v.toFixed(2)}`, 'Revenue']}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#rev)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card card-lg">
                            <div className="section-title">Top Selling Products</div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: '#6e7681', fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fill: '#8b949e', fontSize: 11 }} width={110} />
                                        <Tooltip
                                            contentStyle={{ background: '#1f2937', border: '1px solid #30363d', borderRadius: 8 }}
                                            formatter={(v: number) => [v, 'Units Sold']}
                                        />
                                        <Bar dataKey="total_sold" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--text-muted)' }}>
                        <BarChart2 size={28} style={{ flexShrink: 0 }} />
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Analytics available to admins</div>
                            <div>Revenue trends and top-product charts are visible to admin users. Contact your admin for detailed reports.</div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
