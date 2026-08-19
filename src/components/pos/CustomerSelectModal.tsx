import React, { useState, useEffect, useMemo } from 'react';
import { Customer } from '../../types';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCustomers, saveCustomer } from '../../services/customerService';
import { Modal } from '../common/Modal';
import { Search, UserPlus, Check, User, Phone, MapPin } from 'lucide-react';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerSelectModal({ isOpen, onClose }: CustomerSelectModalProps) {
  const { customer, setCustomer } = useCart();
  const { formatCurrency } = useSettings();
  const { profile } = useAuth();
  const { success, error: toastError } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New customer form state
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCustomerType, setNewCustomerType] = useState<Customer['customerType']>('REGULAR');
  const [newCreditLimit, setNewCreditLimit] = useState<string>('0');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const list = await getCustomers();
      setCustomers(list);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const handleSelectWalkIn = () => {
    setCustomer({
      customerId: 'CUST-WALKIN',
      customerCode: 'WALK-IN',
      fullName: 'Walk-in Customer',
      phone: 'N/A',
      customerType: 'WALK_IN',
      creditLimit: 0,
      balance: 0,
      totalPurchases: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleSelectCustomer = (cust: Customer) => {
    setCustomer(cust);
    onClose();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPhone.trim()) {
      toastError('Required Fields', 'Full Name and Phone Number are required.');
      return;
    }

    setSaving(true);
    try {
      const created = await saveCustomer(
        {
          customerCode: `CUST-${Math.floor(100 + Math.random() * 900)}`,
          fullName: newFullName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim(),
          address: newAddress.trim(),
          customerType: newCustomerType,
          creditLimit: Number(newCreditLimit) || 0,
          balance: 0,
          status: 'ACTIVE',
        },
        profile?.userId || 'admin-01',
        profile?.fullName || 'User',
        profile?.role || 'ADMINISTRATOR'
      );

      success('Customer Registered', `${created.fullName} saved.`);
      setCustomer(created);
      setIsAddingNew(false);
      onClose();
    } catch (err: unknown) {
      toastError('Could not save customer', err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAddingNew ? 'Register New Customer Profile' : 'Select Customer for Sale'}
      maxWidth="xl"
    >
      {isAddingNew ? (
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer / Business Name *</label>
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="e.g. Mama Akosua Enterprise"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. +233 24 555 6677"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Type</label>
              <select
                value={newCustomerType}
                onChange={(e) => setNewCustomerType(e.target.value as Customer['customerType'])}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="REGULAR">Regular Retail Customer</option>
                <option value="WHOLESALE">Wholesale Tier</option>
                <option value="CREDIT">Credit Approved Account</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Credit Limit (GH₵)</label>
              <input
                type="number"
                value={newCreditLimit}
                onChange={(e) => setNewCreditLimit(e.target.value)}
                placeholder="0.00 (0 for no credit)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address (Optional)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store / Physical Location</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="e.g. Adum Central Market, Stall 12"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Back to List
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Save & Select Customer'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {/* Top Controls */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name or phone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Customer</span>
            </button>
          </div>

          {/* Quick Walk-In Button */}
          <button
            type="button"
            onClick={handleSelectWalkIn}
            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
              customer.customerId === 'CUST-WALKIN'
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
                : 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-100 block">Standard Walk-In Customer</span>
                <span className="text-[11px] text-slate-400">Cash / Mobile Money retail sale</span>
              </div>
            </div>
            {customer.customerId === 'CUST-WALKIN' && <Check className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Saved Customers List */}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading customers...</div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No matching customers found.</div>
            ) : (
              filtered.map((cust) => {
                const isSelected = customer.customerId === cust.customerId;
                return (
                  <button
                    key={cust.customerId}
                    type="button"
                    onClick={() => handleSelectCustomer(cust)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-100">{cust.fullName}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            cust.customerType === 'WHOLESALE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : cust.customerType === 'CREDIT'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cust.customerType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {cust.phone}
                        </span>
                        {cust.balance > 0 && (
                          <span className="text-amber-400 font-medium">
                            Debt: {formatCurrency(cust.balance)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
