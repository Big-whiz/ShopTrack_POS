import { useEffect, useState } from 'react';
import { Eye, Search, Download } from 'lucide-react';
import Papa from 'papaparse';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { SaleListItem, Sale } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import toast from 'react-hot-toast';

export default function SalesPage() {
    const [sales, setSales] = useState<SaleListItem[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [viewing, setViewing] = useState<Sale | null>(null);
    const [loading, setLoading] = useState(false);

    const { settings } = useSettingsStore();
    const currency = settings?.currency_symbol || 'GH₵';

    const fetchSales = () => {
        setLoading(true);
        const params: Record<string, string> = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        api.get<SaleListItem[]>('/sales', { params })
            .then((r) => setSales(r.data as any))
            .catch(() => toast.error('Failed to load sales'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchSales(); }, []);

    const viewSale = async (id: number) => {
        try {
            const { data } = await api.get<Sale>(`/sales/${id}`);
            setViewing(data);
        } catch { toast.error('Failed to load sale details'); }
    };

    const methodBadge = (m: string) => {
        if (m === 'Cash') return 'badge-success';
        if (m === 'Mobile Money') return 'badge-blue';
        if (m === 'Split') return 'badge-warning';
        return 'badge-muted';
    };

    const totalRevenue = sales.reduce((s, x) => s + Number(x.total_amount), 0);

    const handleExportCSV = () => {
        if (!sales.length) {
            toast.error('No data to export');
            return;
        }

        const csvData = sales.map(s => ({
            'Receipt No': s.id,
            'Date': new Date(s.sale_date).toLocaleString(),
            'Cashier': s.cashier,
            'Payment Method': s.payment_method,
            'Total Amount': Number(s.total_amount).toFixed(2)
        }));

        const csvString = Papa.unparse(csvData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ShopTrack_Sales_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Sales exported to CSV');
    };

    return (
        <>
            <Topbar
                title="Sales History"
                subtitle={`${sales.length} transactions · ${currency} ${totalRevenue.toFixed(2)} total`}
                actions={
                    <button className="btn btn-secondary" onClick={handleExportCSV} disabled={sales.length === 0}>
                        <Download size={16} /> Export CSV
                    </button>
                }
            />
            <div className="page-body">
                {/* Filters */}
                <div className="card mb-4">
                    <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>From</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>To</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <button className="btn btn-primary" onClick={fetchSales}><Search size={14} /> Filter</button>
                        <button className="btn btn-soft" onClick={() => { setStartDate(''); setEndDate(''); setTimeout(fetchSales, 0); }}>Reset</button>
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>#</th><th>Date & Time</th><th>Cashier</th><th>Items</th><th>Payment</th><th>Total</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                                ) : sales.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }} className="text-muted">No sales found for this period</td></tr>
                                ) : sales.map((s) => (
                                    <tr key={s.id}>
                                        <td><span className="text-muted" style={{ fontFamily: 'monospace' }}>#{s.id}</span></td>
                                        <td>{new Date(s.sale_date).toLocaleString('en-GH')}</td>
                                        <td>{(s as any).cashier}</td>
                                        <td><span className="badge badge-muted">{(s as any).item_count} item{(s as any).item_count !== 1 ? 's' : ''}</span></td>
                                        <td><span className={`badge ${methodBadge(s.payment_method)}`}>{s.payment_method}</span></td>
                                        <td style={{ fontWeight: 700 }}>GH₵ {Number(s.total_amount).toFixed(2)}</td>
                                        <td><button className="btn-icon" onClick={() => viewSale(s.id)} title="View receipt"><Eye size={14} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            {viewing && (
                <div className="modal-overlay" onClick={() => setViewing(null)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Sale Receipt #{viewing.id}</h2>
                            <button className="btn-icon" onClick={() => setViewing(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div><div className="text-muted" style={{ fontSize: '0.75rem' }}>Date</div><div>{new Date(viewing.sale_date).toLocaleString('en-GH')}</div></div>
                                <div><div className="text-muted" style={{ fontSize: '0.75rem' }}>Payment</div><span className={`badge ${methodBadge(viewing.payment_method)}`}>{viewing.payment_method}</span></div>
                            </div>
                            {/* MoMo Transaction ID */}
                            {(viewing as any).momo_transaction_id && (
                                <div style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: '0.85rem' }}>
                                    <span className="text-muted">MoMo Ref: </span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{(viewing as any).momo_transaction_id}</span>
                                </div>
                            )}
                            {/* Split amounts */}
                            {viewing.payment_method === 'Split' && (viewing as any).cash_amount != null && (
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 6, padding: '8px 10px', fontSize: '0.8rem', textAlign: 'center' }}>
                                        <div className="text-muted">Cash</div>
                                        <div style={{ fontWeight: 700 }}>GH₵ {Number((viewing as any).cash_amount).toFixed(2)}</div>
                                    </div>
                                    <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 6, padding: '8px 10px', fontSize: '0.8rem', textAlign: 'center' }}>
                                        <div className="text-muted">Mobile Money</div>
                                        <div style={{ fontWeight: 700 }}>GH₵ {Number((viewing as any).momo_amount).toFixed(2)}</div>
                                    </div>
                                </div>
                            )}
                            <div className="divider" />
                            <table>
                                <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Sub</th></tr></thead>
                                <tbody>
                                    {viewing.items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.product_name}</td>
                                            <td>{item.quantity}</td>
                                            <td>{currency} {Number(item.unit_price).toFixed(2)}</td>
                                            <td style={{ fontWeight: 600 }}>{currency} {Number(item.subtotal).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="divider" />
                            {viewing.tax_amount > 0 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <span>Subtotal</span>
                                        <span style={{ color: 'var(--text)' }}>{currency} {Number(viewing.total_amount - viewing.tax_amount).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <span>Tax</span>
                                        <span style={{ color: 'var(--text)' }}>{currency} {Number(viewing.tax_amount).toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>TOTAL</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>GH₵ {Number(viewing.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
