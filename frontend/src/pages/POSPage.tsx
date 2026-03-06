import { useEffect, useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, Smartphone, Banknote, SplitSquareHorizontal } from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { queueTransaction } from '../services/syncQueue';
import { Product, CartItem } from '../types';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { ReceiptPrinter, ReceiptProps } from '../components/ReceiptPrinter';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import toast from 'react-hot-toast';

type PayMethod = 'Cash' | 'Mobile Money' | 'Split';

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [payMethod, setPayMethod] = useState<PayMethod>('Cash');
    const [momoRef, setMomoRef] = useState('');
    const [cashAmt, setCashAmt] = useState('');
    const [processing, setProcessing] = useState(false);
    const [successSale, setSuccessSale] = useState<{ id: number; total: number; method: PayMethod; momoRef?: string; cash?: number; momo?: number } | null>(null);
    const [cartCollapsed, setCartCollapsed] = useState(false);

    const { user } = useAuthStore();
    const { settings } = useSettingsStore();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [receiptData, setReceiptData] = useState<ReceiptProps | null>(null);

    const currency = settings?.currency_symbol || 'GH₵';

    const handlePrint = useReactToPrint({
        contentRef: receiptRef, // v3+ uses contentRef
        documentTitle: 'Receipt',
    });

    useEffect(() => {
        if (window.innerWidth <= 768) setCartCollapsed(true);
    }, []);

    useEffect(() => {
        api.get<Product[]>('/products', { params: search ? { search } : {} })
            .then((r) => setProducts(r.data.filter((p) => p.current_stock > 0)))
            .catch(() => toast.error('Failed to load products'));
    }, [search]);

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.current_stock) { toast.error(`Only ${product.current_stock} available`); return prev; }
                return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQty = (productId: number, delta: number) => {
        setCart((prev) =>
            prev.map((c) => c.product.id === productId ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)
                .filter((c) => c.quantity > 0)
        );
    };

    const removeFromCart = (productId: number) => setCart((prev) => prev.filter((c) => c.product.id !== productId));

    const subtotal = cart.reduce((sum, c) => sum + Number(c.product.selling_price) * c.quantity, 0);
    const taxRate = parseFloat(settings?.tax_rate_percent as any) || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    const cashAmtNum = parseFloat(cashAmt) || 0;
    const momoAmtNum = Math.max(0, parseFloat((total - cashAmtNum).toFixed(2)));

    const canCheckout = (() => {
        if (cart.length === 0) return false;
        if (payMethod === 'Mobile Money' && !momoRef.trim()) return false;
        if (payMethod === 'Split') {
            if (!momoRef.trim()) return false;
            if (cashAmtNum <= 0 || momoAmtNum <= 0) return false;
            if (Math.abs(cashAmtNum + momoAmtNum - total) > 0.01) return false;
        }
        return true;
    })();

    const handleCheckout = async () => {
        if (!canCheckout) return;
        setProcessing(true);
        try {
            const payload: Record<string, any> = {
                items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
                payment_method: payMethod,
                tax_amount: parseFloat(taxAmount.toFixed(2)),
            };
            if (payMethod === 'Mobile Money') payload.momo_transaction_id = momoRef.trim();
            if (payMethod === 'Split') {
                payload.momo_transaction_id = momoRef.trim();
                payload.cash_amount = cashAmtNum;
                payload.momo_amount = momoAmtNum;
            }
            const { data } = await api.post('/sales', payload);

            // Setup receipt data before clearing cart
            const currentReceiptData: ReceiptProps = {
                saleId: data.id,
                date: new Date(),
                items: cart.map(c => ({
                    id: c.product.id,
                    name: c.product.name,
                    quantity: c.quantity,
                    unitPrice: Number(c.product.selling_price),
                    subtotal: Number(c.product.selling_price) * c.quantity
                })),
                subtotal: subtotal,
                taxAmount: taxAmount,
                total: total,
                paymentMethod: payMethod,
                storeName: settings?.store_name || 'ShopTrack POS',
                currencySymbol: currency,
                cashierName: user?.full_name || user?.username,
                footerMsg: settings?.receipt_footer_msg,
            };
            setReceiptData(currentReceiptData);

            setSuccessSale({ id: data.id, total: Number(data.total_amount), method: payMethod, momoRef: momoRef || undefined, cash: payMethod === 'Split' ? cashAmtNum : undefined, momo: payMethod === 'Split' ? momoAmtNum : undefined });
            setCart([]);
            setMomoRef('');
            setCashAmt('');
            setPayMethod('Cash');
            api.get<Product[]>('/products').then((r) => setProducts(r.data.filter((p) => p.current_stock > 0)));

            // Wait for React to re-render the hidden receipt DOM, then print
            setTimeout(() => { if (handlePrint) handlePrint(); }, 100);

        } catch (err: any) {
            if (!err.response || err.message === 'Network Error') {
                const payload: Record<string, any> = {
                    items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
                    payment_method: payMethod,
                    tax_amount: parseFloat(taxAmount.toFixed(2)),
                };
                if (payMethod === 'Mobile Money') payload.momo_transaction_id = momoRef.trim();
                if (payMethod === 'Split') {
                    payload.momo_transaction_id = momoRef.trim();
                    payload.cash_amount = cashAmtNum;
                    payload.momo_amount = momoAmtNum;
                }

                await queueTransaction('sale', payload);
                toast.success('Offline mode: Sale saved locally and will sync when online ✨', { duration: 4000 });

                const offlineSaleId = Date.now();
                // Setup receipt data for offline sale
                const currentReceiptData: ReceiptProps = {
                    saleId: offlineSaleId,
                    date: new Date(),
                    items: cart.map(c => ({
                        id: c.product.id,
                        name: c.product.name,
                        quantity: c.quantity,
                        unitPrice: Number(c.product.selling_price),
                        subtotal: Number(c.product.selling_price) * c.quantity
                    })),
                    subtotal: subtotal,
                    taxAmount: taxAmount,
                    total: total,
                    paymentMethod: payMethod,
                    storeName: settings?.store_name || 'ShopTrack POS',
                    currencySymbol: currency,
                    cashierName: user?.full_name || user?.username,
                    footerMsg: settings?.receipt_footer_msg,
                };
                setReceiptData(currentReceiptData);

                setSuccessSale({ id: offlineSaleId, total: total, method: payMethod, momoRef: momoRef || undefined, cash: payMethod === 'Split' ? cashAmtNum : undefined, momo: payMethod === 'Split' ? momoAmtNum : undefined });
                setCart([]);
                setMomoRef('');
                setCashAmt('');
                setPayMethod('Cash');

                setTimeout(() => { if (handlePrint) handlePrint(); }, 100);
            } else {
                toast.error(err.response?.data?.detail || 'Checkout failed');
            }
        } finally { setProcessing(false); }
    };

    const switchMethod = (m: PayMethod) => { setPayMethod(m); setMomoRef(''); setCashAmt(''); };

    const methodBtn = (m: PayMethod, Icon: React.ElementType, label: string) => (
        <button
            key={m}
            type="button"
            onClick={() => switchMethod(m)}
            style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 8px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                border: payMethod === m ? '2px solid var(--accent)' : '2px solid var(--border)',
                background: payMethod === m ? 'var(--accent-glow)' : 'var(--bg-input)',
                color: payMethod === m ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 0.15s',
            }}
        >
            <Icon size={14} />{label}
        </button>
    );

    return (
        <>
            <Topbar title="Point of Sale" subtitle="Record a new sale transaction" />
            <div className="page-body" style={{ paddingBottom: 8 }}>

                {/* Success Banner */}
                {successSale && (
                    <div className="card mb-4" style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CheckCircle size={24} color="var(--success)" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: 'var(--success)' }}>Sale #{successSale.id} recorded successfully!</div>
                            {successSale.method === 'Split' ? (
                                <div className="text-muted">
                                    Total: {currency} {successSale.total.toFixed(2)} · Cash: {currency} {successSale.cash?.toFixed(2)} + MoMo: {currency} {successSale.momo?.toFixed(2)}
                                    {successSale.momoRef && <> · Ref: <strong>{successSale.momoRef}</strong></>}
                                </div>
                            ) : successSale.method === 'Mobile Money' ? (
                                <div className="text-muted">Total: {currency} {successSale.total.toFixed(2)} · Mobile Money · Ref: <strong>{successSale.momoRef}</strong></div>
                            ) : (
                                <div className="text-muted">Total: {currency} {successSale.total.toFixed(2)} · Cash</div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handlePrint && handlePrint()}>Print Receipt</button>
                            <button className="btn btn-soft btn-sm" onClick={() => setSuccessSale(null)}>Dismiss</button>
                        </div>
                    </div>
                )}

                {/* Hidden Receipt Element for Printing */}
                {receiptData && <ReceiptPrinter ref={receiptRef} {...receiptData} />}

                <div className="pos-layout">
                    {/* Product Grid */}
                    <div className="pos-products">
                        <div className="search-wrap mb-4">
                            <Search size={16} className="search-icon" />
                            <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                            {products.map((p) => {
                                const inCart = cart.find((c) => c.product.id === p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => addToCart(p)}
                                        className="card"
                                        style={{ textAlign: 'left', cursor: 'pointer', border: inCart ? '1px solid var(--accent)' : '1px solid var(--border)', background: inCart ? 'var(--accent-glow)' : 'var(--bg-card)', transition: 'all 0.15s' }}
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

                    {/* Cart Panel */}
                    <div className={`pos-cart ${cartCollapsed ? 'cart-collapsed' : ''}`}>
                        <div className="cart-toggle-bar" onClick={() => setCartCollapsed(!cartCollapsed)}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShoppingCart size={16} /> Cart · {cart.length} item{cart.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div className="cart-items">
                            {cart.length === 0 ? (
                                <div className="full-center" style={{ minHeight: 120 }}><ShoppingCart size={24} /><span>Cart is empty</span></div>
                            ) : cart.map(({ product, quantity }) => (
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
                                    <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeFromCart(product.id)}><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
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

                            {/* Payment Method Pill Buttons */}
                            <div className="form-group" style={{ marginBottom: 10 }}>
                                <label style={{ marginBottom: 6, display: 'block' }}>Payment Method</label>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {methodBtn('Cash', Banknote, 'Cash')}
                                    {methodBtn('Mobile Money', Smartphone, 'MoMo')}
                                    {methodBtn('Split', SplitSquareHorizontal, 'Split')}
                                </div>
                            </div>

                            {/* MoMo Transaction ID */}
                            {(payMethod === 'Mobile Money' || payMethod === 'Split') && (
                                <div className="form-group" style={{ marginBottom: 10 }}>
                                    <label>MoMo Transaction ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input
                                        placeholder="e.g. G2504031234ABC"
                                        value={momoRef}
                                        onChange={(e) => setMomoRef(e.target.value)}
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                            )}

                            {/* Split Payment Amounts */}
                            {payMethod === 'Split' && (
                                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                                    <div className="grid-2" style={{ gap: 8 }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.75rem' }}>Cash ({currency})</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={total}
                                                step="0.01"
                                                placeholder="0.00"
                                                value={cashAmt}
                                                onChange={(e) => setCashAmt(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.75rem' }}>MoMo ({currency})</label>
                                            <input
                                                type="number"
                                                readOnly
                                                value={cashAmt ? momoAmtNum.toFixed(2) : ''}
                                                placeholder="auto"
                                                style={{ opacity: 0.7 }}
                                            />
                                        </div>
                                    </div>
                                    {cashAmt && (
                                        <div style={{ marginTop: 6, fontSize: '0.75rem', color: Math.abs(cashAmtNum + momoAmtNum - total) < 0.01 ? 'var(--success)' : 'var(--danger)' }}>
                                            {Math.abs(cashAmtNum + momoAmtNum - total) < 0.01
                                                ? '✓ Amounts match total'
                                                : `⚠ ${currency} ${(cashAmtNum + momoAmtNum).toFixed(2)} ≠ ${currency} ${total.toFixed(2)}`}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: canCheckout ? 1 : 0.5 }}
                                onClick={handleCheckout}
                                disabled={!canCheckout || processing}
                            >
                                {processing ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: 'white' }} /> : <CheckCircle size={18} />}
                                {processing ? 'Processing...' : `Charge ${currency} ${total.toFixed(2)}`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
