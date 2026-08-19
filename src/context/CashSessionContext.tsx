import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { CashSession } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface CashSessionContextType {
  activeSession: CashSession | null;
  loading: boolean;
  openSession: (openingCash: number) => Promise<CashSession>;
  closeSession: (actualCash: number, closingNotes?: string) => Promise<CashSession>;
  recordCashSale: (amount: number) => Promise<void>;
  recordCashReceived: (amount: number) => Promise<void>;
  recordCashExpense: (amount: number) => Promise<void>;
}

const CashSessionContext = createContext<CashSessionContextType | undefined>(undefined);

export function CashSessionProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError, warning } = useToast();

  const userId = profile?.userId || 'admin-01';

  // Listen for open cash session for this user or any open session
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'cashSessions'), where('userId', '==', userId), where('status', '==', 'OPEN'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data() as CashSession;
          setActiveSession(docData);
        } else {
          setActiveSession(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Cash session listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const openSession = async (openingCash: number): Promise<CashSession> => {
    try {
      const sessionId = `SESSION-${Date.now()}`;
      const newSession: CashSession = {
        sessionId,
        userId: profile?.userId || 'admin-01',
        userName: profile?.fullName || 'Cashier',
        openingCash: Number(openingCash) || 0,
        openingTime: new Date().toISOString(),
        cashSales: 0,
        cashReceived: 0,
        cashExpenses: 0,
        cashWithdrawals: 0,
        expectedCash: Number(openingCash) || 0,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'cashSessions', sessionId), newSession);
      setActiveSession(newSession);
      success('Cash Drawer Opened', `Shift started with opening float of GH₵ ${openingCash.toFixed(2)}`);
      return newSession;
    } catch (err) {
      toastError('Could not open cash session', 'Please check permissions.');
      handleFirestoreError(err, OperationType.WRITE, 'cashSessions');
      throw err;
    }
  };

  const closeSession = async (actualCash: number, closingNotes?: string): Promise<CashSession> => {
    if (!activeSession) {
      throw new Error('No active cash session to close.');
    }

    try {
      const expected = activeSession.openingCash + activeSession.cashSales + activeSession.cashReceived - activeSession.cashExpenses - activeSession.cashWithdrawals;
      const variance = Number(actualCash) - expected;

      const updatedSession: CashSession = {
        ...activeSession,
        expectedCash: expected,
        actualCash: Number(actualCash),
        variance,
        closingTime: new Date().toISOString(),
        closingNotes: closingNotes || '',
        status: 'CLOSED',
      };

      await updateDoc(doc(db, 'cashSessions', activeSession.sessionId), {
        expectedCash: expected,
        actualCash: Number(actualCash),
        variance,
        closingTime: updatedSession.closingTime,
        closingNotes: updatedSession.closingNotes,
        status: 'CLOSED',
      });

      setActiveSession(null);

      if (variance === 0) {
        success('Cash Register Balanced', `Shift closed with exact cash of GH₵ ${actualCash.toFixed(2)}`);
      } else if (variance > 0) {
        success('Cash Register Closed', `Surplus of GH₵ ${variance.toFixed(2)} detected.`);
      } else {
        warning('Cash Shortage Detected', `Shortage of GH₵ ${Math.abs(variance).toFixed(2)} recorded on close.`);
      }

      return updatedSession;
    } catch (err) {
      toastError('Could not close cash session', 'An error occurred.');
      handleFirestoreError(err, OperationType.UPDATE, `cashSessions/${activeSession.sessionId}`);
      throw err;
    }
  };

  const recordCashSale = useCallback(
    async (amount: number) => {
      if (!activeSession) return;
      try {
        const newCashSales = activeSession.cashSales + amount;
        const newExpected = activeSession.openingCash + newCashSales + activeSession.cashReceived - activeSession.cashExpenses - activeSession.cashWithdrawals;
        await updateDoc(doc(db, 'cashSessions', activeSession.sessionId), {
          cashSales: newCashSales,
          expectedCash: newExpected,
        });
      } catch (err) {
        console.warn('Could not update cash session sales:', err);
      }
    },
    [activeSession]
  );

  const recordCashReceived = useCallback(
    async (amount: number) => {
      if (!activeSession) return;
      try {
        const newCashReceived = activeSession.cashReceived + amount;
        const newExpected = activeSession.openingCash + activeSession.cashSales + newCashReceived - activeSession.cashExpenses - activeSession.cashWithdrawals;
        await updateDoc(doc(db, 'cashSessions', activeSession.sessionId), {
          cashReceived: newCashReceived,
          expectedCash: newExpected,
        });
      } catch (err) {
        console.warn('Could not update cash session received:', err);
      }
    },
    [activeSession]
  );

  const recordCashExpense = useCallback(
    async (amount: number) => {
      if (!activeSession) return;
      try {
        const newCashExpenses = activeSession.cashExpenses + amount;
        const newExpected = activeSession.openingCash + activeSession.cashSales + activeSession.cashReceived - newCashExpenses - activeSession.cashWithdrawals;
        await updateDoc(doc(db, 'cashSessions', activeSession.sessionId), {
          cashExpenses: newCashExpenses,
          expectedCash: newExpected,
        });
      } catch (err) {
        console.warn('Could not update cash session expenses:', err);
      }
    },
    [activeSession]
  );

  return (
    <CashSessionContext.Provider
      value={{
        activeSession,
        loading,
        openSession,
        closeSession,
        recordCashSale,
        recordCashReceived,
        recordCashExpense,
      }}
    >
      {children}
    </CashSessionContext.Provider>
  );
}

export function useCashSession() {
  const context = useContext(CashSessionContext);
  if (!context) {
    throw new Error('useCashSession must be used within a CashSessionProvider');
  }
  return context;
}
