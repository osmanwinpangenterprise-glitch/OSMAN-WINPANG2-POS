import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { getProducts } from '../services/productService';

interface InventoryAlertsContextType {
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  allAlertProducts: Product[];
  totalAlertsCount: number;
  isChecking: boolean;
  lastChecked: Date | null;
  runBackgroundCheck: () => Promise<void>;
  dismissedProductIds: string[];
  dismissAlert: (productId: string) => void;
  clearDismissed: () => void;
}

const InventoryAlertsContext = createContext<InventoryAlertsContextType | undefined>(undefined);

export const InventoryAlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [dismissedProductIds, setDismissedProductIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('owe_dismissed_inventory_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const runBackgroundCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const pList = await getProducts();
      setProducts(pList.filter((p) => p.status === 'ACTIVE'));
      setLastChecked(new Date());
    } catch (err) {
      console.warn('Inventory background check error:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Initial check and periodic background timer (every 45 seconds)
  useEffect(() => {
    runBackgroundCheck();
    const interval = setInterval(() => {
      runBackgroundCheck();
    }, 45000);

    return () => clearInterval(interval);
  }, [runBackgroundCheck]);

  const outOfStockProducts = products.filter((p) => p.currentStock <= 0);
  const lowStockProducts = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= (p.reorderLevel ?? 5)
  );
  const allAlertProducts = [...outOfStockProducts, ...lowStockProducts];
  const totalAlertsCount = allAlertProducts.length;

  const dismissAlert = (productId: string) => {
    setDismissedProductIds((prev) => {
      const updated = Array.from(new Set([...prev, productId]));
      try {
        localStorage.setItem('owe_dismissed_inventory_alerts', JSON.stringify(updated));
      } catch {
        // Ignore storage failures
      }
      return updated;
    });
  };

  const clearDismissed = () => {
    setDismissedProductIds([]);
    try {
      localStorage.removeItem('owe_dismissed_inventory_alerts');
    } catch {
      // Ignore
    }
  };

  return (
    <InventoryAlertsContext.Provider
      value={{
        lowStockProducts,
        outOfStockProducts,
        allAlertProducts,
        totalAlertsCount,
        isChecking,
        lastChecked,
        runBackgroundCheck,
        dismissedProductIds,
        dismissAlert,
        clearDismissed,
      }}
    >
      {children}
    </InventoryAlertsContext.Provider>
  );
};

export const useInventoryAlerts = (): InventoryAlertsContextType => {
  const context = useContext(InventoryAlertsContext);
  if (!context) {
    throw new Error('useInventoryAlerts must be used within an InventoryAlertsProvider');
  }
  return context;
};
