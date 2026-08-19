import React, { useState, useEffect, useMemo } from 'react';
import { Customer, PaymentMethod } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCashSession } from '../../context/CashSessionContext';
import { getCustomers, saveCustomer, recordCustomerPayment } from '../../services/customerService';
import { exportToCSV } from '../../services/reportService';
import { Modal } from '../common/Modal';
import {
  Users,
  UserPlus,
  Search,
  Download,
  Phone,
  MapPin,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  HandCoins,
} from 'lucide-react';

export function CustomersView() {
  const { formatCurrency, settings } = useSettings();
  const { profile } = useAuth();
  const { success, error: toastError, warning } = useToast();
  const { recordCashReceived } = useCashSession();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<Customer['customerType']>('REGULAR');
  const [creditLimit, setCreditLimit] = useState('0');
  const [initialBalance, setInitialBalance] = useState('0');
  const [saving, setSaving] = useState(false);

  // Payment / Debt Settlement Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const list = await getCustomers();
      setCustomers(list);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'DEBT' ? c.balance > 0 : c.customerType === filterType);

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q));

      return matchesType && matchesSearch;
    });
  }, [customers, filterType, search]);

  const totalOutstandingDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [customers]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCustomerType('REGULAR');
    setCreditLimit('0');
    setInitialBalance('0');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFullName(c.fullName);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCustomerType(c.customerType);
    setCreditLimit(c.creditLimit.toString());
    setInitialBalance(c.balance.toString());
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      warning('Required Fields', 'Full Name and Phone Number are required.');
      return;
    }

    setSaving(true);
    try {
      await saveCustomer(
        {
          customerId: editingCustomer?.customerId,
          customerCode: editingCustomer?.customerCode,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          customerType,
          creditLimit: Number(creditLimit) || 0,
          balance: Number(initialBalance) || 0,
          status: 'ACTIVE',
        },
        profile?.userId || 'admin-01',
        profile?.fullName || 'User',
        profile?.role || 'ADMINISTRATOR'
      );

      success('Customer Saved', `${fullName} saved successfully.`);
      setIsModalOpen(false);
      loadCustomers();
    } catch (err: unknown) {
      toastError('Save Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPayment = (c: Customer) => {
    setSelectedCustomer(c);
    setPayAmount(c.balance.toString());
    setPayMethod('CASH');
    setPayRef('');
    setPayNotes('Customer credit balance settlement');
    setIsPayModalOpen(true);
  };

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amount = Number(payAmount) || 0;
    if (amount <= 0) {
      warning('Invalid Amount', 'Payment amount must be greater than zero.');
      return;
    }

    setPaying(true);
    try {
      await recordCustomerPayment(
        selectedCustomer.customerId,
        amount,
        payMethod,
        payRef.trim(),
        payNotes.trim(),
        profile?.userId || 'admin-01',
        profile?.fullName || 'User',
        profile?.role || 'ADMINISTRATOR'
      );

      if (payMethod === 'CASH') {
        await recordCashReceived(amount);
      }

      success(
        'Payment Recorded',
        `Received ${formatCurrency(amount)} from ${selectedCustomer.fullName}`
      );
      setIsPayModalOpen(false);
      loadCustomers();
    } catch (err: unknown) {
      toastError('Payment Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setPaying(false);
    }
  };

  const handleExportCSV = () => {
    const rows = customers.map((c) => ({
      Code: c.customerCode,
      FullName: c.fullName,
      Phone: c.phone,
      Email: c.email || '',
      CustomerType: c.customerType,
      CreditLimit: c.creditLimit,
      CurrentDebtBalance: c.balance,
      TotalPurchases: c.totalPurchases || 0,
      Address: c.address || '',
    }));
    exportToCSV('customers-ledger', rows);
    success('CSV Exported', 'Customer ledger downloaded.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Customers & Credit Accounts</h2>
          <p className="text-xs text-slate-400">
            Track customer profiles, wholesale accounts, credit limits, and debt settlements
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
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Registered Accounts</span>
          <div className="text-xl font-extrabold text-slate-100">{customers.length} Accounts</div>
          <span className="text-[10px] text-slate-500">Retail, Wholesale, and Credit profiles</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Receivables / Debt</span>
          <div className="text-xl font-extrabold text-amber-400">{formatCurrency(totalOutstandingDebt)}</div>
          <span className="text-[10px] text-amber-400/80 font-medium">
            {customers.filter((c) => c.balance > 0).length} customers with outstanding balances
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Wholesale Partners</span>
          <div className="text-xl font-extrabold text-emerald-400">
            {customers.filter((c) => c.customerType === 'WHOLESALE').length} Tier Accounts
          </div>
          <span className="text-[10px] text-slate-500">Qualified for bulk wholesale pricing</span>
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
            placeholder="Search by customer name, phone, email, or code..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Account Types</option>
            <option value="DEBT">With Outstanding Debt Only</option>
            <option value="WHOLESALE">Wholesale Customers</option>
            <option value="CREDIT">Credit Approved Accounts</option>
            <option value="REGULAR">Regular Retail Customers</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Customer Profile</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Tier / Account</th>
                <th className="px-4 py-3 text-right">Credit Limit</th>
                <th className="px-4 py-3 text-right">Debt Balance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No customers found matching filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const hasDebt = c.balance > 0;
                  return (
                    <tr key={c.customerId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-100 block">{c.fullName}</span>
                        <span className="text-[10px] font-mono text-slate-500">{c.customerCode}</span>
                        {c.address && <span className="text-[10px] text-slate-400 block truncate max-w-xs">{c.address}</span>}
                      </td>
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{c.phone}</span>
                        </div>
                        {c.email && <div className="text-[10px] text-slate-500">{c.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            c.customerType === 'WHOLESALE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : c.customerType === 'CREDIT'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {c.customerType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {c.creditLimit > 0 ? formatCurrency(c.creditLimit) : 'None'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={hasDebt ? 'text-amber-400 text-sm' : 'text-slate-500'}>
                          {formatCurrency(c.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDebt && (
                            <button
                              onClick={() => handleOpenPayment(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-emerald-800 transition-colors"
                              title="Record debt settlement payment"
                            >
                              <HandCoins className="w-3.5 h-3.5" />
                              <span>Settle Debt</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit customer details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.fullName}` : 'Register New Customer Account'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer / Business Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Mama Akosua Enterprise"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233 24 555 6677"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Tier</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as Customer['customerType'])}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="REGULAR">Regular Retail Account</option>
                <option value="WHOLESALE">Wholesale Tier (Discount Pricing)</option>
                <option value="CREDIT">Credit Approved Account</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Credit Limit ({settings.currency})</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Current Outstanding Debt ({settings.currency})</label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Address / Stall Location</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Kejetia Market, Stall 4B, Kumasi"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950"
            >
              {saving ? 'Saving...' : 'Save Customer Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Settle Debt Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Receive Debt Settlement: ${selectedCustomer?.fullName || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleSettlePayment} className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Total Outstanding Balance:</span>
            <span className="font-extrabold text-amber-400 font-mono text-base">
              {formatCurrency(selectedCustomer?.balance || 0)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Received ({settings.currency}) *</label>
            <input
              type="number"
              step="any"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-lg font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="CASH">Cash (Adds to Drawer)</option>
              <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
              <option value="BANK_TRANSFER">Bank Deposit / Transfer</option>
              <option value="CARD">Debit / Credit Card</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Ref # / Cheque #</label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. MTN-TRX-29381 or Receipt #"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paying}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950"
            >
              {paying ? 'Processing...' : 'Confirm Debt Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
