import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ProductGrid } from './ProductGrid';
import { CartSidebar } from './CartSidebar';
import { PaymentModal } from './PaymentModal';
import { CustomerSelectModal } from './CustomerSelectModal';
import { HeldSalesModal } from './HeldSalesModal';
import { ItemDiscountModal } from './ItemDiscountModal';
import { ReceiptModal } from './ReceiptModal';
import { Product, Category, Sale } from '../../types';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getProductByBarcode } from '../../services/productService';

export function PosView() {
  const { cart, holdSale, clearCart, addToCart } = useCart();
  const { success, warning } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isHeldSalesOpen, setIsHeldSalesOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [discountProductId, setDiscountProductId] = useState<string | undefined>(undefined);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Real-time catalog subscription
  useEffect(() => {
    const unsubProds = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as Product)
        .filter((p) => p.status !== 'ARCHIVED');
      setProducts(list);
      setLoading(false);
    });

    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as Category)
        .filter((c) => c.status === 'ACTIVE');
      setCategories(list);
    });

    return () => {
      unsubProds();
      unsubCats();
    };
  }, []);

  // USB/Bluetooth Barcode Scanner Hardware Hook
  useBarcodeScanner({
    onScan: async (barcode) => {
      try {
        const prod = await getProductByBarcode(barcode);
        if (prod) {
          addToCart(prod, 1);
          success('Scanned Item Added', `${prod.name} added to cart.`);
        } else {
          warning('Unknown Barcode', `No product found matching barcode ${barcode}`);
        }
      } catch (err) {
        console.debug('Scan error:', err);
      }
    },
    minChars: 3,
  });

  // POS Physical Keyboard Shortcut Handler
  useKeyboardShortcuts({
    onSearchProduct: () => {
      const searchInput = document.getElementById('pos-product-search');
      if (searchInput) searchInput.focus();
    },
    onOpenPayment: () => {
      if (cart.length > 0) setIsPaymentOpen(true);
    },
    onHoldSale: async () => {
      if (cart.length > 0) {
        await holdSale('Parked via F8 shortcut');
        success('Sale Held', 'Cart saved to hold queue.');
      }
    },
    onRetrieveSale: () => {
      setIsHeldSalesOpen(true);
    },
    onSelectCustomer: () => {
      setIsCustomerOpen(true);
    },
    onCloseModal: () => {
      setIsPaymentOpen(false);
      setIsCustomerOpen(false);
      setIsHeldSalesOpen(false);
      setIsDiscountOpen(false);
      setIsReceiptOpen(false);
    },
  });

  const handleOpenDiscount = (productId?: string) => {
    setDiscountProductId(productId);
    setIsDiscountOpen(true);
  };

  const handleSaleSuccess = (sale: Sale) => {
    setLastCompletedSale(sale);
    setIsReceiptOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-950">
      {/* Center / Left: Product Catalog & Fast Tapping Grid */}
      <div className="flex-1 h-full overflow-hidden flex flex-col border-r border-slate-800/80">
        <ProductGrid products={products} categories={categories} loading={loading} />
      </div>

      {/* Right Sidebar: Active Cart, Calculations, and Quick Action Buttons */}
      <div className="w-full lg:w-[420px] shrink-0 h-full overflow-hidden flex flex-col bg-slate-900 border-l border-slate-800">
        <CartSidebar
          onOpenCustomerModal={() => setIsCustomerOpen(true)}
          onOpenHeldSalesModal={() => setIsHeldSalesOpen(true)}
          onOpenDiscountModal={handleOpenDiscount}
          onOpenPaymentModal={() => setIsPaymentOpen(true)}
        />
      </div>

      {/* POS Sub-Modals */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSaleCompleted={handleSaleSuccess}
      />

      <CustomerSelectModal
        isOpen={isCustomerOpen}
        onClose={() => setIsCustomerOpen(false)}
      />

      <HeldSalesModal
        isOpen={isHeldSalesOpen}
        onClose={() => setIsHeldSalesOpen(false)}
      />

      <ItemDiscountModal
        isOpen={isDiscountOpen}
        onClose={() => setIsDiscountOpen(false)}
        productId={discountProductId}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={lastCompletedSale}
      />
    </div>
  );
}
