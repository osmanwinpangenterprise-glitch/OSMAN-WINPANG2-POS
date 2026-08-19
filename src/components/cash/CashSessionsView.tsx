import React, { useState, useEffect } from 'react';
import { useCashSession } from '../../context/CashSessionContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { CashSession } from '../../types';
import { Modal } from '../common/Modal';
import {
  Wallet,
  DoorOpen,
  DoorClosed,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-react';

export function CashSessionsView() {
  const { currentSession, isRegisterOpen, openSession, closeSession } = useCashSession();
  const { formatCurrency, settings } = useSettings();
  const { profile } = useAuth();
  const { success, error: toastError, warning } = useToast();

  const [history, setHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Open Shift Modal
  const [isOpenModalOpen, setIsOpenModalOpen] = useState<boolean>(false);
  const [openingFloat, setOpeningFloat] = useState<string>('100');
  const [openNotes, setOpenNotes] = useState<string>('');
  const [opening, setOpening] = useState<boolean>(false);

  // Close Shift Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [actualCash, setActualCash] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [closing, setClosing] = useState<boolean>(false);

  useEffect(() => {
    loadShiftHistory();
  }, [isRegisterOpen]);

  const loadShiftHistory = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'cashSessions'), orderBy('openedAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      setHistory(snap.docs.map((d) => d.data() as CashSession));
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatNum = Number(openingFloat) || 0;
    setOpening(true);
    try {
      await openSession(floatNum, openNotes.trim());
      success('Register Shift Opened', `Started with ${formatCurrency(floatNum)} opening float.`);
      setIsOpenModalOpen(false);
      loadShiftHistory();
    } catch (err: unknown) {
      toastError('Open Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setOpening(false);
    }
  };

  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    const actualNum = Number(actualCash) || 0;
    setClosing(true);
    try {
      await closeSession(actualNum, closeNotes.trim());
      success('Shift Closed & Reconciled', `Register shift closed. Counted ${formatCurrency(actualNum)}.`);
      setIsCloseModalOpen(false);
      loadShiftHistory();
    } catch (err: unknown) {
      toastError('Close Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setClosing(false);
    }
  };

  const expectedDrawerCash = currentSession
    ? currentSession.openingFloat +
      currentSession.cashSales +
      (currentSession.cashIn || 0) -
      (currentSession.cashOut || 0)
    : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Cash Register & Shift Management</h2>
          <p className="text-xs text-slate-400">
            Control cash drawer floats, shift reconciliations, and register surplus/shortage audit
          </p>
        </div>

        <div>
          {isRegisterOpen ? (
            <button
              onClick={() => {
                setActualCash(expectedDrawerCash.toString());
                setCloseNotes('End of shift cash count');
                setIsCloseModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-950"
            >
              <Lock className="w-4 h-4" />
              <span>Close & Reconcile Shift</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setOpeningFloat('100');
                setOpenNotes('Morning register float');
                setIsOpenModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950"
            >
              <Unlock className="w-4 h-4" />
              <span>Open Cash Register Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Dashboard Card */}
      {isRegisterOpen && currentSession ? (
        <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-100">Active Shift #{currentSession.sessionId.slice(-6)}</h3>
            </div>
            <span className="text-xs text-slate-400">
              Opened: {new Date(currentSession.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {currentSession.cashierName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Opening Float</span>
              <div className="text-base font-extrabold text-slate-200 font-mono">
                {formatCurrency(currentSession.openingFloat)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Cash Sales</span>
              <div className="text-base font-extrabold text-emerald-400 font-mono">
                +{formatCurrency(currentSession.cashSales)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Cash Out / Drops</span>
              <div className="text-base font-extrabold text-rose-400 font-mono">
                -{formatCurrency(currentSession.cashOut || 0)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-800/80 space-y-0.5">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Expected In Drawer</span>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {formatCurrency(expectedDrawerCash)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
          <DoorClosed className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Cash Register is Currently Closed</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Open the register by declaring the starting cash float before accepting in-person cash sales.
          </p>
        </div>
      )}

      {/* Historical Shift Table */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm text-slate-200">Shift History & Reconciliation Ledger</h3>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Shift ID / Time</th>
                  <th className="px-4 py-3">Cashier</th>
                  <th className="px-4 py-3 text-right">Opening Float</th>
                  <th className="px-4 py-3 text-right">Cash Sales</th>
                  <th className="px-4 py-3 text-right">Expected Drawer</th>
                  <th className="px-4 py-3 text-right">Actual Counted</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Loading shift logs...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No shift records found.
                    </td>
                  </tr>
                ) : (
                  history.map((s) => {
                    const variance = s.variance || 0;
                    return (
                      <tr key={s.sessionId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-200 font-mono block">
                            #{s.sessionId.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(s.openedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{s.cashierName}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">{formatCurrency(s.openingFloat)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(s.cashSales)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          {formatCurrency(s.expectedCash || s.openingFloat + s.cashSales)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">
                          {s.actualCash !== undefined ? formatCurrency(s.actualCash) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {s.status === 'CLOSED' ? (
                            <span
                              className={
                                variance === 0 ? 'text-emerald-400' : variance > 0 ? 'text-teal-400' : 'text-rose-400'
                              }
                            >
                              {variance > 0 ? `+${formatCurrency(variance)}` : formatCurrency(variance)}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              s.status === 'OPEN'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Open Shift Modal */}
      <Modal isOpen={isOpenModalOpen} onClose={() => setIsOpenModalOpen(false)} title="Open Cash Register Shift" maxWidth="sm">
        <form onSubmit={handleConfirmOpen} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Starting Cash Float ({settings.currency}) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-lg font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Shift Opening Notes</label>
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              placeholder="e.g. Counter 1 Morning Shift"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpenModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={opening}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950"
            >
              {opening ? 'Opening...' : 'Start Register Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Shift Reconciliation Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Close Register Shift & Reconcile Drawer"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmClose} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">System Expected Cash in Drawer:</span>
            <span className="font-extrabold text-emerald-400 font-mono text-base">
              {formatCurrency(expectedDrawerCash)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Physically Counted Cash ({settings.currency}) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-lg font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {/* Real-time Variance Calculation */}
          {actualCash !== '' && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Reconciliation Variance:</span>
              <span
                className={`font-bold font-mono text-sm ${
                  Number(actualCash) - expectedDrawerCash === 0
                    ? 'text-emerald-400'
                    : Number(actualCash) - expectedDrawerCash > 0
                    ? 'text-teal-400'
                    : 'text-rose-400'
                }`}
              >
                {Number(actualCash) - expectedDrawerCash > 0 ? '+' : ''}
                {formatCurrency(Number(actualCash) - expectedDrawerCash)} (
                {Number(actualCash) - expectedDrawerCash === 0
                  ? 'Balanced'
                  : Number(actualCash) - expectedDrawerCash > 0
                  ? 'Surplus'
                  : 'Shortage'}
                )
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reconciliation Notes / Explanation</label>
            <input
              type="text"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="e.g. Drawer balanced, handed over to evening manager"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={closing}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950"
            >
              {closing ? 'Closing Shift...' : 'Confirm Shift Close'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
