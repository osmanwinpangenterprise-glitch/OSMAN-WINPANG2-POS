import { collection, doc, getDocs, setDoc, updateDoc, query, orderBy, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { Customer, Payment, PaymentMethod } from '../types';
import { logAuditEvent } from './auditService';

export async function getCustomers(): Promise<Customer[]> {
  try {
    const q = query(collection(db, 'customers'), orderBy('fullName', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Customer);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'customers');
    return [];
  }
}

export async function saveCustomer(
  customerData: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt' | 'totalPurchases'> & { customerId?: string },
  userId: string,
  userName: string,
  userRole: string
): Promise<Customer> {
  try {
    const customerId = customerData.customerId || `CUST-${Date.now()}`;
    const customerCode = customerData.customerCode || `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

    const record: Customer = {
      customerId,
      customerCode,
      fullName: customerData.fullName,
      phone: customerData.phone,
      email: customerData.email || '',
      address: customerData.address || '',
      customerType: customerData.customerType,
      creditLimit: Number(customerData.creditLimit) || 0,
      balance: Number(customerData.balance) || 0,
      totalPurchases: 0,
      status: customerData.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'customers', customerId), record, { merge: true });

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'CREATE_CUSTOMER',
      'CUSTOMERS',
      `Saved customer profile for ${record.fullName} (${record.customerType})`,
      customerId
    );

    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${customerData.customerId}`);
    throw err;
  }
}

export async function recordCustomerPayment(
  customerId: string,
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
      const custRef = doc(db, 'customers', customerId);
      const custSnap = await transaction.get(custRef);

      if (!custSnap.exists()) {
        throw new Error('Customer not found.');
      }

      const custData = custSnap.data() as Customer;
      const currentBalance = Number(custData.balance || 0);
      const newBalance = Math.max(0, currentBalance - amount);

      transaction.update(custRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      });

      const paymentId = `PAY-CUST-${Date.now()}`;
      const paymentRecord: Payment = {
        paymentId,
        referenceId: customerId,
        referenceType: 'CUSTOMER_CREDIT_SETTLEMENT',
        customerId,
        customerName: custData.fullName,
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
      'UPDATE_CUSTOMER',
      'CUSTOMERS',
      `Recorded debt settlement of GH₵ ${amount.toFixed(2)} from ${payment.customerName} (${paymentMethod})`,
      payment.paymentId
    );

    return payment;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'payments');
    throw err;
  }
}
