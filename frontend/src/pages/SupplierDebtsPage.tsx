import { useState, useEffect } from 'react';
import { Plus, Search, Download, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Supplier, SupplierDebt } from '../types';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';

export default function SupplierDebtsPage() {
    const [debts, setDebts] = useState<SupplierDebt[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const { settings } = useSettingsStore();
    const currency = settings?.currency_symbol || 'GH₵';

    const [formData, setFormData] = useState({
        supplier_id: '',
        amount_owed: '',
        amount_paid: '0',
        date_incurred: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        notes: ''
    });

    const handleExportCSV = () => {
        if (!debts.length) return toast.error('No data to export');

        const csvData = debts.map((d, i) => ({
            'S/N': i + 1,
            'Date Incurred': new Date(d.date_incurred).toLocaleDateString(),
            'Supplier': d.supplier?.name || '-',
            'Amount Owed': d.amount_owed,
            'Amount Paid': d.amount_paid,
            'Balance': (Number(d.amount_owed) - Number(d.amount_paid)).toFixed(2),
            'Status': d.status,
            'Method': d.payment_method || '-',
            'Payment Date': d.payment_date ? new Date(d.payment_date).toLocaleDateString() : '-',
            'Staff': d.responsible_staff?.full_name || d.responsible_staff?.username || '-'
        }));

        const csvString = Papa.unparse(csvData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Supplier_Debts_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Debt records exported');
    };

    const handleMarkAsPaid = async (debt: SupplierDebt) => {
        if (debt.status === 'Paid') return;

        if (!window.confirm('Mark this debt as fully paid?')) return;

        try {
            await api.put(`/supplier-debts/${debt.id}`, {
                amount_paid: debt.amount_owed,
                payment_date: new Date().toISOString().split('T')[0]
            });
            toast.success('Debt marked as paid');
            fetchData();
        } catch (err) {
            toast.error('Failed to update record');
        }
    };

    const fetchData = async () => {
        try {
            const [debtsRes, suppliersRes] = await Promise.all([
                api.get('/supplier-debts'),
                api.get('/suppliers')
            ]);
            setDebts(debtsRes.data);
            setSuppliers(suppliersRes.data);
        } catch (err) {
            toast.error('Failed to load debt records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplier_id) return toast.error('Please select a supplier');

        try {
            await api.post('/supplier-debts', {
                ...formData,
                supplier_id: parseInt(formData.supplier_id),
                amount_owed: parseFloat(formData.amount_owed),
                amount_paid: parseFloat(formData.amount_paid)
            });
            toast.success('Debt record saved');
            setShowModal(false);
            setFormData({
                supplier_id: '',
                amount_owed: '',
                amount_paid: '0',
                date_incurred: new Date().toISOString().split('T')[0],
                payment_method: 'Cash',
                notes: ''
            });
            fetchData();
        } catch (err) {
            toast.error('Failed to save record');
        }
    };

    const fmt = (n: number) => `${currency} ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

    const filteredDebts = debts.filter(d =>
        statusFilter === 'All' || d.status === statusFilter
    );

    return (
        <>
            <Topbar
                title="Supplier Debt Tracker"
                subtitle="Track outstanding balances and vendor payments"
                actions={
                    <div className="flex gap-2">
                        <button className="btn btn-soft" onClick={handleExportCSV} disabled={debts.length === 0}>
                            <Download size={16} /> Export
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={18} /> Record New Debt
                        </button>
                    </div>
                }
            />

            <div className="page-body">
                {/* Stats Summary */}
                <div className="stat-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total Amount Owed</div>
                        <div className="stat-value">{fmt(debts.reduce((acc, d) => acc + Number(d.amount_owed), 0))}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Amount Paid</div>
                        <div className="stat-value text-success">{fmt(debts.reduce((acc, d) => acc + Number(d.amount_paid), 0))}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Outstanding Balance</div>
                        <div className="stat-value text-danger">
                            {fmt(debts.reduce((acc, d) => acc + (Number(d.amount_owed) - Number(d.amount_paid)), 0))}
                        </div>
                    </div>
                </div>

                <div className="card mb-6">
                    <div className="flex-between">
                        <div className="flex gap-4">
                            <div className="flex gap-2" style={{ alignItems: 'center' }}>
                                <Search size={16} className="text-muted" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ width: 'auto', padding: '6px 10px' }}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Paid">Paid</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="table-wrap">
                        <table style={{ minWidth: 1200 }}>
                            <thead>
                                <tr>
                                    <th>S/N</th>
                                    <th>Date Incurred</th>
                                    <th>Supplier Name</th>
                                    <th>Amount Owed ({currency})</th>
                                    <th>Amount Paid ({currency})</th>
                                    <th>Outstanding Balance</th>
                                    <th>Status</th>
                                    <th>Payment Method</th>
                                    <th>Payment Date</th>
                                    <th>Responsible Staff</th>
                                    <th>Notes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                                ) : filteredDebts.length === 0 ? (
                                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40 }} className="text-muted">No debt records found</td></tr>
                                ) : filteredDebts.map((d, i) => (
                                    <tr key={d.id}>
                                        <td className="text-muted">{i + 1}</td>
                                        <td>{new Date(d.date_incurred).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{d.supplier?.name}</td>
                                        <td className="fw-bold">{d.amount_owed.toLocaleString()}</td>
                                        <td className="text-success">{d.amount_paid.toLocaleString()}</td>
                                        <td className="text-danger">{(d.amount_owed - d.amount_paid).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge badge-${d.status === 'Paid' ? 'success' : d.status === 'Partial' ? 'warning' : 'danger'}`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td>{d.payment_method || '-'}</td>
                                        <td>{d.payment_date ? new Date(d.payment_date).toLocaleDateString() : '-'}</td>
                                        <td>{d.responsible_staff?.full_name || d.responsible_staff?.username || '-'}</td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.notes || ''}>
                                            {d.notes || '-'}
                                        </td>
                                        <td>
                                            {d.status !== 'Paid' && (
                                                <button
                                                    className="btn-icon text-success"
                                                    title="Mark as Paid"
                                                    onClick={() => handleMarkAsPaid(d)}
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
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
                            <h3 className="modal-title">Record New Debt</h3>
                            <button onClick={() => setShowModal(false)} className="btn-icon">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Supplier *</label>
                                    <select
                                        required
                                        value={formData.supplier_id}
                                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                    >
                                        <option value="">Select a supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label>Amount Owed ({currency}) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={formData.amount_owed}
                                            onChange={(e) => setFormData({ ...formData, amount_owed: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Amount Paid ({currency})</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.amount_paid}
                                            onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label>Date Incurred *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date_incurred}
                                            onChange={(e) => setFormData({ ...formData, date_incurred: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Payment Method</label>
                                        <select
                                            value={formData.payment_method}
                                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Mobile Money">Mobile Money</option>
                                            <option value="Cheque">Cheque</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Notes / Remarks</label>
                                    <textarea
                                        rows={3}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Add any additional details here..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
