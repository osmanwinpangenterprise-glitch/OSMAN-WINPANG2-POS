import React, { useState, useEffect, useMemo } from 'react';
import { Sale } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSalesHistory, voidSale, refundSale } from '../../services/salesService';
import { exportSalesSummaryCSV, exportItemizedSalesCSV } from '../../services/reportService';
import { ReceiptModal } from '../pos/ReceiptModal';
import { Modal } from '../common/Modal';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Printer,
  Ban,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

export function SalesHistoryView() {
  const { formatCurrency } = useSettings();
  const { profile, isManager, isAdmin } = useAuth();
  const { success, error: toastError, warning } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Sale for Details or Reprint
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Void Modal State
  const [isVoidModalOpen, setIsVoidModalOpen] = useState<boolean>(false);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voiding, setVoiding] = useState<boolean>(false);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refunding, setRefunding] = useState<boolean>(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const list = await getSalesHistory(200);
      setSales(list);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesPayment = paymentFilter === 'ALL' || s.paymentMethod === paymentFilter;
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.receiptNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        (s.paymentReference && s.paymentReference.toLowerCase().includes(q));

      return matchesPayment && matchesStatus && matchesSearch;
    });
  }, [sales, paymentFilter, statusFilter, search]);

  const handleOpenDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailsOpen(true);
  };

  const handleOpenReprint = (sale: Sale) => {
    setSelectedSale(sale);
    setIsReceiptOpen(true);
  };

  const handleOpenVoid = (sale: Sale) => {
    if (sale.status === 'VOID') {
      warning('Already Voided', 'This sale transaction has already been voided.');
      return;
    }
    setSelectedSale(sale);
    setVoidReason('Customer transaction error / cashier mistake');
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !voidReason.trim()) return;

    setVoiding(true);
    try {
      await voidSale(
        selectedSale.saleId,
        voidReason.trim(),
        profile?.userId || 'admin-01',
        profile?.fullName || 'User',
        profile?.role || 'ADMINISTRATOR'
      );
      success('Sale Voided', `Receipt ${selectedSale.receiptNumber} voided. Stock restored.`);
      setIsVoidModalOpen(false);
      loadSales();
    } catch (err: unknown) {
      toastError('Void Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setVoiding(false);
    }
  };

  const handleOpenRefund = (sale: Sale) => {
    if (sale.status === 'REFUNDED') {
      warning('Already Refunded', 'This sale transaction has already been refunded.');
      return;
    }
    setSelectedSale(sale);
    setRefundReason('Returned damaged goods');
    setIsRefundModalOpen(true);
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !refundReason.trim()) return;

    setRefunding(true);
    try {
      await refundSale(
        selectedSale.saleId,
        selectedSale.total,
        refundReason.trim(),
        profile?.userId || 'admin-01',
        profile?.fullName || 'User',
        profile?.role || 'ADMINISTRATOR'
      );
      success('Sale Refunded', `Receipt ${selectedSale.receiptNumber} refunded. Stock restored.`);
      setIsRefundModalOpen(false);
      loadSales();
    } catch (err: unknown) {
      toastError('Refund Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setRefunding(false);
    }
  };

  const handleExportSummaryCSV = () => {
    if (sales.length === 0) {
      toastError('Export Error', 'No sales records to export.');
      return;
    }
    exportSalesSummaryCSV(sales);
    success('CSV Exported', 'Sales transaction ledger downloaded.');
  };

  const handleExportItemizedCSV = () => {
    if (sales.length === 0) {
      toastError('Export Error', 'No sales records to export.');
      return;
    }
    exportItemizedSalesCSV(sales);
    success('CSV Exported', 'Itemized line-item sales breakdown downloaded.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Sales Transactions & Receipts</h2>
          <p className="text-xs text-slate-400">
            Authoritative sales registry, void audits, customer returns, and receipt reprints
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSummaryCSV}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Summary CSV</span>
          </button>

          <button
            onClick={handleExportItemizedCSV}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Itemized CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt number, customer, or cashier..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CARD">Card / POS</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CREDIT">Customer Credit</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Valid Sales)</option>
            <option value="VOID">Voided Transactions</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Receipt / Time</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Total (GH₵)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading sales records...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No sales transactions found matching filters.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.saleId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-100 font-mono block">{s.receiptNumber}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(s.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-medium">{s.customerName}</td>
                    <td className="px-4 py-3 text-slate-400">{s.cashierName}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200 block">{s.paymentMethod}</span>
                      {s.paymentReference && (
                        <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                          Ref: {s.paymentReference}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {s.discount > 0 ? `-${formatCurrency(s.discount)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(s.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : s.status === 'VOID'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetails(s)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View sale items & details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenReprint(s)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Reprint receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {(isManager || isAdmin) && s.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => handleOpenVoid(s)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Void sale (Restore inventory)"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenRefund(s)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-950 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Process refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Sale Details: ${selectedSale?.receiptNumber || ''}`}
        maxWidth="lg"
      >
        {selectedSale && (
          <div className="space-y-4">
            {/* Metadata banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Date & Time:</span>
                <span className="font-semibold text-slate-200">{new Date(selectedSale.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Customer:</span>
                <span className="font-semibold text-slate-200">{selectedSale.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cashier:</span>
                <span className="font-semibold text-slate-200">{selectedSale.cashierName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Method:</span>
                <span className="font-semibold text-emerald-400">{selectedSale.paymentMethod}</span>
              </div>
            </div>

            {/* Itemized lines */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-2">Item Name</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedSale.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-slate-200 block">{item.productName}</span>
                        {item.barcode && <span className="text-[10px] font-mono text-slate-500">#{item.barcode}</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-200">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">
                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-rose-400 font-medium">
                  <span>Order Discount:</span>
                  <span>-{formatCurrency(selectedSale.discount)}</span>
                </div>
              )}
              {selectedSale.tax > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Tax / VAT:</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm text-emerald-400 pt-1 border-t border-slate-800">
                <span>Grand Total:</span>
                <span>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDetailsOpen(false);
                  setIsReceiptOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Reprint Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Void Sale Modal */}
      <Modal isOpen={isVoidModalOpen} onClose={() => setIsVoidModalOpen(false)} title="Void Sale Transaction" maxWidth="sm">
        <form onSubmit={handleConfirmVoid} className="space-y-3">
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              Voiding receipt <strong>{selectedSale?.receiptNumber}</strong> will immediately cancel this revenue and restore sold items back into inventory stock.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Void *</label>
            <input
              type="text"
              required
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Wrong items entered by cashier"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsVoidModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={voiding}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950"
            >
              {voiding ? 'Voiding...' : 'Confirm Void & Restore Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Refund Sale Modal */}
      <Modal isOpen={isRefundModalOpen} onClose={() => setIsRefundModalOpen(false)} title="Process Sale Refund" maxWidth="sm">
        <form onSubmit={handleConfirmRefund} className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Refunding <strong>{formatCurrency(selectedSale?.total || 0)}</strong> for receipt {selectedSale?.receiptNumber}. Restores inventory stock.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Refund Reason *</label>
            <input
              type="text"
              required
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Customer returned damaged product"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRefundModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={refunding}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-950"
            >
              {refunding ? 'Processing...' : 'Confirm Refund & Return Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
      <ReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} sale={selectedSale} />
    </div>
  );
}
