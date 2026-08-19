import { collection, doc, getDocs, setDoc, updateDoc, query, orderBy, limit, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { StockMovement, StockMovementType, Product } from '../types';
import { logAuditEvent } from './auditService';

export interface StockAdjustmentParams {
  productId: string;
  type: StockMovementType;
  quantityChange: number; // positive or negative
  reason: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
}

export async function adjustStock(params: StockAdjustmentParams): Promise<StockMovement> {
  const { productId, type, quantityChange, reason, performedBy, performedByName, performedByRole } = params;

  try {
    const movement = await runTransaction(db, async (transaction) => {
      const productRef = doc(db, 'products', productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error('Product not found.');
      }

      const pData = productSnap.data() as Product;
      const prevStock = Number(pData.currentStock || 0);
      const newStock = Math.max(0, prevStock + quantityChange);

      transaction.update(productRef, {
        currentStock: newStock,
        updatedAt: new Date().toISOString(),
        updatedBy: performedBy,
      });

      const movementId = `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const movementRecord: StockMovement = {
        movementId,
        productId,
        barcode: pData.barcode || '',
        productName: pData.name,
        type,
        quantity: quantityChange,
        previousStock: prevStock,
        newStock,
        referenceId: movementId,
        referenceType: 'ADJUSTMENT',
        reason,
        performedBy,
        performedByName,
        createdAt: new Date().toISOString(),
      };

      transaction.set(doc(db, 'stockMovements', movementId), movementRecord);

      return movementRecord;
    });

    await logAuditEvent(
      performedBy,
      performedByName,
      performedByRole,
      'STOCK_ADJUSTMENT',
      'INVENTORY',
      `Adjusted stock for ${movement.productName} by ${quantityChange > 0 ? '+' : ''}${quantityChange} (${reason})`,
      movement.movementId
    );

    return movement;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'stockMovements');
    throw err;
  }
}

export async function getStockMovements(max: number = 100): Promise<StockMovement[]> {
  try {
    const q = query(collection(db, 'stockMovements'), orderBy('createdAt', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as StockMovement);
  } catch {
    try {
      const snapshot = await getDocs(collection(db, 'stockMovements'));
      return snapshot.docs
        .map((d) => d.data() as StockMovement)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'stockMovements');
      return [];
    }
  }
}

export function calculateInventoryValuation(products: Product[]) {
  const activeProducts = products.filter((p) => p.status === 'ACTIVE');
  const totalItemsCount = activeProducts.reduce((sum, p) => sum + (p.currentStock > 0 ? p.currentStock : 0), 0);
  const totalCostValue = activeProducts.reduce((sum, p) => sum + (p.currentStock > 0 ? p.currentStock * p.costPrice : 0), 0);
  const totalRetailValue = activeProducts.reduce((sum, p) => sum + (p.currentStock > 0 ? p.currentStock * p.sellingPrice : 0), 0);
  const potentialGrossProfit = Math.max(0, totalRetailValue - totalCostValue);
  const lowStockCount = activeProducts.filter((p) => p.currentStock <= p.reorderLevel).length;
  const outOfStockCount = activeProducts.filter((p) => p.currentStock <= 0).length;

  return {
    totalSkus: activeProducts.length,
    totalItemsCount,
    totalCostValue,
    totalRetailValue,
    potentialGrossProfit,
    lowStockCount,
    outOfStockCount,
  };
}
