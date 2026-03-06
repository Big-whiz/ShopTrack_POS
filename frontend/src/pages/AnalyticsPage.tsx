import { useEffect, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { RevenueTrend, TopProduct, ProfitMonthly } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalyticsPage() {
    const [trend, setTrend] = useState<RevenueTrend[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [profit, setProfit] = useState<ProfitMonthly[]>([]);
    const [payMethods, setPayMethods] = useState<{ method: string; count: number; total: number }[]>([]);
    const [trendDays, setTrendDays] = useState(30);
    const [loading, setLoading] = useState(true);

    const { settings } = useSettingsStore();
    const currency = settings?.currency_symbol || 'GH₵';

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<RevenueTrend[]>(`/analytics/revenue-trend?days=${trendDays}`),
            api.get<TopProduct[]>('/analytics/top-products?limit=10'),
            api.get<ProfitMonthly[]>('/analytics/profit-analysis?months=6'),
            api.get('/analytics/payment-methods'),
        ])
            .then(([t, tp, p, pm]) => {
                setTrend(t.data);
                setTopProducts(tp.data);
                setProfit(p.data.reverse());
                setPayMethods(pm.data);
            })
            .catch(() => toast.error('Failed to load analytics'))
            .finally(() => setLoading(false));
    }, [trendDays]);

    const handleExportCSV = () => {
        if (!profit.length) {
            toast.error('No analytics data to export');
            return;
        }

        const csvData = profit.map(p => ({
            'Month': p.month,
            'Total Revenue': Number(p.revenue).toFixed(2),
            'Total Cost': Number(p.cost).toFixed(2),
            'Net Profit': Number(p.profit).toFixed(2)
        }));

        const csvString = Papa.unparse(csvData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ShopTrack_Profit_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Profit Report exported to CSV');
    };

    const fmt = (n: number) => `${currency} ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

    if (loading) return (
        <>
            <Topbar title="Analytics & Reports" subtitle="Performance insights" />
            <div className="page-body full-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        </>
    );

    return (
        <>
            <Topbar
                title="Analytics & Reports"
                subtitle="Business performance insights"
                actions={
                    <div className="flex gap-2">
                        <select value={trendDays} onChange={(e) => setTrendDays(Number(e.target.value))} style={{ width: 'auto' }}>
                            <option value={7}>Last 7 days</option>
                            <option value={14}>Last 14 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                        <button className="btn btn-secondary" onClick={handleExportCSV} disabled={profit.length === 0}>
                            <Download size={16} /> Export Profit CSV
                        </button>
                    </div>
                }
            />
            <div className="page-body">

                {/* Revenue Trend */}
                <div className="card card-lg mb-6">
                    <div className="section-title">Revenue Trend</div>
                    <div className="chart-container" style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                                <XAxis dataKey="day" tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #30363d', borderRadius: 8 }} formatter={(v: number) => [fmt(v), 'Revenue']} />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid-2 mb-6">
                    {/* Profit Analysis */}
                    <div className="card card-lg">
                        <div className="section-title">Monthly Profit Analysis (6 Months)</div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={profit} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                                    <XAxis dataKey="month" tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={(v) => v.slice(0, 7)} />
                                    <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #30363d', borderRadius: 8 }} formatter={(v: number, name: string) => [fmt(v), name.charAt(0).toUpperCase() + name.slice(1)]} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Payment Methods Pie */}
                    <div className="card card-lg">
                        <div className="section-title">Sales by Payment Method</div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                {payMethods.length > 0 ? (
                                    <PieChart>
                                        <Pie data={payMethods} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={90} label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                            {payMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => [fmt(v), 'Revenue']} contentStyle={{ background: '#1f2937', border: '1px solid #30363d', borderRadius: 8 }} />
                                    </PieChart>
                                ) : (
                                    <div className="full-center"><span className="text-muted">No sales data yet</span></div>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top Products Table */}
                <div className="card">
                    <div className="section-title">Top Selling Products</div>
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>#</th><th>Product</th><th>Units Sold</th><th>Share</th></tr></thead>
                            <tbody>
                                {topProducts.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32 }} className="text-muted">No sales data yet</td></tr>
                                ) : (() => {
                                    const maxSold = Math.max(...topProducts.map((p) => p.total_sold));
                                    return topProducts.map((p, i) => (
                                        <tr key={p.name}>
                                            <td className="text-muted">{i + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                                            <td>{p.total_sold} units</td>
                                            <td style={{ width: 180 }}>
                                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 4, height: 8 }}>
                                                    <div style={{ width: `${(p.total_sold / maxSold) * 100}%`, background: COLORS[i % COLORS.length], height: '100%', borderRadius: 4, transition: 'width 0.5s ease' }} />
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
