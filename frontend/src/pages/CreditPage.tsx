import { useEffect, useState, useCallback } from 'react';
import {
    Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle,
    CreditCard, Clock, AlertTriangle, Edit2, X,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { queueTransaction } from '../services/syncQueue';
import { Product, Credit, CreditSummary } from '../types';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { ReceiptPrinter, ReceiptProps } from '../components/ReceiptPrinter';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';

type Tab = 'add' | 'records';

export default function CreditPage() {
    const [tab, setTab] = useState<Tab>('add');

    // ── Add Credit (POS-style) state ───────────────────────────────
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');

    // Credit cart is now managed by useCartStore
    const {
        creditCart, addToCreditCart, updateCreditQty, removeFromCreditCart, clearCreditCart
    } = useCartStore();

    const [creditorName, setCreditorName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [successCredit, setSuccessCredit] = useState<{ id: number; name: string; total: number } | null>(null);
    const [cartCollapsed, setCartCollapsed] = useState(false);

    const { user } = useAuthStore();
    const { settings } = useSettingsStore();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [receiptData, setReceiptData] = useState<ReceiptProps | null>(null);

    const currency = settings?.currency_symbol || 'GH₵';

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: 'Credit_Receipt',
    });

    useEffect(() => {
        if (window.innerWidth <= 768) setCartCollapsed(true);
    }, []);
    // ── Records state ─────────────────────────────────────────────
    const [credits, setCredits] = useState<Credit[]>([]);
    const [summary, setSummary] = useState<CreditSummary | null>(null);
    const [filter, setFilter] = useState<'unpaid' | 'all' | 'paid'>('unpaid');
    const [recSearch, setRecSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [editCredit, setEditCredit] = useState<Credit | null>(null);
    const [editForm, setEditForm] = useState({ creditor_name: '', items_description: '', total_amount: '', due_date: '', notes: '' });
    const [showEditModal, setShowEditModal] = useState(false);

    // Load products for the browser
    useEffect(() => {
        api.get<Product[]>('/products', { params: search ? { search } : {} })
            .then((r) => setProducts(r.data.filter((p) => p.current_stock > 0)))
            .catch(() => toast.error('Failed to load products'));
    }, [search]);

    // Load credits + summary
    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filter === 'unpaid') params.is_paid = false;
            if (filter === 'paid') params.is_paid = true;
            if (recSearch) params.search = recSearch;
            const [credRes, sumRes] = await Promise.all([
                api.get<Credit[]>('/credits', { params }),
                api.get<CreditSummary>('/credits/summary'),
            ]);
            setCredits(credRes.data);
            setSummary(sumRes.data);
        } catch { toast.error('Failed to load records'); }
        finally { setLoading(false); }
    }, [filter, recSearch]);

    useEffect(() => { if (tab === 'records') fetchRecords(); }, [tab, fetchRecords]);

    // ── Cart helpers ──────────────────────────────────────────────
    const addToCart = (product: Product) => {
        const existing = creditCart.find((c) => c.product.id === product.id);
        if (existing && existing.quantity >= product.current_stock) {
            toast.error(`Only ${product.current_stock} in stock`);
            return;
        }
        addToCreditCart(product);
    };

    const updateQty = (id: number, delta: number) => updateCreditQty(id, delta);
    const removeItem = (id: number) => removeFromCreditCart(id);

    const subtotal = creditCart.reduce((sum, c) => sum + Number(c.product.selling_price) * c.quantity, 0);
    const taxRate = parseFloat(settings?.tax_rate_percent as any) || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    // ── Record credit ─────────────────────────────────────────────
    const handleRecord = async () => {
        if (creditCart.length === 0) { toast.error('Add at least one item'); return; }
        if (!creditorName.trim()) { toast.error('Enter creditor name'); return; }
        setSaving(true);
        try {
            const itemsDesc = creditCart
                .map((c) => `${c.quantity}x ${c.product.name} @ ${currency}${Number(c.product.selling_price).toFixed(2)}`)
                .join('\n');
            const payload = {
                creditor_name: creditorName.trim(),
                items_description: itemsDesc,
                total_amount: parseFloat(total.toFixed(2)),
                tax_amount: parseFloat(taxAmount.toFixed(2)),
                due_date: dueDate || null,
                notes: notes.trim() || null,
            };
            const { data } = await api.post('/credits', payload);

            const currentReceiptData: ReceiptProps = {
                saleId: data.id,
                date: new Date(),
                items: creditCart.map(c => ({
                    id: c.product.id,
                    name: c.product.name,
                    quantity: c.quantity,
                    unitPrice: Number(c.product.selling_price),
                    subtotal: Number(c.product.selling_price) * c.quantity
                })),
                subtotal: subtotal,
                taxAmount: taxAmount,
                total: total,
                paymentMethod: 'Credit',
                storeName: settings?.store_name || 'ShopTrack POS',
                currencySymbol: currency,
                cashierName: user?.full_name || user?.username,
                isCredit: true,
                creditorName: creditorName.trim(),
                dueDate: dueDate ? new Date(dueDate) : undefined,
                footerMsg: settings?.receipt_footer_msg,
            };
            setReceiptData(currentReceiptData);

            setSuccessCredit({ id: data.id, name: creditorName.trim(), total });
            clearCreditCart();
            setCreditorName('');
            setDueDate('');
            setNotes('');

            setTimeout(() => { if (handlePrint && settings?.enable_receipt_print !== false) handlePrint(); }, 100);

        } catch (err: any) {
            if (!err.response || err.message === 'Network Error') {
                const itemsDesc = creditCart.map((c) => `${c.quantity}x ${c.product.name} @ ${currency}${Number(c.product.selling_price).toFixed(2)}`).join('\n');
                await queueTransaction('credit', {
                    creditor_name: creditorName.trim(),
                    items_description: itemsDesc,
                    total_amount: parseFloat(total.toFixed(2)),
                    tax_amount: parseFloat(taxAmount.toFixed(2)),
                    due_date: dueDate || null,
                    notes: notes.trim() || null,
                });
                toast.success('Offline mode: Credit saved locally and will sync when online ✨', { duration: 4000 });

                const offlineId = Date.now();
                const currentReceiptData: ReceiptProps = {
                    saleId: offlineId,
                    date: new Date(),
                    items: creditCart.map(c => ({
                        id: c.product.id,
                        name: c.product.name,
                        quantity: c.quantity,
                        unitPrice: Number(c.product.selling_price),
                        subtotal: Number(c.product.selling_price) * c.quantity
                    })),
                    subtotal: subtotal,
                    taxAmount: taxAmount,
                    total: total,
                    paymentMethod: 'Credit',
                    storeName: settings?.store_name || 'ShopTrack POS',
                    currencySymbol: currency,
                    cashierName: user?.full_name || user?.username,
                    isCredit: true,
                    creditorName: creditorName.trim(),
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                    footerMsg: settings?.receipt_footer_msg,
                };
                setReceiptData(currentReceiptData);

                setSuccessCredit({ id: offlineId, name: creditorName.trim(), total });
                clearCreditCart();
                setCreditorName('');
                setDueDate('');
                setNotes('');

                setTimeout(() => { if (handlePrint && settings?.enable_receipt_print !== false) handlePrint(); }, 100);
            } else {
                toast.error(err.response?.data?.detail || 'Failed to record credit');
            }
        } finally { setSaving(false); }
    };

    // ── Records actions ───────────────────────────────────────────
    const markPaid = async (c: Credit) => {
        try {
            await api.put(`/credits/${c.id}`, { is_paid: !c.is_paid });
            toast.success(c.is_paid ? 'Marked unpaid' : 'Marked as paid ✓');
            fetchRecords();
        } catch { toast.error('Failed to update'); }
    };
    const handleDelete = async (c: Credit) => {
        if (!confirm(`Delete credit for "${c.creditor_name}"?`)) return;
        try { await api.delete(`/credits/${c.id}`); toast.success('Deleted'); fetchRecords(); }
        catch { toast.error('Failed to delete'); }
    };
    const openEdit = (c: Credit) => {
        setEditCredit(c);
        setEditForm({ creditor_name: c.creditor_name, items_description: c.items_description, total_amount: String(c.total_amount), due_date: c.due_date?.slice(0, 10) || '', notes: c.notes || '' });
        setShowEditModal(true);
    };
    const saveEdit = async () => {
        if (!editCredit) return;
        setSaving(true);
        try {
            await api.put(`/credits/${editCredit.id}`, { ...editForm, total_amount: parseFloat(editForm.total_amount), due_date: editForm.due_date || null, notes: editForm.notes || null });
            toast.success('Updated');
            setShowEditModal(false);
            fetchRecords();
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const fmt = (n: number) => `${currency} ${Number(n).toFixed(2)}`;

    // ── Tab buttons ───────────────────────────────────────────────
    const tabBtn = (t: Tab, label: string) => (
        <button
            key={t}
            onClick={() => setTab(t)}
            style={{
                padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 0.15s',
            }}
        >
            {label}
        </button>
    );

    return (
        <>
            <Topbar title="Credit Sales" subtitle="Record and track customer credit purchases" />
            <div className="page-body" style={{ paddingBottom: 8 }}>

                {/* Tabs */}
                <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 16, display: 'flex', gap: 0 }}>
                    {tabBtn('add', '＋ Add Credit Sale')}
                    {tabBtn('records', '📋 Credit Records')}
                </div>

                {/* ── ADD TAB: POS-style layout ──────────────────────────── */}
                {tab === 'add' && (
                    <>
                        {/* Success Banner */}
                        {successCredit && (
                            <div className="card mb-4" style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <CheckCircle size={24} color="var(--success)" />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>Credit #{successCredit.id} recorded for {successCredit.name}!</div>
                                    <div className="text-muted">Outstanding: {fmt(successCredit.total)}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => handlePrint && handlePrint()}>Print Receipt</button>
                                    <button className="btn btn-soft btn-sm" onClick={() => setSuccessCredit(null)}>Dismiss</button>
                                </div>
                            </div>
                        )}

                        {receiptData && <ReceiptPrinter ref={receiptRef} {...receiptData} />}

                        <div className="pos-layout">
                            {/* Left: Product grid */}
                            <div className="pos-products">
                                <div className="search-wrap mb-4">
                                    <Search size={16} className="search-icon" />
                                    <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                                    {products.map((p) => {
                                        const isItemInCart = creditCart.find((c) => c.product.id === p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => addToCart(p)}
                                                className="card"
                                                style={{ textAlign: 'left', cursor: 'pointer', border: isItemInCart ? '1px solid var(--accent)' : '1px solid var(--border)', background: isItemInCart ? 'var(--accent-glow)' : 'var(--bg-card)', transition: 'all 0.15s' }}
                                            >
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{p.category?.name || 'Uncategorized'}</div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>{p.name}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{currency} {Number(p.selling_price).toFixed(2)}</span>
                                                    <span className={`badge ${p.current_stock <= p.reorder_level ? 'badge-warning' : 'badge-muted'}`}>{p.current_stock} left</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {products.length === 0 && (
                                        <div className="full-center" style={{ gridColumn: '1 / -1' }}><ShoppingCart size={32} /><span>No products found</span></div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Credit panel */}
                            <div className={`pos-cart ${cartCollapsed ? 'cart-collapsed' : ''}`}>
                                <div className="cart-toggle-bar" onClick={() => setCartCollapsed(!cartCollapsed)}>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CreditCard size={16} /> Credit · {creditCart.length} item{creditCart.length !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                {/* Cart items */}
                                <div className="cart-items">
                                    {creditCart.length === 0 ? (
                                        <div className="full-center" style={{ minHeight: 100 }}><ShoppingCart size={24} /><span>No items selected</span></div>
                                    ) : creditCart.map(({ product, quantity }) => (
                                        <div key={product.id} className="cart-item">
                                            <div style={{ flex: 1 }}>
                                                <div className="cart-item-name">{product.name}</div>
                                                <div className="cart-item-price">{currency} {Number(product.selling_price).toFixed(2)} each</div>
                                            </div>
                                            <div className="cart-qty">
                                                <button onClick={() => updateQty(product.id, -1)}><Minus size={12} /></button>
                                                <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{quantity}</span>
                                                <button onClick={() => updateQty(product.id, 1)}><Plus size={12} /></button>
                                            </div>
                                            <div style={{ fontWeight: 700, minWidth: 70, textAlign: 'right', fontSize: '0.85rem' }}>
                                                {currency} {(Number(product.selling_price) * quantity).toFixed(2)}
                                            </div>
                                            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeItem(product.id)}><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>

                                {/* Credit details */}
                                <div className="cart-summary">
                                    <div className="cart-total" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <span>Subtotal</span>
                                            <span>{currency} {subtotal.toFixed(2)}</span>
                                        </div>
                                        {taxAmount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                <span>Tax ({taxRate}%)</span>
                                                <span>{currency} {taxAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="cart-total">
                                        <div>
                                            <div className="cart-total-label">Grand Total</div>
                                            <div className="cart-total-value">{currency} {total.toFixed(2)}</div>
                                        </div>
                                    </div>


                                    <div className="form-group" style={{ marginBottom: 10 }}>
                                        <label>Creditor Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <input placeholder="e.g. Kwame Mensah" value={creditorName} onChange={(e) => setCreditorName(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 10 }}>
                                        <label>Due Date <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 12 }}>
                                        <label>Notes <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                                        <input placeholder="e.g. Will pay on Friday" value={notes} onChange={(e) => setNotes(e.target.value)} />
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: (creditCart.length > 0 && creditorName.trim()) ? 1 : 0.5 }}
                                        onClick={handleRecord}
                                        disabled={saving || creditCart.length === 0 || !creditorName.trim()}
                                    >
                                        {saving ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: 'white' }} /> : <CreditCard size={18} />}
                                        {saving ? 'Recording…' : `Record ${currency} ${total.toFixed(2)} Credit`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ── RECORDS TAB ───────────────────────────────────────── */}
                {tab === 'records' && (
                    <>
                        {/* Summary cards */}
                        {summary && (
                            <div className="stats-grid mb-4">
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}><AlertTriangle size={20} color="var(--danger)" /></div>
                                    <div>
                                        <div className="stat-label">Outstanding</div>
                                        <div className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(summary.total_outstanding)}</div>
                                        <div className="stat-sub">{summary.count_outstanding} creditor{summary.count_outstanding !== 1 ? 's' : ''}</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><Clock size={20} color="var(--warning)" /></div>
                                    <div>
                                        <div className="stat-label">Overdue</div>
                                        <div className="stat-value" style={{ color: 'var(--warning)' }}>{summary.count_overdue}</div>
                                        <div className="stat-sub">past due date</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CheckCircle size={20} color="var(--success)" /></div>
                                    <div>
                                        <div className="stat-label">Total Collected</div>
                                        <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(summary.total_paid)}</div>
                                        <div className="stat-sub">{summary.count_paid} settled</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Filters */}
                        <div className="card mb-4">
                            <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', borderRadius: 8, padding: 4 }}>
                                    {(['unpaid', 'all', 'paid'] as const).map((f) => (
                                        <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: filter === f ? 'var(--accent)' : 'transparent', color: filter === f ? 'white' : 'var(--text-muted)' }}>
                                            {f === 'unpaid' ? 'Outstanding' : f === 'paid' ? 'Paid' : 'All'}
                                        </button>
                                    ))}
                                </div>
                                <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
                                    <Search size={14} className="search-icon" />
                                    <input placeholder="Search creditor…" value={recSearch} onChange={(e) => setRecSearch(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="card" style={{ padding: 0 }}>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr><th>#</th><th>Creditor</th><th>Items</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                                        ) : credits.length === 0 ? (
                                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }} className="text-muted">No credit records found</td></tr>
                                        ) : credits.map((c) => (
                                            <tr key={c.id} style={{ opacity: c.is_paid ? 0.65 : 1 }}>
                                                <td><span className="text-muted" style={{ fontFamily: 'monospace' }}>#{c.id}</span></td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{c.creditor_name}</div>
                                                    {c.notes && <div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.notes}</div>}
                                                </td>
                                                <td style={{ maxWidth: 240 }}>
                                                    <details>
                                                        <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>View Items</summary>
                                                        <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '8px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                                                            {c.items_description}
                                                        </div>
                                                    </details>
                                                </td>
                                                <td style={{ fontWeight: 700, color: c.is_paid ? 'var(--success)' : c.is_overdue ? 'var(--danger)' : 'var(--text)' }}>
                                                    {fmt(c.total_amount)}
                                                </td>
                                                <td>
                                                    {c.due_date ? (
                                                        <span style={{ color: c.is_overdue ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: c.is_overdue ? 600 : 400 }}>
                                                            {c.is_overdue && !c.is_paid && '⚠ '}{new Date(c.due_date).toLocaleDateString('en-GH')}
                                                        </span>
                                                    ) : <span className="text-muted">—</span>}
                                                </td>
                                                <td>
                                                    {c.is_paid ? <span className="badge badge-success">Paid</span>
                                                        : c.is_overdue ? <span className="badge badge-warning">Overdue</span>
                                                            : <span className="badge badge-muted">Pending</span>}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn-icon" title={c.is_paid ? 'Mark unpaid' : 'Mark paid'} style={{ color: c.is_paid ? 'var(--text-muted)' : 'var(--success)' }} onClick={() => markPaid(c)}><CheckCircle size={14} /></button>
                                                        <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                                                        <button className="btn-icon" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(c)}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div >

            {/* Edit modal */}
            {
                showEditModal && editCredit && (
                    <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                        <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Edit Credit Record</h2>
                                <button className="btn-icon" onClick={() => setShowEditModal(false)}><X size={16} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group"><label>Creditor Name</label><input value={editForm.creditor_name} onChange={(e) => setEditForm((f) => ({ ...f, creditor_name: e.target.value }))} /></div>
                                <div className="form-group"><label>Items</label><textarea rows={4} value={editForm.items_description} onChange={(e) => setEditForm((f) => ({ ...f, items_description: e.target.value }))} style={{ resize: 'vertical' }} /></div>
                                <div className="grid-2" style={{ gap: 12 }}>
                                    <div className="form-group"><label>Amount ({currency})</label><input type="number" step="0.01" value={editForm.total_amount} onChange={(e) => setEditForm((f) => ({ ...f, total_amount: e.target.value }))} /></div>
                                    <div className="form-group"><label>Due Date</label><input type="date" value={editForm.due_date} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))} /></div>
                                </div>
                                <div className="form-group"><label>Notes</label><input value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-soft" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
