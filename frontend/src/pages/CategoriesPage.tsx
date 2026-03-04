import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Category } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [editing, setEditing] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const isAdmin = useAuthStore((s) => s.isAdmin());

    const fetch = () => api.get<Category[]>('/categories').then((r) => setCategories(r.data));
    useEffect(() => { fetch(); }, []);

    const openCreate = () => { setName(''); setDesc(''); setEditing(null); setModal('create'); };
    const openEdit = (c: Category) => { setName(c.name); setDesc(c.description || ''); setEditing(c); setModal('edit'); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (modal === 'create') {
                await api.post('/categories', { name, description: desc });
                toast.success('Category created');
            } else {
                await api.put(`/categories/${editing!.id}`, { name, description: desc });
                toast.success('Category updated');
            }
            setModal(null);
            fetch();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Save failed');
        } finally { setSaving(false); }
    };

    const handleDelete = async (c: Category) => {
        if (!confirm(`Delete "${c.name}"? Products in this category will become uncategorized.`)) return;
        try { await api.delete(`/categories/${c.id}`); toast.success('Category deleted'); fetch(); }
        catch (err: any) { toast.error(err.response?.data?.detail || 'Delete failed'); }
    };

    return (
        <>
            <Topbar
                title="Categories"
                subtitle={`${categories.length} product categories`}
                actions={isAdmin ? <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New Category</button> : undefined}
            />
            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {categories.map((c) => (
                        <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div className="flex-between">
                                <div style={{ fontWeight: 700 }}>{c.name}</div>
                                {isAdmin && (
                                    <div className="flex gap-3">
                                        <button className="btn-icon" onClick={() => openEdit(c)} title="Edit"><Edit2 size={13} /></button>
                                        <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(c)} title="Delete"><Trash2 size={13} /></button>
                                    </div>
                                )}
                            </div>
                            <p className="text-muted">{c.description || 'No description'}</p>
                        </div>
                    ))}
                    {categories.length === 0 && <div className="full-center text-muted">No categories yet</div>}
                </div>
            </div>
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{modal === 'create' ? 'New Category' : 'Edit Category'}</h2>
                            <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group"><label>Name *</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                                <div className="form-group"><label>Description</label><textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-soft" onClick={() => setModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
