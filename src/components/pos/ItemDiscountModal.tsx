import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Percent, DollarSign, Tag, AlertCircle } from 'lucide-react';

interface ItemDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
}

export function ItemDiscountModal({ isOpen, onClose, productId }: ItemDiscountModalProps) {
  const { cart, updateItemDiscount, orderDiscount, orderDiscountType, setOrderDiscount } = useCart();
  const { settings, formatCurrency } = useSettings();
  const { isCashier } = useAuth();
  const { warning } = useToast();

  const isLineItem = Boolean(productId);
  const targetItem = isLineItem ? cart.find((i) => i.productId === productId) : null;

  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (isLineItem && targetItem) {
        if (targetItem.discountPercent > 0) {
          setDiscountType('PERCENT');
          setDiscountValue(targetItem.discountPercent.toString());
        } else if (targetItem.discount > 0) {
          setDiscountType('FIXED');
          setDiscountValue(targetItem.discount.toString());
        } else {
          setDiscountType('PERCENT');
          setDiscountValue('0');
        }
      } else {
        setDiscountType(orderDiscountType);
        setDiscountValue(orderDiscount > 0 ? orderDiscount.toString() : '0');
      }
    }
  }, [isOpen, isLineItem, targetItem, orderDiscount, orderDiscountType]);

  const maxPercent = settings.maxDiscountPercent || 25;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(discountValue) || 0;

    if (val < 0) {
      warning('Invalid Discount', 'Discount amount cannot be negative.');
      return;
    }

    if (discountType === 'PERCENT' && isCashier && val > maxPercent) {
      warning('Discount Limit Exceeded', `Cashier discount is capped at max ${maxPercent}%. Manager authorization required.`);
      return;
    }

    if (isLineItem && productId) {
      updateItemDiscount(productId, val, discountType === 'PERCENT');
    } else {
      setOrderDiscount(val, discountType);
    }

    onClose();
  };

  const handleRemove = () => {
    if (isLineItem && productId) {
      updateItemDiscount(productId, 0, false);
    } else {
      setOrderDiscount(0, 'PERCENT');
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLineItem ? `Apply Discount to ${targetItem?.name || 'Item'}` : 'Apply Overall Order Discount'}
      maxWidth="sm"
    >
      <form onSubmit={handleApply} className="space-y-4">
        {/* Toggle Type */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDiscountType('PERCENT')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              discountType === 'PERCENT'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Percentage (%)</span>
          </button>

          <button
            type="button"
            onClick={() => setDiscountType('FIXED')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              discountType === 'FIXED'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Fixed ({settings.currency || 'GHS'})</span>
          </button>
        </div>

        {/* Value Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {discountType === 'PERCENT' ? 'Discount Percentage (0-100%)' : `Discount Amount (${settings.currency || 'GHS'})`}
          </label>
          <input
            type="number"
            step="any"
            min="0"
            max={discountType === 'PERCENT' ? 100 : undefined}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-lg font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
          {discountType === 'PERCENT' && isCashier && (
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              Maximum cashier policy discount: {maxPercent}%
            </p>
          )}
        </div>

        {/* Fast Percent Presets */}
        {discountType === 'PERCENT' && (
          <div className="flex gap-2">
            {[5, 10, 15, 20, 25].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDiscountValue(p.toString())}
                className="flex-1 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500 text-xs font-medium text-slate-300"
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium hover:underline"
          >
            Remove Discount
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950"
            >
              Apply
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
