import { collection, doc, getDocs, runTransaction, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { Sale, StockMovement } from '../types';
import { logAuditEvent } from './auditService';

export async function getSalesHistory(max: number = 100): Promise<Sale[]> {
  try {
    const q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Sale);
  } catch {
    try {
      const snapshot = await getDocs(collection(db, 'sales'));
      return snapshot.docs
        .map((d) => d.data() as Sale)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'sales');
      return [];
    }
  }
}

export async function voidSale(
  saleId: string,
  reason: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const saleRef = doc(db, 'sales', saleId);
      const saleSnap = await transaction.get(saleRef);

      if (!saleSnap.exists()) {
        throw new Error('Sale not found.');
      }

      const saleData = saleSnap.data() as Sale;
      if (saleData.status === 'VOID') {
        throw new Error('Sale is already voided.');
      }

      // Restore stock for all items
      if (saleData.items && saleData.items.length > 0) {
        for (const item of saleData.items) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            const currentStock = Number(productSnap.data().currentStock || 0);
            const restoredStock = currentStock + item.quantity;
            transaction.update(productRef, {
              currentStock: restoredStock,
              updatedAt: new Date().toISOString(),
            });

            // Write reversing stock movement
            const movementId = `MOV-VOID-${Date.now()}-${item.productId}`;
            const movement: StockMovement = {
              movementId,
              productId: item.productId,
              barcode: item.barcode,
              productName: item.productName,
              type: 'RETURN',
              quantity: item.quantity,
              previousStock: currentStock,
              newStock: restoredStock,
              referenceId: saleData.receiptNumber,
              referenceType: 'SALE',
              reason: `Restored from Voided Sale ${saleData.receiptNumber}: ${reason}`,
              performedBy: userId,
              performedByName: userName,
              createdAt: new Date().toISOString(),
            };
            transaction.set(doc(db, 'stockMovements', movementId), movement);
          }
        }
      }

      // If sale was on customer credit, reverse customer balance
      if (saleData.customerId && saleData.customerId !== 'CUST-WALKIN' && saleData.paymentMethod === 'CREDIT') {
        const custRef = doc(db, 'customers', saleData.customerId);
        const custSnap = await transaction.get(custRef);
        if (custSnap.exists()) {
          const currentBal = Number(custSnap.data().balance || 0);
          const currentPurchases = Number(custSnap.data().totalPurchases || 0);
          transaction.update(custRef, {
            balance: Math.max(0, currentBal - saleData.total),
            totalPurchases: Math.max(0, currentPurchases - saleData.total),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Mark sale as VOID
      transaction.update(saleRef, {
        status: 'VOID',
        voidReason: reason,
        voidedBy: userId,
        voidedByName: userName,
        voidedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'VOID_SALE',
      'SALES',
      `Voided sale ${saleId} (${reason}). Restored inventory.`,
      saleId
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}`);
    throw err;
  }
}

export async function refundSale(
  saleId: string,
  refundAmount: number,
  reason: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const saleRef = doc(db, 'sales', saleId);
      const saleSnap = await transaction.get(saleRef);

      if (!saleSnap.exists()) {
        throw new Error('Sale not found.');
      }

      const saleData = saleSnap.data() as Sale;
      if (saleData.status === 'REFUNDED') {
        throw new Error('Sale has already been refunded.');
      }

      // Restore stock
      if (saleData.items && saleData.items.length > 0) {
        for (const item of saleData.items) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            const currentStock = Number(productSnap.data().currentStock || 0);
            const restoredStock = currentStock + item.quantity;
            transaction.update(productRef, {
              currentStock: restoredStock,
              updatedAt: new Date().toISOString(),
            });

            const movementId = `MOV-REF-${Date.now()}-${item.productId}`;
            const movement: StockMovement = {
              movementId,
              productId: item.productId,
              barcode: item.barcode,
              productName: item.productName,
              type: 'REFUND',
              quantity: item.quantity,
              previousStock: currentStock,
              newStock: restoredStock,
              referenceId: saleData.receiptNumber,
              referenceType: 'REFUND',
              reason: `Refunded receipt ${saleData.receiptNumber}: ${reason}`,
              performedBy: userId,
              performedByName: userName,
              createdAt: new Date().toISOString(),
            };
            transaction.set(doc(db, 'stockMovements', movementId), movement);
          }
        }
      }

      // Mark status
      transaction.update(saleRef, {
        status: 'REFUNDED',
        refundAmount,
        refundReason: reason,
        refundedBy: userId,
        refundedByName: userName,
        refundedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'REFUND_SALE',
      'SALES',
      `Processed refund for sale ${saleId} (Amount: GH₵ ${refundAmount.toFixed(2)}, Reason: ${reason})`,
      saleId
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}`);
    throw err;
  }
}
