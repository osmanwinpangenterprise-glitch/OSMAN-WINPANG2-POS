import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useCashSession } from '../../context/CashSessionContext';
import { useToast } from '../../context/ToastContext';
import { PaymentMethod, Sale } from '../../types';
import { completeSaleTransaction } from '../../services/posService';
import { Modal } from '../common/Modal';
import confetti from 'canvas-confetti';
import {
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted: (sale: Sale) => void;
}

export function PaymentModal({ isOpen, onClose, onSaleCompleted }: PaymentModalProps) {
  const {
    cart,
    customer,
    grandTotal,
    orderDiscount,
    orderDiscountType,
    orderNotes,
    clearCart,
    playSuccessSound,
    playErrorSound,
  } = useCart();

  const { settings, formatCurrency } = useSettings();
  const { profile } = useAuth();
  const { activeSession, recordCashSale } = useCashSession();
  const { success, error: toastError, warning } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [momoProvider, setMomoProvider] = useState<'MTN' | 'TELECEL' | 'AT'>('MTN');
  const [loading, setLoading] = useState<boolean>(false);

  // Set default tender amount when modal opens
  useEffect(() => {
    if (isOpen) {
      setTenderAmount(grandTotal.toString());
      setPaymentReference('');
    }
  }, [isOpen, grandTotal]);

  const numericTender = Number(tenderAmount) || 0;
  const changeDue = Math.max(0, numericTender - grandTotal);
  const isTenderSufficient = paymentMethod === 'CREDIT' || numericTender >= grandTotal;

  // Credit limit validation
  const creditLimitExceeded = useMemo(() => {
    if (paymentMethod !== 'CREDIT') return false;
    if (customer.customerId === 'CUST-WALKIN') return true; // Walk-in cannot take credit
    if (customer.creditLimit <= 0) return false; // 0 = unlimited
    return customer.balance + grandTotal > customer.creditLimit;
  }, [paymentMethod, customer, grandTotal]);

  // Cash quick presets
  const quickCashPresets = useMemo(() => {
    const ceil = Math.ceil(grandTotal);
    const presets = [grandTotal];
    [10, 20, 50, 100, 200, 500].forEach((round) => {
      const nextRound = Math.ceil(grandTotal / round) * round;
      if (!presets.includes(nextRound) && nextRound >= grandTotal) {
        presets.push(nextRound);
      }
    });
    return Array.from(new Set(presets)).sort((a, b) => a - b).slice(0, 5);
  }, [grandTotal]);

  const handleCompleteSale = async () => {
    if (paymentMethod === 'CREDIT' && customer.customerId === 'CUST-WALKIN') {
      playErrorSound();
      warning('Customer Required', 'Please assign a registered customer account before processing on Credit.');
      return;
    }

    if (paymentMethod === 'CREDIT' && creditLimitExceeded) {
      playErrorSound();
      warning('Credit Limit Exceeded', `Customer credit limit of ${formatCurrency(customer.creditLimit)} would be breached.`);
      return;
    }

    if (paymentMethod !== 'CREDIT' && numericTender < grandTotal) {
      playErrorSound();
      warning('Insufficient Tender', 'Tender amount cannot be less than total due.');
      return;
    }

    setLoading(true);
    try {
      const saleRecord = await completeSaleTransaction({
        cart,
        customer,
        paymentMethod,
        amountPaid: paymentMethod === 'CREDIT' ? 0 : numericTender,
        paymentReference,
        mobileMoneyProvider: paymentMethod === 'MOBILE_MONEY' ? momoProvider : undefined,
        orderDiscount,
        orderDiscountType,
        orderNotes,
        cashierId: profile?.userId || 'cashier-01',
        cashierName: profile?.fullName || 'Cashier',
        sessionId: activeSession?.sessionId,
        settings,
      });

      // Update cash drawer if paid by Cash
      if (paymentMethod === 'CASH') {
        const cashAmountAdded = Math.min(numericTender, grandTotal);
        await recordCashSale(cashAmountAdded);
      }

      // Celebrate
      playSuccessSound();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        console.debug('Confetti error', e);
      }

      success('Sale Completed Successfully', `Receipt: ${saleRecord.receiptNumber}`);
      clearCart();
      onClose();
      onSaleCompleted(saleRecord);
    } catch (err: unknown) {
      playErrorSound();
      toastError('Checkout Failed', err instanceof Error ? err.message : 'Please retry checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Payment & Checkout" maxWidth="2xl">
      <div className="space-y-4">
        {/* Total Banner */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">TOTAL DUE NOW</span>
            <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
              {formatCurrency(grandTotal)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">CUSTOMER</span>
            <div className="text-xs font-semibold text-slate-200">{customer.fullName}</div>
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { id: 'CASH' as PaymentMethod, label: 'Cash', icon: Banknote },
            { id: 'MOBILE_MONEY' as PaymentMethod, label: 'MoMo', icon: Smartphone },
            { id: 'CARD' as PaymentMethod, label: 'Card / POS', icon: CreditCard },
            { id: 'BANK_TRANSFER' as PaymentMethod, label: 'Bank', icon: Building2 },
            { id: 'CREDIT' as PaymentMethod, label: 'Credit Account', icon: Users },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setPaymentMethod(m.id);
                  if (m.id === 'CREDIT') {
                    setTenderAmount('0');
                  } else {
                    setTenderAmount(grandTotal.toString());
                  }
                }}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Payment-Specific Details */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          {paymentMethod === 'CASH' && (
            <div className="space-y-3">
              {/* Tender Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cash Tendered Amount ({settings.currency || 'GHS'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xl font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              {/* Fast Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                {quickCashPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTenderAmount(preset.toString())}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors font-mono"
                  >
                    {preset === grandTotal ? 'Exact' : formatCurrency(preset)}
                  </button>
                ))}
              </div>

              {/* Change Calculation Display */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">CHANGE TO RETURN</span>
                <span className="text-lg font-extrabold text-amber-400 font-mono">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'MOBILE_MONEY' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">Select Mobile Money Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'MTN', label: 'MTN MoMo', color: 'border-yellow-500/50 text-yellow-400' },
                  { id: 'TELECEL', label: 'Telecel Cash', color: 'border-red-500/50 text-red-400' },
                  { id: 'AT', label: 'AT Money', color: 'border-blue-500/50 text-blue-400' },
                ].map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setMomoProvider(prov.id as 'MTN' | 'TELECEL' | 'AT')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      momoProvider === prov.id
                        ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {prov.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  MoMo Transaction ID / Reference
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. 29384910293 or Phone number"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {(paymentMethod === 'CARD' || paymentMethod === 'BANK_TRANSFER') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Authorization / Transaction Reference Number
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. STANBIC-TRX-94812"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {paymentMethod === 'CREDIT' && (
            <div className="space-y-2">
              {customer.customerId === 'CUST-WALKIN' ? (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Walk-in customers cannot make purchases on credit. Please switch customer account.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Outstanding Balance:</span>
                    <span className="font-bold text-slate-200">{formatCurrency(customer.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Credit Limit:</span>
                    <span className="font-bold text-slate-200">
                      {customer.creditLimit > 0 ? formatCurrency(customer.creditLimit) : 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-emerald-400 font-semibold">
                    <span>New Balance After Sale:</span>
                    <span>{formatCurrency(customer.balance + grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCompleteSale}
            disabled={loading || !isTenderSufficient || creditLimitExceeded}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Transaction...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM & PRINT RECEIPT</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
