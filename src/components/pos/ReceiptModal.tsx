import React, { useRef } from 'react';
import { Sale } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { Modal } from '../common/Modal';
import { Printer, Check, Copy, Share2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export function ReceiptModal({ isOpen, onClose, sale }: ReceiptModalProps) {
  const { settings, formatCurrency } = useSettings();
  const { success } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
========================================
${settings.businessName}
${settings.address || 'Accra, Ghana'}
Tel: ${settings.phone || 'N/A'}
========================================
Receipt: ${sale.receiptNumber}
Date: ${new Date(sale.createdAt).toLocaleString()}
Cashier: ${sale.cashierName}
Customer: ${sale.customerName}
Payment: ${sale.paymentMethod}
----------------------------------------
${sale.items.map((i) => `${i.productName}\n  ${i.quantity} x ${formatCurrency(i.unitPrice)} = ${formatCurrency(i.total)}`).join('\n')}
----------------------------------------
Subtotal: ${formatCurrency(sale.subtotal)}
Discount: -${formatCurrency(sale.discount)}
Tax/VAT:  ${formatCurrency(sale.tax)}
TOTAL:    ${formatCurrency(sale.total)}
Paid:     ${formatCurrency(sale.amountPaid)}
Change:   ${formatCurrency(sale.change)}
========================================
${settings.receiptFooter || 'Thank you for your business!'}
    `.trim();

    navigator.clipboard.writeText(text);
    success('Copied to Clipboard', 'Receipt text summary copied.');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receipt: ${sale.receiptNumber}`} maxWidth="md">
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between no-print bg-slate-950 p-2 rounded-xl border border-slate-800">
          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Text</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div
          ref={receiptRef}
          id="printable-receipt"
          className="bg-white text-slate-900 p-6 rounded-2xl shadow-xl font-mono text-xs max-w-sm mx-auto border border-slate-200 select-text"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <h2 className="font-extrabold text-base tracking-tight text-slate-950 uppercase">
              {settings.businessName || 'Osman Winpang Enterprise'}
            </h2>
            {settings.address && <p className="text-[10px] text-slate-600">{settings.address}</p>}
            {settings.phone && <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>}
            {settings.taxId && <p className="text-[10px] text-slate-600">TIN / VAT: {settings.taxId}</p>}
          </div>

          {/* Transaction Metadata */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[11px] text-slate-700">
            <div className="flex justify-between">
              <span>Receipt No:</span>
              <span className="font-bold text-slate-950">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span>{new Date(sale.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{sale.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-semibold">{sale.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="font-bold">{sale.paymentMethod}</span>
            </div>
            {sale.paymentReference && (
              <div className="flex justify-between">
                <span>Ref:</span>
                <span>{sale.paymentReference}</span>
              </div>
            )}
          </div>

          {/* Itemized Lines */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
            <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase">
              <span>Item / Qty</span>
              <span>Total</span>
            </div>
            {sale.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-semibold text-slate-900">
                  <span className="truncate max-w-[200px]">{item.productName}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                    {item.discount > 0 && ` (-${formatCurrency(item.discount)})`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-slate-800">
            <div className="flex justify-between text-[11px]">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-[11px] text-rose-600">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between text-[11px]">
                <span>{settings.taxName || 'Tax / VAT'}:</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm text-slate-950 pt-1 border-t border-slate-300">
              <span>GRAND TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span>Amount Paid:</span>
              <span>{formatCurrency(sale.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Change:</span>
              <span>{formatCurrency(sale.change)}</span>
            </div>
          </div>

          {/* Footer & Barcode Representation */}
          <div className="text-center pt-3 space-y-2">
            <p className="text-[10px] text-slate-600 font-medium">
              {settings.receiptFooter || 'Thank you for your business! Please come again.'}
            </p>
            {/* Monospace simulated barcode */}
            <div className="font-mono text-[10px] tracking-widest text-slate-700 bg-slate-100 py-1 rounded">
              ||| | |||| || ||||| ||| ||||
              <div className="text-[9px] text-slate-500 tracking-normal">{sale.receiptNumber}</div>
            </div>
          </div>
        </div>

        {/* Modal Close Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
