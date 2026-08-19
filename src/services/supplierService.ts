import { collection, doc, getDocs, setDoc, query, orderBy, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { Supplier, Purchase, PurchaseItem, StockMovement, Payment, PaymentMethod } from '../types';
import { logAuditEvent } from './auditService';

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const q = query(collection(db, 'suppliers'), orderBy('companyName', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Supplier);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'suppliers');
    return [];
  }
}

export async function saveSupplier(
  supplierData: Omit<Supplier, 'supplierId' | 'createdAt' | 'updatedAt' | 'totalPurchased'> & { supplierId?: string },
  userId: string,
  userName: string,
  userRole: string
): Promise<Supplier> {
  try {
    const supplierId = supplierData.supplierId || `SUPP-${Date.now()}`;
    const supplierCode = supplierData.supplierCode || `SUPP-${Math.floor(100 + Math.random() * 900)}`;

    const record: Supplier = {
      supplierId,
      supplierCode,
      companyName: supplierData.companyName,
      contactPerson: supplierData.contactPerson || '',
      phone: supplierData.phone,
      email: supplierData.email || '',
      address: supplierData.address || '',
      balance: Number(supplierData.balance) || 0,
      totalPurchased: 0,
      status: supplierData.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'suppliers', supplierId), record, { merge: true });

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'CREATE_SUPPLIER',
      'SUPPLIERS',
      `Saved supplier profile for ${record.companyName}`,
      supplierId
    );

    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `suppliers/${supplierData.supplierId}`);
    throw err;
  }
}

export interface ReceivePurchaseParams {
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  items: Array<{ productId: string; productName: string; barcode?: string; quantity: number; costPrice: number }>;
  discount: number;
  tax: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  userId: string;
  userName: string;
  userRole: string;
}

export async function receivePurchaseOrder(params: ReceivePurchaseParams): Promise<Purchase> {
  const { supplierId, supplierName, invoiceNumber, items, discount, tax, amountPaid, paymentMethod, userId, userName, userRole } = params;

  if (items.length === 0) {
    throw new Error('Purchase order requires at least one product item.');
  }

  const currentYear = new Date().getFullYear();
  const purchaseId = `PURCH-${currentYear}-${Date.now()}`;

  try {
    const purchaseResult = await runTransaction(db, async (transaction) => {
      let subtotal = 0;
      const purchaseItems: PurchaseItem[] = [];
      const stockMovementList: StockMovement[] = [];

      for (const item of items) {
        const itemSubtotal = item.quantity * item.costPrice;
        subtotal += itemSubtotal;

        purchaseItems.push({
          itemId: `PITEM-${item.productId}-${Date.now()}`,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          costPrice: item.costPrice,
          subtotal: itemSubtotal,
        });

        // Update product stock and optionally update costPrice
        const prodRef = doc(db, 'products', item.productId);
        const prodSnap = await transaction.get(prodRef);
        if (prodSnap.exists()) {
          const currentStock = Number(prodSnap.data().currentStock || 0);
          const newStock = currentStock + item.quantity;
          transaction.update(prodRef, {
            currentStock: newStock,
            costPrice: item.costPrice, // Update latest cost price
            updatedAt: new Date().toISOString(),
          });

          const movementId = `MOV-PUR-${Date.now()}-${item.productId}`;
          stockMovementList.push({
            movementId,
            productId: item.productId,
            barcode: item.barcode || prodSnap.data().barcode || '',
            productName: item.productName,
            type: 'PURCHASE',
            quantity: item.quantity,
            previousStock: currentStock,
            newStock,
            referenceId: invoiceNumber || purchaseId,
            referenceType: 'PURCHASE',
            reason: `Received shipment from ${supplierName} (Invoice: ${invoiceNumber})`,
            performedBy: userId,
            performedByName: userName,
            createdAt: new Date().toISOString(),
          });
        }
      }

      const total = Math.max(0, subtotal - discount + tax);
      const balance = Math.max(0, total - amountPaid);

      const purchaseRecord: Purchase = {
        purchaseId,
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        supplierId,
        supplierName,
        subtotal,
        discount,
        tax,
        total,
        amountPaid,
        balance,
        paymentMethod,
        status: 'RECEIVED',
        items: purchaseItems,
        receivedAt: new Date().toISOString(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      transaction.set(doc(db, 'purchases', purchaseId), purchaseRecord);

      // Write stock movements
      for (const mov of stockMovementList) {
        transaction.set(doc(db, 'stockMovements', mov.movementId), mov);
      }

      // Update supplier balance and total purchased
      const suppRef = doc(db, 'suppliers', supplierId);
      const suppSnap = await transaction.get(suppRef);
      if (suppSnap.exists()) {
        const currentBal = Number(suppSnap.data().balance || 0);
        const currentPurchased = Number(suppSnap.data().totalPurchased || 0);
        transaction.update(suppRef, {
          balance: currentBal + balance,
          totalPurchased: currentPurchased + total,
          updatedAt: new Date().toISOString(),
        });
      }

      return purchaseRecord;
    });

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'CREATE_PURCHASE',
      'PURCHASES',
      `Received shipment from ${supplierName} (${invoiceNumber}) totaling GH₵ ${purchaseResult.total.toFixed(2)}`,
      purchaseId
    );

    return purchaseResult;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'purchases');
    throw err;
  }
}

export async function recordSupplierPayment(
  supplierId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  reference: string,
  notes: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<Payment> {
  try {
    const payment = await runTransaction(db, async (transaction) => {
      const suppRef = doc(db, 'suppliers', supplierId);
      const suppSnap = await transaction.get(suppRef);

      if (!suppSnap.exists()) {
        throw new Error('Supplier not found.');
      }

      const suppData = suppSnap.data() as Supplier;
      const currentBalance = Number(suppData.balance || 0);
      const newBalance = Math.max(0, currentBalance - amount);

      transaction.update(suppRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      });

      const paymentId = `PAY-SUPP-${Date.now()}`;
      const paymentRecord: Payment = {
        paymentId,
        referenceId: supplierId,
        referenceType: 'SUPPLIER_PAYMENT',
        supplierId,
        supplierName: suppData.companyName,
        amount,
        paymentMethod,
        reference,
        receivedBy: userId,
        notes,
        createdAt: new Date().toISOString(),
      };

      transaction.set(doc(db, 'payments', paymentId), paymentRecord);

      return paymentRecord;
    });

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'UPDATE_SUPPLIER',
      'SUPPLIERS',
      `Paid supplier ${payment.supplierName} GH₵ ${amount.toFixed(2)} (${paymentMethod})`,
      payment.paymentId
    );

    return payment;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'payments');
    throw err;
  }
}

export const receiveGoods = receivePurchaseOrder;

