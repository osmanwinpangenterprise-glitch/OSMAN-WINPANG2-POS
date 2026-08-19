import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { HeldSale } from '../../types';
import {
  ShoppingCart,
  User,
  Trash2,
  Minus,
  Plus,
  Tag,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  CreditCard,
} from 'lucide-react';

interface CartSidebarProps {
  onOpenPaymentModal: () => void;
  onOpenCustomerModal: () => void;
  onOpenHeldSalesModal: () => void;
  onOpenDiscountModal: (productId?: string) => void;
}

export function CartSidebar({
  onOpenPaymentModal,
  onOpenCustomerModal,
  onOpenHeldSalesModal,
  onOpenDiscountModal,
}: CartSidebarProps) {
  const {
    cart,
    customer,
    updateQuantity,
    removeFromCart,
    clearCart,
    itemCount,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    holdSale,
  } = useCart();

  const { formatCurrency, settings } = useSettings();
  const { isCashier } = useAuth();
  const [heldCount, setHeldCount] = useState<number>(0);

  // Real-time held sales count listener
  useEffect(() => {
    const q = query(collection(db, 'heldSales'), where('status', '==', 'HELD'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setHeldCount(snap.size);
      },
      (err) => console.debug('Held sales count error:', err)
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* 1. Header: Customer Pill & Cart Title */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm text-slate-100">Active Order Cart</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Customer Select Banner */}
        <button
          onClick={onOpenCustomerModal}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
            customer.customerId !== 'CUST-WALKIN'
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
              : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <span className="font-semibold text-xs text-slate-100 block truncate">{customer.fullName}</span>
              <span className="text-[10px] text-slate-400 block truncate">
                {customer.customerType === 'CREDIT' ? (
                  <span className="text-amber-400 font-medium">Credit Acct (Bal: {formatCurrency(customer.balance)})</span>
                ) : customer.customerType === 'WHOLESALE' ? (
                  <span className="text-emerald-400 font-medium">Wholesale Pricing Tier</span>
                ) : (
                  'Walk-In Customer (F4)'
                )}
              </span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium shrink-0">
            Change
          </span>
        </button>
      </div>

      {/* 2. Scrollable Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center space-y-2">
            <ShoppingCart className="w-12 h-12 text-slate-700 stroke-1" />
            <p className="font-semibold text-slate-400">Cart is Empty</p>
            <p className="text-slate-500 max-w-[200px]">Scan a barcode or click catalog items to begin sale.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.productId}
              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5"
            >
              {/* Row 1: Item Name & Price */}
              <div className="flex items-start justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="font-semibold text-xs text-slate-100 block truncate">{item.name}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span>{formatCurrency(item.unitPrice)}</span>
                    <span>×</span>
                    <span className="text-emerald-400 font-bold">{item.quantity} {item.unit}</span>
                  </div>
                </div>
                <span className="font-bold text-xs text-slate-100 whitespace-nowrap">
                  {formatCurrency(item.total)}
                </span>
              </div>

              {/* Row 2: Stepper, Discount Tag, Delete */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                {/* Quantity Stepper */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-bold text-xs text-slate-200">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Discount & Delete */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenDiscountModal(item.productId)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-colors ${
                      item.discount > 0
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title="Apply item discount"
                  >
                    <Tag className="w-3 h-3" />
                    <span>{item.discount > 0 ? `-${formatCurrency(item.discount)}` : 'Disc'}</span>
                  </button>

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. Summary Totals & Actions Drawer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-900 space-y-3">
        {/* Breakdown */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-amber-400 font-medium">
              <span>Total Discount</span>
              <span>-{formatCurrency(discountTotal)}</span>
            </div>
          )}
          {settings.taxEnabled && (
            <div className="flex justify-between text-slate-400">
              <span>{settings.taxName || 'Tax / VAT'}</span>
              <span>{formatCurrency(taxTotal)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
            <span className="font-bold text-sm text-slate-200">TOTAL DUE</span>
            <span className="font-extrabold text-xl text-emerald-400 tracking-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Action Buttons: Hold / Retrieve / Overall Discount */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onOpenDiscountModal(undefined)}
            disabled={cart.length === 0}
            className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-700"
          >
            <Tag className="w-3 h-3 text-amber-400" />
            <span>Discount</span>
          </button>

          <button
            onClick={() => holdSale()}
            disabled={cart.length === 0}
            className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-700"
            title="Hold current sale (F8)"
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>Hold (F8)</span>
          </button>

          <button
            onClick={onOpenHeldSalesModal}
            className="relative py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-700"
            title="Retrieve held sales (F9)"
          >
            <FileText className="w-3 h-3 text-emerald-400" />
            <span>Recall (F9)</span>
            {heldCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-cyan-600 text-white font-bold text-[9px] shadow-md">
                {heldCount}
              </span>
            )}
          </button>
        </div>

        {/* COMPLETE SALE MAIN BUTTON (F10) */}
        <button
          onClick={onOpenPaymentModal}
          disabled={cart.length === 0}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
        >
          <CreditCard className="w-4 h-4" />
          <span>PAY & COMPLETE SALE (F6 / F10)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
