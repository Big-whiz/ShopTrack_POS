import { useEffect, useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useSettingsStore, ShopSettings } from '../store/settingsStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { settings, updateSettings, isLoading, error } = useSettingsStore();

    // Local state for the form so we can edit without immediately modifying global state
    const [formData, setFormData] = useState<Partial<ShopSettings>>({
        store_name: '',
        currency_symbol: 'GH₵',
        tax_rate_percent: 0,
        receipt_footer_msg: '',
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                store_name: settings.store_name,
                currency_symbol: settings.currency_symbol,
                tax_rate_percent: Number(settings.tax_rate_percent),
                receipt_footer_msg: settings.receipt_footer_msg || '',
            });
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'tax_rate_percent' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateSettings(formData);
            toast.success('Settings updated successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to apply settings');
        }
    };

    return (
        <>
            <Topbar title="Store Settings" subtitle="Configure global shop preferences" />
            <div className="page-body" style={{ maxWidth: 800 }}>
                {error && (
                    <div className="card mb-4" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertCircle size={20} />
                        <div>{error}</div>
                    </div>
                )}

                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <h3 style={{ marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>General Configuration</h3>

                        <div className="grid-2" style={{ gap: 20 }}>
                            <div className="form-group">
                                <label>Store Name</label>
                                <input
                                    name="store_name"
                                    value={formData.store_name || ''}
                                    onChange={handleChange}
                                    placeholder="e.g. ShopTrack POS"
                                    required
                                />
                                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>Displayed on the dashboard and printed receipts.</p>
                            </div>

                            <div className="form-group">
                                <label>Currency Symbol</label>
                                <input
                                    name="currency_symbol"
                                    value={formData.currency_symbol || ''}
                                    onChange={handleChange}
                                    placeholder="e.g. $, ₦, GH₵, £"
                                    required
                                    maxLength={10}
                                />
                                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>Used universally across the application.</p>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: 10 }}>
                            <label>Global Tax Rate (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                name="tax_rate_percent"
                                value={formData.tax_rate_percent}
                                onChange={handleChange}
                            />
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>Tax applied to all POS transactions globally.</p>
                        </div>

                        <h3 style={{ marginTop: 30, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>Receipt Configuration</h3>

                        <div className="form-group">
                            <label>Receipt Footer Message</label>
                            <textarea
                                name="receipt_footer_msg"
                                value={formData.receipt_footer_msg || ''}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Thank you for your purchase!"
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 30 }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                                style={{ padding: '10px 24px', fontSize: '1rem' }}
                            >
                                {isLoading ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: 'white' }} /> : <Save size={18} />}
                                {isLoading ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
