import { forwardRef } from 'react';

export interface ReceiptItem {
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface ReceiptProps {
    saleId?: number;
    date: Date;
    items: ReceiptItem[];
    total: number;
    paymentMethod: string;
    storeName: string;
    currencySymbol: string;
    cashierName?: string;
    isCredit?: boolean;
    creditorName?: string;
    dueDate?: Date;
    footerMsg?: string;
}

// forwardRef is required by react-to-print to hold the printable DOM node
export const ReceiptPrinter = forwardRef<HTMLDivElement, ReceiptProps>(
    (
        {
            saleId,
            date,
            items,
            total,
            paymentMethod,
            storeName,
            currencySymbol,
            cashierName,
            isCredit,
            creditorName,
            dueDate,
            footerMsg,
        },
        ref
    ) => {
        return (
            <div style={{ display: 'none' }}>
                {/* 
                  The actual printable area. It is visually hidden on the screen 
                  but extracted by react-to-print when triggered.
                  We use an 80mm width standard for thermal printers.
                */}
                <div
                    ref={ref}
                    style={{
                        padding: '20px',
                        width: '80mm',
                        margin: '0 auto',
                        fontFamily: 'monospace',
                        color: 'black',
                        backgroundColor: 'white',
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '24px' }}>{storeName}</h2>
                        <p style={{ margin: '5px 0', fontSize: '12px' }}>
                            {date.toLocaleDateString()} {date.toLocaleTimeString()}
                        </p>
                        {saleId && (
                            <p style={{ margin: '0', fontSize: '12px' }}>
                                Receipt #{saleId.toString().padStart(6, '0')}
                            </p>
                        )}
                        {cashierName && (
                            <p style={{ margin: '0', fontSize: '12px' }}>Cashier: {cashierName}</p>
                        )}
                    </div>

                    <hr style={{ borderTop: '1px dashed black', borderBottom: 'none' }} />

                    {/* Items */}
                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', paddingBottom: '5px' }}>Item</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '5px' }}>Qty</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '5px' }}>Price</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '5px' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td style={{ padding: '2px 0' }}>{item.name}</td>
                                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right', padding: '2px 0' }}>
                                            {currencySymbol}{item.unitPrice.toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '2px 0' }}>
                                            {currencySymbol}{item.subtotal.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <hr style={{ borderTop: '1px dashed black', borderBottom: 'none' }} />

                    {/* Totals & Footer Info */}
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                            <span>TOTAL:</span>
                            <span>{currencySymbol}{total.toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '5px' }}>
                            <span>Payment:</span>
                            <span>{paymentMethod}</span>
                        </div>

                        {/* Special Credit Sale Info */}
                        {isCredit && creditorName && (
                            <div style={{ marginTop: '15px', padding: '10px', border: '1px solid black', fontSize: '12px' }}>
                                <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '5px' }}>CREDIT SALE</div>
                                <div><strong>Customer:</strong> {creditorName}</div>
                                {dueDate && (
                                    <div><strong>Due Date:</strong> {dueDate.toLocaleDateString()}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Message */}
                    <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                        {footerMsg || 'Thank you for your purchase!'}
                    </div>
                </div>
            </div>
        );
    }
);

ReceiptPrinter.displayName = 'ReceiptPrinter';
