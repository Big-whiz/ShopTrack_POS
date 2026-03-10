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
    subtotal?: number;
    taxAmount?: number;
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
            subtotal,
            taxAmount,
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
                        padding: '15px',
                        width: '80mm',
                        margin: '0 auto',
                        fontFamily: 'monospace',
                        color: 'black',
                        backgroundColor: 'white',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: 'bold', color: 'black' }}>{storeName}</h2>
                        <p style={{ margin: '2px 0', fontSize: '11px', color: 'black' }}>
                            {date.toLocaleDateString()} {date.toLocaleTimeString()}
                        </p>
                        {saleId && (
                            <p style={{ margin: '2px 0', fontSize: '11px', color: 'black' }}>
                                Receipt #{saleId.toString().padStart(6, '0')}
                            </p>
                        )}
                        {cashierName && (
                            <p style={{ margin: '2px 0', fontSize: '11px', color: 'black' }}>Cashier: {cashierName}</p>
                        )}
                    </div>

                    <div style={{ borderTop: '1px dashed black', marginBottom: '10px' }}></div>

                    {/* Items */}
                    <div style={{ marginBottom: '10px' }}>
                        <table style={{
                            width: '100%',
                            fontSize: '11px',
                            borderCollapse: 'collapse',
                            color: 'black',
                            tableLayout: 'fixed'
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '1px dashed black' }}>
                                    <th style={{ textAlign: 'left', padding: '5px 2px 5px 0', width: '40%', color: 'black' }}>ITEM</th>
                                    <th style={{ textAlign: 'center', padding: '5px 2px', width: '12%', color: 'black' }}>QTY</th>
                                    <th style={{ textAlign: 'right', padding: '5px 2px', width: '24%', color: 'black' }}>PRICE</th>
                                    <th style={{ textAlign: 'right', padding: '5px 0 5px 2px', width: '24%', color: 'black' }}>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index} style={{ verticalAlign: 'top' }}>
                                        <td style={{ padding: '4px 2px 4px 0', color: 'black', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
                                            {item.name}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '4px 2px', color: 'black' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right', padding: '4px 2px', color: 'black', whiteSpace: 'nowrap' }}>
                                            {currencySymbol}&nbsp;{item.unitPrice.toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '4px 0 4px 2px', color: 'black', whiteSpace: 'nowrap' }}>
                                            {currencySymbol}&nbsp;{item.subtotal.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ borderTop: '1px dashed black', margin: '5px 0' }}></div>

                    {/* Totals & Footer Info */}
                    <div style={{ marginTop: '5px' }}>
                        {subtotal !== undefined && taxAmount !== undefined && taxAmount > 0 && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px', color: 'black' }}>
                                    <span>Subtotal:</span>
                                    <span>{currencySymbol}&nbsp;{subtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px', color: 'black' }}>
                                    <span>Tax:</span>
                                    <span>{currencySymbol}&nbsp;{taxAmount.toFixed(2)}</span>
                                </div>
                                <div style={{ borderTop: '1px dashed black', margin: '4px 0' }}></div>
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', color: 'black', marginTop: '5px' }}>
                            <span>TOTAL:</span>
                            <span>{currencySymbol}&nbsp;{total.toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px', color: 'black' }}>
                            <span>Payment Method:</span>
                            <span style={{ fontWeight: 'bold' }}>{paymentMethod.toUpperCase()}</span>
                        </div>

                        {/* Special Credit Sale Info */}
                        {isCredit && creditorName && (
                            <div style={{ marginTop: '15px', padding: '10px', border: '1px solid black', fontSize: '11px', color: 'black' }}>
                                <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '6px', fontSize: '12px' }}>CREDIT SALE DETAILS</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                    <span>Customer:</span>
                                    <span style={{ fontWeight: 'bold' }}>{creditorName}</span>
                                </div>
                                {dueDate && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Due Date:</span>
                                        <span style={{ fontWeight: 'bold' }}>{dueDate.toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Message */}
                    <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '11px', whiteSpace: 'pre-wrap', color: 'black', fontStyle: 'italic' }}>
                        {footerMsg || 'Thank you for your purchase!'}
                    </div>
                </div>
            </div>
        );
    }
);

ReceiptPrinter.displayName = 'ReceiptPrinter';
