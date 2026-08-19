import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { CartItem, Customer, Product, HeldSale } from '../types';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { collection, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';

interface CartContextType {
  cart: CartItem[];
  customer: Customer;
  setCustomer: (cust: Customer) => void;
  orderDiscount: number;
  orderDiscountType: 'PERCENT' | 'FIXED';
  setOrderDiscount: (discount: number, type?: 'PERCENT' | 'FIXED') => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number, isPercent?: boolean) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  holdSale: (notes?: string) => Promise<void>;
  retrieveHeldSale: (heldSale: HeldSale) => void;
  playBeep: () => void;
  playSuccessSound: () => void;
  playErrorSound: () => void;
}

const DEFAULT_WALK_IN_CUSTOMER: Customer = {
  customerId: 'CUST-WALKIN',
  customerCode: 'WALK-IN',
  fullName: 'Walk-in Customer',
  phone: 'N/A',
  customerType: 'WALK_IN',
  creditLimit: 0,
  balance: 0,
  totalPurchases: 0,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const CartContext = createContext<CartContextType | undefined>(undefined);

// Web Audio synthesizer for tactile hardware-like feedback
function createAudioFeedback() {
  const ctx = typeof window !== 'undefined' ? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)() : null;

  return {
    beep: () => {
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch (e) {
        console.debug('Audio unavailable', e);
      }
    },
    success: () => {
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.06, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + (i + 1) * 0.12);
        });
      } catch (e) {
        console.debug('Audio unavailable', e);
      }
    },
    error: () => {
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (e) {
        console.debug('Audio unavailable', e);
      }
    },
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { profile } = useAuth();
  const { success, warning, error: toastError } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>(DEFAULT_WALK_IN_CUSTOMER);
  const [orderDiscount, setOrderDiscountState] = useState<number>(0);
  const [orderDiscountType, setOrderDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [orderNotes, setOrderNotes] = useState<string>('');

  const audio = useMemo(() => createAudioFeedback(), []);

  const playBeep = useCallback(() => audio.beep(), [audio]);
  const playSuccessSound = useCallback(() => audio.success(), [audio]);
  const playErrorSound = useCallback(() => audio.error(), [audio]);

  const addToCart = useCallback(
    (product: Product, quantityToAdd: number = 1) => {
      if (product.currentStock <= 0 && !settings.allowNegativeStock) {
        playErrorSound();
        warning('Out of Stock', `${product.name} has no available units.`);
        return;
      }

      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.productId === product.productId);
        const effectivePrice = customer.customerType === 'WHOLESALE' && product.wholesalePrice > 0 ? product.wholesalePrice : product.sellingPrice;
        const taxRate = settings.taxEnabled && product.taxable ? product.taxRate || settings.taxRate : 0;

        if (existingIndex > -1) {
          const item = prev[existingIndex];
          const newQty = item.quantity + quantityToAdd;

          if (newQty > product.currentStock && !settings.allowNegativeStock) {
            playErrorSound();
            warning('Max Stock Reached', `Only ${product.currentStock} units available.`);
            return prev;
          }

          const rawSubtotal = item.unitPrice * newQty;
          const discountedSubtotal = Math.max(0, rawSubtotal - item.discount);
          const taxAmount = discountedSubtotal * taxRate;

          const updatedItem: CartItem = {
            ...item,
            quantity: newQty,
            subtotal: discountedSubtotal,
            taxAmount,
            total: discountedSubtotal + taxAmount,
          };

          const updated = [...prev];
          updated[existingIndex] = updatedItem;
          playBeep();
          return updated;
        } else {
          const rawSubtotal = effectivePrice * quantityToAdd;
          const taxAmount = rawSubtotal * taxRate;

          const newItem: CartItem = {
            productId: product.productId,
            barcode: product.barcode || '',
            name: product.name,
            unit: product.unit || 'PCS',
            quantity: quantityToAdd,
            unitCost: product.costPrice,
            unitPrice: effectivePrice,
            discount: 0,
            discountPercent: 0,
            taxRate,
            taxable: product.taxable ?? true,
            subtotal: rawSubtotal,
            taxAmount,
            total: rawSubtotal + taxAmount,
          };

          playBeep();
          return [newItem, ...prev];
        }
      });
    },
    [customer.customerType, settings.allowNegativeStock, settings.taxEnabled, settings.taxRate, playBeep, playErrorSound, warning]
  );

  const updateQuantity = useCallback(
    (productId: string, newQty: number) => {
      if (newQty <= 0) {
        removeFromCart(productId);
        return;
      }

      setCart((prev) =>
        prev.map((item) => {
          if (item.productId !== productId) return item;
          const rawSubtotal = item.unitPrice * newQty;
          const discountedSubtotal = Math.max(0, rawSubtotal - item.discount);
          const taxAmount = discountedSubtotal * item.taxRate;

          return {
            ...item,
            quantity: newQty,
            subtotal: discountedSubtotal,
            taxAmount,
            total: discountedSubtotal + taxAmount,
          };
        })
      );
      playBeep();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playBeep]
  );

  const updateItemDiscount = useCallback(
    (productId: string, discountVal: number, isPercent: boolean = false) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.productId !== productId) return item;

          const rawTotal = item.unitPrice * item.quantity;
          let calculatedDiscount = 0;
          let calculatedPercent = 0;

          if (isPercent) {
            calculatedPercent = Math.min(100, Math.max(0, discountVal));
            calculatedDiscount = (rawTotal * calculatedPercent) / 100;
          } else {
            calculatedDiscount = Math.min(rawTotal, Math.max(0, discountVal));
            calculatedPercent = rawTotal > 0 ? (calculatedDiscount / rawTotal) * 100 : 0;
          }

          const discountedSubtotal = rawTotal - calculatedDiscount;
          const taxAmount = discountedSubtotal * item.taxRate;

          return {
            ...item,
            discount: calculatedDiscount,
            discountPercent: calculatedPercent,
            subtotal: discountedSubtotal,
            taxAmount,
            total: discountedSubtotal + taxAmount,
          };
        })
      );
    },
    []
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomer(DEFAULT_WALK_IN_CUSTOMER);
    setOrderDiscountState(0);
    setOrderNotes('');
  }, []);

  const setOrderDiscount = useCallback((val: number, type: 'PERCENT' | 'FIXED' = 'PERCENT') => {
    setOrderDiscountState(val);
    setOrderDiscountType(type);
  }, []);

  // Totals calculations
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const rawCartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cart]);
  const itemDiscountsTotal = useMemo(() => cart.reduce((sum, item) => sum + item.discount, 0), [cart]);

  const subtotalAfterItemDiscounts = rawCartSubtotal - itemDiscountsTotal;

  const orderDiscountAmount = useMemo(() => {
    if (orderDiscount <= 0) return 0;
    if (orderDiscountType === 'PERCENT') {
      return (subtotalAfterItemDiscounts * Math.min(100, orderDiscount)) / 100;
    }
    return Math.min(subtotalAfterItemDiscounts, orderDiscount);
  }, [subtotalAfterItemDiscounts, orderDiscount, orderDiscountType]);

  const discountTotal = itemDiscountsTotal + orderDiscountAmount;
  const taxableSubtotal = Math.max(0, rawCartSubtotal - discountTotal);

  const taxTotal = useMemo(() => {
    if (!settings.taxEnabled) return 0;
    return cart.reduce((sum, item) => {
      const itemProportion = rawCartSubtotal > 0 ? (item.unitPrice * item.quantity) / rawCartSubtotal : 0;
      const itemTaxableShare = taxableSubtotal * itemProportion;
      return sum + (item.taxable ? itemTaxableShare * item.taxRate : 0);
    }, 0);
  }, [settings.taxEnabled, cart, rawCartSubtotal, taxableSubtotal]);

  const grandTotal = Math.max(0, taxableSubtotal + taxTotal);

  // Hold current cart to Firestore
  const holdSale = async (notes?: string) => {
    if (cart.length === 0) {
      warning('Empty Cart', 'Add products before holding sale.');
      return;
    }

    try {
      const heldSaleId = `HELD-${Date.now()}`;
      const heldSale: HeldSale = {
        heldSaleId,
        cashierId: profile?.userId || 'cashier-01',
        cashierName: profile?.fullName || 'Cashier',
        customerId: customer.customerId,
        customerName: customer.fullName,
        items: cart,
        subtotal: rawCartSubtotal,
        discount: discountTotal,
        total: grandTotal,
        notes: notes || orderNotes || '',
        status: 'HELD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'heldSales', heldSaleId), heldSale);
      clearCart();
      success('Sale Placed on Hold', `Cart saved with ${cart.length} items.`);
    } catch (err) {
      toastError('Failed to Hold Sale', 'Please try again.');
      handleFirestoreError(err, OperationType.WRITE, 'heldSales');
    }
  };

  // Retrieve held sale
  const retrieveHeldSale = async (heldSale: HeldSale) => {
    setCart(heldSale.items);
    setCustomer({
      ...DEFAULT_WALK_IN_CUSTOMER,
      customerId: heldSale.customerId,
      fullName: heldSale.customerName,
    });
    setOrderNotes(heldSale.notes || '');

    try {
      await updateDoc(doc(db, 'heldSales', heldSale.heldSaleId), {
        status: 'RETRIEVED',
        updatedAt: new Date().toISOString(),
      });
      success('Sale Retrieved', `Loaded ${heldSale.items.length} items into cart.`);
    } catch (err) {
      console.warn('Could not update held sale status in database:', err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        customer,
        setCustomer,
        orderDiscount,
        orderDiscountType,
        setOrderDiscount,
        orderNotes,
        setOrderNotes,
        addToCart,
        updateQuantity,
        updateItemDiscount,
        removeFromCart,
        clearCart,
        itemCount,
        subtotal: rawCartSubtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        holdSale,
        retrieveHeldSale,
        playBeep,
        playSuccessSound,
        playErrorSound,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
