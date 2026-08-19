import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  clearSampleData,
  getDatabaseStatistics,
  ClearDataScope,
  DatabaseCollectionStats,
} from '../../services/seedService';
import { useToast } from '../../context/ToastContext';
import {
  Trash2,
  AlertTriangle,
  Database,
  CheckCircle2,
  RefreshCw,
  Boxes,
  Receipt,
  Users,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCleared?: () => void;
}

export function ClearDataModal({ isOpen, onClose, onCleared }: ClearDataModalProps) {
  const { success, error: toastError, warning } = useToast();

  const [scope, setScope] = useState<ClearDataScope>('ALL');
  const [confirmText, setConfirmText] = useState<string>('');
  const [stats, setStats] = useState<DatabaseCollectionStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setConfirmText('');
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await getDatabaseStatistics();
      setStats(data);
    } catch (err) {
      console.warn('Failed to load database stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleExecuteClear = async (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmText.trim().toUpperCase() !== 'CLEAR') {
      warning('Confirmation Required', 'Please type "CLEAR" into the box to confirm permanent data removal.');
      return;
    }

    setClearing(true);
    try {
      const result = await clearSampleData(scope);
      if (result.success) {
        success('Sample Data Cleared', result.message);
        onClose();
        if (onCleared) {
          onCleared();
        } else {
          window.location.reload();
        }
      } else {
        toastError('Clear Failed', result.message);
      }
    } catch (err: unknown) {
      toastError('Clear Error', err instanceof Error ? err.message : 'Failed to clear sample database records.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clear Sample & Demo Data" maxWidth="lg">
      <form onSubmit={handleExecuteClear} className="space-y-4">
        {/* Warning Banner */}
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 flex items-start gap-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-rose-200 block">Permanent Database Cleanup</span>
            <p className="text-rose-300/90 leading-relaxed">
              This utility deletes existing documents from the connected Firestore database so you can start fresh with real inventory, products, and sales records.
            </p>
          </div>
        </div>

        {/* Live Document Counts Breakdown */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current Cloud Database Records</span>
            </span>
            <button
              type="button"
              onClick={loadStats}
              disabled={loadingStats}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh Counts</span>
            </button>
          </div>

          {loadingStats ? (
            <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Scanning collections...</span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Products</span>
                <span className="font-bold text-slate-100">{stats.products} items</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Sales & Receipts</span>
                <span className="font-bold text-emerald-400">{stats.sales} orders</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Customers</span>
                <span className="font-bold text-slate-100">{stats.customers} accounts</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Suppliers</span>
                <span className="font-bold text-slate-100">{stats.suppliers} vendors</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Expenses</span>
                <span className="font-bold text-slate-100">{stats.expenses} logs</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Stock Movements</span>
                <span className="font-bold text-slate-100">{stats.stockMovements} logs</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Cash Shifts</span>
                <span className="font-bold text-slate-100">{stats.cashSessions} sessions</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Records</span>
                <span className="font-extrabold text-amber-400">{stats.totalDocuments} docs</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Unable to retrieve counts.</p>
          )}
        </div>

        {/* Scope Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Select Deletion Scope</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope('ALL')}
              className={`p-3 rounded-xl border text-left transition-all ${
                scope === 'ALL'
                  ? 'bg-rose-950/80 border-rose-600 text-rose-100 ring-2 ring-rose-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Full Fresh Start (Clear Everything)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Deletes all products, categories, sales, customers, suppliers, expenses, and ledger history.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setScope('TRANSACTIONS')}
              className={`p-3 rounded-xl border text-left transition-all ${
                scope === 'TRANSACTIONS'
                  ? 'bg-amber-950/80 border-amber-600 text-amber-100 ring-2 ring-amber-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Clear Transactions & Sales Only</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Clears test sales, expenses, stock movements, and drawer logs while keeping products and customers.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setScope('CATALOG')}
              className={`p-3 rounded-xl border text-left transition-all ${
                scope === 'CATALOG'
                  ? 'bg-cyan-950/80 border-cyan-600 text-cyan-100 ring-2 ring-cyan-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Boxes className="w-4 h-4 text-cyan-400" />
                <span>Clear Products & Catalog Only</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Deletes all sample products and categories so you can import or enter your own product list.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setScope('CONTACTS')}
              className={`p-3 rounded-xl border text-left transition-all ${
                scope === 'CONTACTS'
                  ? 'bg-indigo-950/80 border-indigo-600 text-indigo-100 ring-2 ring-indigo-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Clear Customers & Suppliers Only</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Deletes sample customer profiles and supplier records while leaving inventory and sales.
              </p>
            </button>
          </div>
        </div>

        {/* Safeguard Text Confirmation */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Type <span className="text-rose-400 font-mono font-bold">CLEAR</span> to confirm:
          </label>
          <input
            type="text"
            required
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type CLEAR in all caps..."
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono tracking-widest focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={clearing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={clearing || confirmText.trim().toUpperCase() !== 'CLEAR'}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            <Trash2 className="w-4 h-4" />
            <span>{clearing ? 'Clearing Database...' : 'Permanently Delete Selected Records'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
