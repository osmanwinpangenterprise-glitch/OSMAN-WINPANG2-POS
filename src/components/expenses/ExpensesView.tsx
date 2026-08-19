import React, { useState, useEffect, useMemo } from 'react';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCashSession } from '../../context/CashSessionContext';
import { getExpenses, recordExpense } from '../../services/expenseService';
import { exportToCSV } from '../../services/reportService';
import { Modal } from '../common/Modal';
import {
  DollarSign,
  Plus,
  Search,
  Download,
  Receipt,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingDown,
} from 'lucide-react';

export function ExpensesView() {
  const { formatCurrency, settings } = useSettings();
  const { profile } = useAuth();
  const { success, error: toastError, warning } = useToast();
  const { currentSession, recordExpenseCashOut } = useCashSession();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('UTILITIES');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [deductFromCashDrawer, setDeductFromCashDrawer] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const list = await getExpenses();
      setExpenses(list);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCat = categoryFilter === 'ALL' || e.category === categoryFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.referenceNumber && e.referenceNumber.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [expenses, categoryFilter, search]);

  const totalExpenseSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleOpenAdd = () => {
    setTitle('');
    setCategory('UTILITIES');
    setAmount('');
    setPaymentMethod('CASH');
    setReferenceNumber('');
    setNotes('');
    setDeductFromCashDrawer(Boolean(currentSession));
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount) || 0;
    if (!title.trim() || amt <= 0) {
      warning('Validation Error', 'Title and valid expense amount are required.');
      return;
    }

    setSaving(true);
    try {
      await recordExpense(
        {
          title: title.trim(),
          category,
          amount: amt,
          paymentMethod,
          referenceNumber: referenceNumber.trim(),
          notes: notes.trim(),
          recordedBy: profile?.userId || 'admin-01',
          recordedByName: profile?.fullName || 'User',
          cashSessionId: deductFromCashDrawer ? currentSession?.sessionId : undefined,
        },
        profile?.role || 'ADMINISTRATOR'
      );

      if (deductFromCashDrawer && paymentMethod === 'CASH' && currentSession) {
        await recordExpenseCashOut(amt);
      }

      success('Expense Recorded', `${formatCurrency(amt)} logged under ${category}.`);
      setIsModalOpen(false);
      loadExpenses();
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Error recording expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const rows = expenses.map((e) => ({
      Date: new Date(e.createdAt).toLocaleString(),
      Title: e.title,
      Category: e.category,
      Amount: e.amount,
      PaymentMethod: e.paymentMethod,
      Reference: e.referenceNumber || '',
      RecordedBy: e.recordedByName,
      Notes: e.notes || '',
    }));
    exportToCSV('operational-expenses', rows);
    success('CSV Exported', 'Expenses report downloaded.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Operational Expenses & Cash Outflows</h2>
          <p className="text-xs text-slate-400">
            Log overhead, utilities, transport, maintenance, and petty cash disbursements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-950"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 font-medium">Total Filtered Operating Overhead</span>
          <div className="text-2xl font-extrabold text-rose-400">{formatCurrency(totalExpenseSum)}</div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center">
          <TrendingDown className="w-5 h-5" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses by title, voucher ref, or notes..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">All Categories</option>
            <option value="RENT">Rent & Lease</option>
            <option value="UTILITIES">Electricity & Water</option>
            <option value="SALARIES">Staff Wages & Allowances</option>
            <option value="TRANSPORT">Transport & Delivery</option>
            <option value="MAINTENANCE">Repairs & Maintenance</option>
            <option value="SUPPLIES">Packaging & Store Supplies</option>
            <option value="MARKETING">Advertising & Marketing</option>
            <option value="TAXES">Taxes & Levies</option>
            <option value="OTHER">General Miscellaneous</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Expense Item / Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Payment Channel</th>
                <th className="px-4 py-3">Voucher Ref #</th>
                <th className="px-4 py-3 text-right">Amount (GH₵)</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading expense records...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.expenseId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-100 block">{e.title}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(e.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-semibold">{e.paymentMethod}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{e.referenceNumber || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-400 text-sm">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">{e.recordedByName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Operational Expense" maxWidth="md">
        <form onSubmit={handleSaveExpense} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Title / Description *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ECG Electricity Prepaid Units"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="UTILITIES">Electricity & Water</option>
                <option value="SALARIES">Staff Wages & Allowances</option>
                <option value="RENT">Rent & Lease</option>
                <option value="TRANSPORT">Transport & Fuel</option>
                <option value="MAINTENANCE">Maintenance & Repairs</option>
                <option value="SUPPLIES">Packaging & Bags</option>
                <option value="MARKETING">Marketing & Signs</option>
                <option value="TAXES">Taxes & Council Levies</option>
                <option value="OTHER">General Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Amount ({settings.currency}) *</label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-rose-400 font-mono text-base font-bold focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="CASH">Cash (Petty Cash)</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK_TRANSFER">Bank Transfer / Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Voucher / Receipt Ref #</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. ECG-REC-001"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {paymentMethod === 'CASH' && currentSession && (
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={deductFromCashDrawer}
                onChange={(e) => setDeductFromCashDrawer(e.target.checked)}
                className="rounded text-rose-500 focus:ring-rose-500"
              />
              <span className="text-xs text-slate-300">
                Deduct directly from active register cash drawer (Session #{currentSession.sessionId.slice(-4)})
              </span>
            </label>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950"
            >
              {saving ? 'Recording...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
