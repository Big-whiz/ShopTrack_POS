import { useEffect, useState } from 'react';
import { Plus, Edit2, Shield, User } from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { User as UserType } from '../types';
import toast from 'react-hot-toast';

export default function UsersPage() {
    const [users, setUsers] = useState<UserType[]>([]);
    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [editing, setEditing] = useState<UserType | null>(null);
    const [form, setForm] = useState({ username: '', full_name: '', password: '', role: 'staff', is_active: true });
    const [saving, setSaving] = useState(false);

    const fetch = () => api.get<UserType[]>('/users').then((r) => setUsers(r.data)).catch(() => toast.error('Failed to load users'));
    useEffect(() => { fetch(); }, []);

    const openCreate = () => { setEditing(null); setForm({ username: '', full_name: '', password: '', role: 'staff', is_active: true }); setModal('create'); };
    const openEdit = (u: UserType) => { setEditing(u); setForm({ username: u.username, full_name: u.full_name || '', password: '', role: u.role, is_active: u.is_active }); setModal('edit'); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload: any = { username: form.username, full_name: form.full_name, role: form.role, is_active: form.is_active };
        if (form.password) payload.password = form.password;
        try {
            if (modal === 'create') {
                payload.password = form.password;
                await api.post('/users', payload);
                toast.success('User created');
            } else {
                await api.put(`/users/${editing!.id}`, payload);
                toast.success('User updated');
            }
            setModal(null);
            fetch();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Save failed');
        } finally { setSaving(false); }
    };

    return (
        <>
            <Topbar
                title="Users"
                subtitle={`${users.length} system users`}
                actions={<button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New User</button>}
            />
            <div className="page-body">
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>User</th><th>Username</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }} className="text-muted">No users found</td></tr>
                                ) : users.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex gap-3" style={{ alignItems: 'center' }}>
                                                <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                                                    {(u.full_name || u.username).split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{u.full_name || u.username}</span>
                                            </div>
                                        </td>
                                        <td className="text-muted">{u.username}</td>
                                        <td>
                                            <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-muted'}`}>
                                                {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />} {u.role}
                                            </span>
                                        </td>
                                        <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                                        <td className="text-muted">{new Date(u.created_at).toLocaleDateString('en-GH')}</td>
                                        <td><button className="btn-icon" onClick={() => openEdit(u)}><Edit2 size={14} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{modal === 'create' ? 'Create User' : 'Edit User'}</h2>
                            <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="grid-2">
                                    <div className="form-group"><label>Username *</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
                                    <div className="form-group"><label>Full Name</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                                </div>
                                <div className="form-group">
                                    <label>Password {modal === 'edit' ? '(leave blank to keep current)' : '*'}</label>
                                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={modal === 'create'} />
                                </div>
                                <div className="grid-2">
                                    <div className="form-group"><label>Role</label>
                                        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                            <option value="staff">Staff</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Status</label>
                                        <select value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                                            <option value="true">Active</option>
                                            <option value="false">Disabled</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-soft" onClick={() => setModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
