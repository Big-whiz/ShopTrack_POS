import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Supplier } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const isAdmin = useAuthStore((s) => s.isAdmin());

    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: ''
    });

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (err) {
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier.id}`, formData);
                toast.success('Supplier updated successfully');
            } else {
                await api.post('/suppliers', formData);
                toast.success('Supplier added successfully');
            }
            setShowModal(false);
            setEditingSupplier(null);
            setFormData({ name: '', contact_person: '', phone: '', email: '' });
            fetchSuppliers();
        } catch (err) {
            toast.error('Failed to save supplier');
        }
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this supplier?')) return;
        try {
            await api.delete(`/suppliers/${id}`);
            toast.success('Supplier deleted');
            fetchSuppliers();
        } catch (err) {
            toast.error('Failed to delete supplier');
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Topbar
                title="Suppliers"
                subtitle="Manage your product vendors and suppliers"
                actions={
                    <button className="btn btn-primary" onClick={() => {
                        setEditingSupplier(null);
                        setFormData({ name: '', contact_person: '', phone: '', email: '' });
                        setShowModal(true);
                    }}>
                        <Plus size={18} /> Add Supplier
                    </button>
                }
            />

            <div className="page-body">
                <div className="card mb-6">
                    <div className="search-wrap">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search suppliers by name or contact person..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Supplier Name</th>
                                    <th>Contact Person</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                                ) : filteredSuppliers.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }} className="text-muted">No suppliers found</td></tr>
                                ) : filteredSuppliers.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                                        <td>{s.contact_person || '-'}</td>
                                        <td>{s.phone || '-'}</td>
                                        <td>{s.email || '-'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className="flex" style={{ justifyContent: 'flex-end', gap: 8 }}>
                                                <button className="btn-icon" onClick={() => handleEdit(s)}><Edit2 size={14} /></button>
                                                {isAdmin && (
                                                    <button className="btn-icon text-danger" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn-icon">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Supplier Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Samsung West Africa"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contact Person</label>
                                    <input
                                        type="text"
                                        value={formData.contact_person}
                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                        placeholder="Full name of contact"
                                    />
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="Primary contact number"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="contact@supplier.com"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
