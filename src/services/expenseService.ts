import { collection, doc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { Expense } from '../types';
import { logAuditEvent } from './auditService';

export async function getExpenses(): Promise<Expense[]> {
  try {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Expense);
  } catch {
    try {
      const snapshot = await getDocs(collection(db, 'expenses'));
      return snapshot.docs
        .map((d) => d.data() as Expense)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'expenses');
      return [];
    }
  }
}

export async function createExpense(
  expenseData: Omit<Expense, 'expenseId' | 'createdAt' | 'updatedAt'>,
  userId: string,
  userName: string,
  userRole: string
): Promise<Expense> {
  try {
    const expenseId = `EXP-${Date.now()}`;
    const newExpense: Expense = {
      ...expenseData,
      expenseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'expenses', expenseId), newExpense);

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'CREATE_EXPENSE',
      'EXPENSES',
      `Recorded expense: ${newExpense.category} - GH₵ ${newExpense.amount.toFixed(2)} (${newExpense.paymentMethod})`,
      expenseId
    );

    return newExpense;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'expenses');
    throw err;
  }
}

export async function recordExpense(
  expenseData: {
    title: string;
    category: string;
    amount: number;
    paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
    referenceNumber?: string;
    notes?: string;
    recordedBy: string;
    recordedByName: string;
    cashSessionId?: string;
  },
  userRole: string = 'ADMINISTRATOR'
): Promise<Expense> {
  return createExpense(
    {
      date: new Date().toISOString(),
      category: expenseData.category,
      description: expenseData.title,
      amount: expenseData.amount,
      paymentMethod: expenseData.paymentMethod,
      sessionId: expenseData.cashSessionId,
      recordedBy: expenseData.recordedBy,
      recordedByName: expenseData.recordedByName,
      status: 'ACTIVE',
    },
    expenseData.recordedBy,
    expenseData.recordedByName,
    userRole
  );
}

