import { doc, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { CartItem, Customer, PaymentMethod, Sale, SaleItem, StockMovement, BusinessSettings } from '../types';

export interface CompleteSaleParams {
  cart: CartItem[];
  customer: Customer;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  paymentReference?: string;
  mobileMoneyProvider?: 'MTN' | 'TELECEL' | 'AT';
  orderDiscount: number;
  orderDiscountType: 'PERCENT' | 'FIXED';
  orderNotes?: string;
  cashierId: string;
  cashierName: string;
  sessionId?: string;
  settings: BusinessSettings;
}

export async function completeSaleTransaction(params: CompleteSaleParams): Promise<Sale> {
  const {
    cart,
    customer,
    paymentMethod,
    amountPaid,
    paymentReference,
    mobileMoneyProvider,
    orderDiscount,
    orderDiscountType,
    orderNotes,
    cashierId,
    cashierName,
    sessionId,
    settings,
  } = params;

  if (cart.length === 0) {
    throw new Error('Cannot complete sale with an empty cart.');
  }

  const currentYear = new Date().getFullYear();
  const counterDocRef = doc(db, 'counters', `receipts_${currentYear}`);

  try {
    const saleResult = await runTransaction(db, async (transaction) => {
      // 1. Get current sequence counter for unique receipt number
      const counterSnap = await transaction.get(counterDocRef);
      let currentSeq = 1;
      if (counterSnap.exists()) {
        currentSeq = (counterSnap.data().current || 0) + 1;
      }
      transaction.set(counterDocRef, { current: currentSeq, updatedAt: new Date().toISOString() }, { merge: true });

      const paddedSeq = String(currentSeq).padStart(6, '0');
      const receiptPrefix = settings.receiptPrefix || 'OWE';
      const receiptNumber = `${receiptPrefix}-${currentYear}-${paddedSeq}`;
      const saleId = `SALE-${currentYear}-${paddedSeq}`;

      // 2. Fetch authoritative stock and product info
      const productDocs = await Promise.all(
        cart.map(async (item) => {
          const pRef = doc(db, 'products', item.productId);
          const pSnap = await transaction.get(pRef);
          return { ref: pRef, snap: pSnap, cartItem: item };
        })
      );

      // 3. Stock validation & recalculations
      let rawSubtotal = 0;
      let lineDiscountsTotal = 0;
      let costTotal = 0;
      const saleItems: SaleItem[] = [];
      const stockMovementList: StockMovement[] = [];

      for (const { ref, snap, cartItem } of productDocs) {
        if (!snap.exists()) {
          throw new Error(`Product "${cartItem.name}" no longer exists.`);
        }
        const pData = snap.data();
        const availableStock = Number(pData.currentStock ?? 0);

        if (availableStock < cartItem.quantity && !settings.allowNegativeStock) {
          throw new Error(`Insufficient stock for "${cartItem.name}". Available: ${availableStock}, Requested: ${cartItem.quantity}`);
        }

        const authoritativeCost = Number(pData.costPrice ?? cartItem.unitCost);
        const authoritativePrice = customer.customerType === 'WHOLESALE' && pData.wholesalePrice > 0 ? Number(pData.wholesalePrice) : Number(pData.sellingPrice ?? cartItem.unitPrice);
        const lineRaw = authoritativePrice * cartItem.quantity;
        const lineDiscount = cartItem.discount || 0;
        const lineSubtotal = Math.max(0, lineRaw - lineDiscount);
        const lineTax = settings.taxEnabled && pData.taxable ? lineSubtotal * (pData.taxRate || settings.taxRate) : 0;
        const lineTotal = lineSubtotal + lineTax;
        const lineProfit = lineTotal - (authoritativeCost * cartItem.quantity) - lineTax;

        rawSubtotal += lineRaw;
        lineDiscountsTotal += lineDiscount;
        costTotal += authoritativeCost * cartItem.quantity;

        // Add sale item
        saleItems.push({
          itemId: `ITEM-${cartItem.productId}-${Date.now()}`,
          productId: cartItem.productId,
          barcode: pData.barcode || cartItem.barcode || '',
          productName: pData.name || cartItem.name,
          quantity: cartItem.quantity,
          unitCost: authoritativeCost,
          unitPrice: authoritativePrice,
          discount: lineDiscount,
          tax: lineTax,
          subtotal: lineSubtotal,
          total: lineTotal,
          profit: lineProfit,
        });

        // Decrement product inventory atomically
        const newStock = availableStock - cartItem.quantity;
        transaction.update(ref, {
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        });

        // Stock movement entry
        const movementId = `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const movement: StockMovement = {
          movementId,
          productId: cartItem.productId,
          barcode: pData.barcode || cartItem.barcode || '',
          productName: pData.name || cartItem.name,
          type: 'SALE',
          quantity: -cartItem.quantity,
          previousStock: availableStock,
          newStock,
          referenceId: receiptNumber,
          referenceType: 'SALE',
          reason: `Sold via POS receipt ${receiptNumber}`,
          performedBy: cashierId,
          performedByName: cashierName,
          createdAt: new Date().toISOString(),
        };
        stockMovementList.push(movement);
      }

      // Calculate order-level discounts and tax
      const subtotalAfterItemDiscounts = rawSubtotal - lineDiscountsTotal;
      let orderDiscountAmount = 0;
      if (orderDiscount > 0) {
        if (orderDiscountType === 'PERCENT') {
          orderDiscountAmount = (subtotalAfterItemDiscounts * Math.min(100, orderDiscount)) / 100;
        } else {
          orderDiscountAmount = Math.min(subtotalAfterItemDiscounts, orderDiscount);
        }
      }

      const totalDiscount = lineDiscountsTotal + orderDiscountAmount;
      const taxableSubtotal = Math.max(0, rawSubtotal - totalDiscount);
      const taxAmount = settings.taxEnabled ? taxableSubtotal * settings.taxRate : 0;
      const grandTotal = Math.max(0, taxableSubtotal + taxAmount);
      const profit = Math.max(0, grandTotal - costTotal - taxAmount);

      const effectivePaid = paymentMethod === 'CREDIT' ? 0 : amountPaid;
      const change = Math.max(0, effectivePaid - grandTotal);

      // 4. Create Sale document
      const saleRecord: Sale = {
        saleId,
        receiptNumber,
        customerId: customer.customerId,
        customerName: customer.fullName,
        cashierId,
        cashierName,
        sessionId: sessionId || undefined,
        subtotal: rawSubtotal,
        discount: totalDiscount,
        discountType: orderDiscountType,
        tax: taxAmount,
        total: grandTotal,
        costTotal,
        profit,
        amountPaid: effectivePaid,
        change,
        paymentMethod,
        paymentReference: paymentReference || undefined,
        mobileMoneyProvider: mobileMoneyProvider || undefined,
        status: 'ACTIVE',
        notes: orderNotes || undefined,
        items: saleItems,
        itemCount: saleItems.reduce((acc, i) => acc + i.quantity, 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      transaction.set(doc(db, 'sales', saleId), saleRecord);

      // Write stock movement records
      for (const mov of stockMovementList) {
        transaction.set(doc(db, 'stockMovements', mov.movementId), mov);
      }

      // If customer bought on credit, update customer balance & total purchases
      if (customer.customerId !== 'CUST-WALKIN') {
        const custRef = doc(db, 'customers', customer.customerId);
        const custSnap = await transaction.get(custRef);
        if (custSnap.exists()) {
          const custData = custSnap.data();
          const currentBal = Number(custData.balance || 0);
          const currentPurchases = Number(custData.totalPurchases || 0);

          const addedDebt = paymentMethod === 'CREDIT' ? grandTotal : 0;
          transaction.update(custRef, {
            balance: currentBal + addedDebt,
            totalPurchases: currentPurchases + grandTotal,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Audit Log
      const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      transaction.set(doc(db, 'auditLogs', logId), {
        logId,
        userId: cashierId,
        userName: cashierName,
        userRole: 'CASHIER',
        action: 'CREATE_SALE',
        module: 'POS',
        description: `Processed sale ${receiptNumber} for GH₵ ${grandTotal.toFixed(2)} (${paymentMethod})`,
        referenceId: receiptNumber,
        createdAt: new Date().toISOString(),
      });

      return saleRecord;
    });

    return saleResult;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'sales');
    throw err;
  }
}
