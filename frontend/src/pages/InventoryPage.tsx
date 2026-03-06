import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Product, Category } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

type ModalMode = 'create' | 'edit' | null;

const emptyForm = { sku: '', name: '', description: '', category_id: '', cost_price: '', selling_price: '', current_stock: '0', reorder_level: '5' };

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [lowStock, setLowStock] = useState(false);
    const [modal, setModal] = useState<ModalMode>(null);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const isAdmin = useAuthStore((s) => s.isAdmin());
    const { settings } = useSettingsStore();
    const currency = settings?.currency_symbol || 'GH₵';

    const fetchProducts = useCallback(() => {
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (catFilter) params.category_id = catFilter;
        if (lowStock) params.low_stock = 'true';
        api.get<Product[]>('/products', { params })
            .then((r) => setProducts(r.data))
            .catch(() => toast.error('Failed to load products'));
    }, [search, catFilter, lowStock]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);
    useEffect(() => { api.get<Category[]>('/categories').then((r) => setCategories(r.data)); }, []);

    const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setModal('create'); };
    const openEdit = (p: Product) => {
        setEditing(p);
        setForm({ sku: p.sku, name: p.name, description: p.description || '', category_id: String(p.category_id || ''), cost_price: String(p.cost_price), selling_price: String(p.selling_price), current_stock: String(p.current_stock), reorder_level: String(p.reorder_level) });
        setModal('edit');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = { ...form, category_id: form.category_id ? Number(form.category_id) : null, cost_price: Number(form.cost_price), selling_price: Number(form.selling_price), current_stock: Number(form.current_stock), reorder_level: Number(form.reorder_level) };
        try {
            if (modal === 'create') {
                await api.post('/products', payload);
                toast.success('Product added successfully');
            } else {
                await api.put(`/products/${editing!.id}`, payload);
                toast.success('Product updated');
            }
            setModal(null);
            fetchProducts();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Save failed');
        } finally { setSaving(false); }
    };

    const handleDelete = async (p: Product) => {
        if (!confirm(`Archive product "${p.name}"? It will no longer appear in inventory but sales history is preserved.`)) return;
        try {
            await api.delete(`/products/${p.id}`);
            toast.success('Product archived');
            fetchProducts();
        } catch { toast.error('Delete failed'); }
    };

    const isLow = (p: Product) => p.current_stock <= p.reorder_level;

    return (
        <>
            <Topbar
                title="Inventory"
                subtitle={`${products.length} products`}
                actions={isAdmin ? <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Product</button> : undefined}
            />
            <div className="page-body">
                {/* Filters */}
                <div className="card mb-4">
                    <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
                            <Search size={16} className="search-icon" />
                            <input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <select style={{ width: 180 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <label className="flex" style={{ alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} />
                            <span style={{ fontSize: '0.875rem' }}>Low Stock Only</span>
                        </label>
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>SKU</th><th>Product</th><th>Category</th>
                                    <th>Cost</th><th>Price</th><th>Stock</th><th>Status</th>
                                    {isAdmin && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr><td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: 40 }} className="text-muted">No products found</td></tr>
                                ) : products.map((p) => (
                                    <tr key={p.id}>
                                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} className="text-muted">{p.sku}</span></td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                                            {p.description && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{p.description.slice(0, 50)}</div>}
                                        </td>
                                        <td><span className="badge badge-muted">{p.category?.name || '—'}</span></td>
                                        <td>{currency} {Number(p.cost_price).toFixed(2)}</td>
                                        <td style={{ fontWeight: 600 }}>{currency} {Number(p.selling_price).toFixed(2)}</td>
                                        <td>
                                            <span className={`badge ${isLow(p) ? 'badge-danger' : 'badge-success'}`}>
                                                {isLow(p) && <AlertTriangle size={10} />} {p.current_stock}
                                            </span>
                                        </td>
                                        <td>
                                            {isLow(p)
                                                ? <span className="badge badge-warning">Low Stock</span>
                                                : <span className="badge badge-success">In Stock</span>}
                                        </td>
                                        {isAdmin && (
                                            <td>
                                                <div className="flex gap-3">
                                                    <button className="btn-icon" onClick={() => openEdit(p)} title="Edit"><Edit2 size={14} /></button>
                                                    <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p)} title="Archive"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{modal === 'create' ? 'Add New Product' : 'Edit Product'}</h2>
                            <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="grid-2">
                                    <div className="form-group"><label>SKU *</label><input placeholder="e.g. CHG-001" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></div>
                                    <div className="form-group"><label>Product Name *</label><input placeholder="e.g. USB-C Fast Charger" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                                </div>
                                <div className="form-group"><label>Category</label>
                                    <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                                        <option value="">Select category</option>
                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label>Description</label><textarea rows={2} placeholder="Optional description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="grid-2">
                                    <div className="form-group"><label>Cost Price ({currency}) *</label><input type="number" step="0.01" min="0" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required /></div>
                                    <div className="form-group"><label>Selling Price ({currency}) *</label><input type="number" step="0.01" min="0" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} required /></div>
                                </div>
                                <div className="grid-2">
                                    <div className="form-group"><label>Stock Qty</label><input type="number" min="0" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} /></div>
                                    <div className="form-group"><label>Reorder Level</label><input type="number" min="0" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-soft" onClick={() => setModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : modal === 'create' ? 'Add Product' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
