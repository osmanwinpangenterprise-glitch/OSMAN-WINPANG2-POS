import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, Product, PaymentMethod } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSuppliers, saveSupplier, recordSupplierPayment, receiveGoods } from '../../services/supplierService';
import { getProducts } from '../../services/productService';
import { exportToCSV } from '../../services/reportService';
import { Modal } from '../common/Modal';
import {
  Truck,
  Plus,
  Search,
  Download,
  Phone,
  Building,
  DollarSign,
  PackagePlus,
  Trash2,
  Edit2,
  HandCoins,
  CheckCircle2,
} from 'lucide-react';

interface PurchaseLine {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export function SuppliersView() {
  const { formatCurrency, settings } = useSettings();
  const { profile } = useAuth();
  const { success, error: toastError, warning } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Add / Edit Supplier Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Receive Inventory Modal (GRN)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState<boolean>(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [amountPaid, setAmountPaid] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [receiving, setReceiving] = useState(false);

  // Line item selector in GRN
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');

  // Supplier Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, pList] = await Promise.all([getSuppliers(), getProducts()]);
      setSuppliers(sList);
      setProducts(pList);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.companyName.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        s.phone.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const totalPayables = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  }, [suppliers]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTaxNumber('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setCompanyName(s.companyName);
    setContactPerson(s.contactPerson || '');
    setPhone(s.phone);
    setEmail(s.email || '');
    setAddress(s.address || '');
    setTaxNumber(s.taxNumber || '');
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !phone.trim()) {
      warning('Validation Error', 'Company Name and Phone are required.');
      return;
    }

    setSaving(true);
    try {
      await saveSupplier(
        {
          supplierId: editingSupplier?.supplierId,
          supplierCode: editingSupplier?.supplierCode || `SUPP-${Math.floor(100 + Math.random() * 900)}`,
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          taxNumber: taxNumber.trim(),
          balance: editingSupplier?.balance || 0,
          status: 'ACTIVE',
        },
        profile?.userId || 'admin-01',
        profile?.fullName || 'User',
        profile?.role || 'ADMINISTRATOR'
      );

      success('Supplier Saved', `${companyName} record updated.`);
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toastError('Save Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenReceive = (s: Supplier) => {
    setSelectedSupplier(s);
    setInvoiceNumber(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
    setPurchaseLines([]);
    setAmountPaid('0');
    setPaymentMethod('BANK_TRANSFER');
    setPurchaseNotes('Stock shipment received');
    setSelectedProductToAdd(products[0]?.productId || '');
    setIsReceiveModalOpen(true);
  };

  const handleAddLineToGRN = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find((p) => p.productId === selectedProductToAdd);
    if (!prod) return;

    if (purchaseLines.some((l) => l.productId === prod.productId)) {
      warning('Already Added', `${prod.name} is already in this receiving list.`);
      return;
    }

    const newLine: PurchaseLine = {
      productId: prod.productId,
      productName: prod.name,
      quantity: 10,
      unitCost: prod.costPrice,
      totalCost: 10 * prod.costPrice,
    };
    setPurchaseLines([...purchaseLines, newLine]);
  };

  const handleUpdateLine = (index: number, field: 'quantity' | 'unitCost', value: number) => {
    const updated = [...purchaseLines];
    const line = { ...updated[index] };
    if (field === 'quantity') line.quantity = Math.max(1, value);
    if (field === 'unitCost') line.unitCost = Math.max(0, value);
    line.totalCost = line.quantity * line.unitCost;
    updated[index] = line;
    setPurchaseLines(updated);
  };

  const handleRemoveLine = (index: number) => {
    setPurchaseLines(purchaseLines.filter((_, i) => i !== index));
  };

  const purchaseGrandTotal = useMemo(() => {
    return purchaseLines.reduce((sum, l) => sum + l.totalCost, 0);
  }, [purchaseLines]);

  const handleConfirmReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (purchaseLines.length === 0) {
      warning('No Items', 'Please add at least one product to this shipment.');
      return;
    }

    const paidNum = Number(amountPaid) || 0;

    setReceiving(true);
    try {
      await receiveGoods({
        supplierId: selectedSupplier.supplierId,
        supplierName: selectedSupplier.companyName,
        invoiceNumber: invoiceNumber.trim() || `INV-${Date.now()}`,
        items: purchaseLines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity,
          costPrice: l.unitCost,
        })),
        discount: 0,
        tax: 0,
        amountPaid: paidNum,
        paymentMethod,
        userId: profile?.userId || 'admin-01',
        userName: profile?.fullName || 'User',
        userRole: profile?.role || 'ADMINISTRATOR',
      });

      success(
        'Inventory Restocked',
        `Received ${purchaseLines.length} items from ${selectedSupplier.companyName}. Stock updated.`
      );
      setIsReceiveModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toastError('Receiving Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setReceiving(false);
    }
  };

  const handleOpenPaySupplier = (s: Supplier) => {
    setSelectedSupplier(s);
    setPayAmount(s.balance.toString());
    setPayMethod('BANK_TRANSFER');
    setPayRef('');
    setPayNotes('Supplier invoice settlement');
    setIsPayModalOpen(true);
  };

  const handleConfirmPaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    const amount = Number(payAmount) || 0;
    if (amount <= 0) {
      warning('Invalid Amount', 'Payment amount must be greater than zero.');
      return;
    }

    setPaying(true);
    try {
      await recordSupplierPayment(
        selectedSupplier.supplierId,
        amount,
        payMethod,
        payRef.trim(),
        payNotes.trim(),
        profile?.userId || 'admin-01',
        profile?.fullName || 'User',
        profile?.role || 'ADMINISTRATOR'
      );

      success('Payment Recorded', `Paid ${formatCurrency(amount)} to ${selectedSupplier.companyName}`);
      setIsPayModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toastError('Payment Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setPaying(false);
    }
  };

  const handleExportCSV = () => {
    const rows = suppliers.map((s) => ({
      Company: s.companyName,
      ContactPerson: s.contactPerson || '',
      Phone: s.phone,
      Email: s.email || '',
      TaxNumber: s.taxNumber || '',
      BalancePayable: s.balance,
      Address: s.address || '',
    }));
    exportToCSV('suppliers-directory', rows);
    success('CSV Exported', 'Supplier directory exported.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Suppliers & Purchase Receiving (GRN)</h2>
          <p className="text-xs text-slate-400">
            Manage vendor accounts, receive incoming inventory shipments, and settle accounts payable
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
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Registered Vendors</span>
          <div className="text-xl font-extrabold text-slate-100">{suppliers.length} Suppliers</div>
          <span className="text-[10px] text-slate-500">Active distribution and wholesale supply partners</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Accounts Payable (Owed to Suppliers)</span>
          <div className="text-xl font-extrabold text-rose-400">{formatCurrency(totalPayables)}</div>
          <span className="text-[10px] text-rose-400/80 font-medium">
            {suppliers.filter((s) => s.balance > 0).length} suppliers with outstanding invoices
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers by company name, contact person, or phone..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Vendor / Company</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Phone & Email</th>
                <th className="px-4 py-3 text-right">Owed Balance (Payable)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading supplier directory...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No suppliers found matching search.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => {
                  const hasPayable = s.balance > 0;
                  return (
                    <tr key={s.supplierId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-100 block">{s.companyName}</span>
                        {s.address && <span className="text-[10px] text-slate-500 block truncate max-w-xs">{s.address}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{s.contactPerson || '—'}</td>
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="text-slate-200">{s.phone}</div>
                        {s.email && <div className="text-[10px] text-slate-500">{s.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={hasPayable ? 'text-rose-400 text-sm' : 'text-slate-500'}>
                          {formatCurrency(s.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenReceive(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-emerald-800 transition-colors"
                            title="Receive goods from supplier"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>Receive Stock</span>
                          </button>

                          {hasPayable && (
                            <button
                              onClick={() => handleOpenPaySupplier(s)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Pay supplier balance"
                            >
                              <HandCoins className="w-3.5 h-3.5 text-rose-400" />
                              <span>Pay</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit supplier details"
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

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit ${editingSupplier.companyName}` : 'Register New Vendor / Supplier'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Supplier Name *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Ghana Agro Commodities Ltd"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Mr. Charles Boateng"
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
                placeholder="+233 30 222 3344"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@vendor.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">TIN / Tax Number</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="C0012345678"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Warehouse / Physical Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Heavy Industrial Area, Tema, Ghana"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950"
            >
              {saving ? 'Saving...' : 'Save Vendor Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receive Goods GRN Modal */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title={`Receive Goods (GRN): ${selectedSupplier?.companyName || ''}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleConfirmReceiveGoods} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier Invoice / Waybill #</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="BANK_TRANSFER">Bank Transfer / Cheque</option>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CREDIT">Supplier Credit (Payable Later)</option>
              </select>
            </div>
          </div>

          {/* Add Product Line to GRN */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 block">Select Product to Receive</span>
            <div className="flex gap-2">
              <select
                value={selectedProductToAdd}
                onChange={(e) => setSelectedProductToAdd(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} (Current Stock: {p.currentStock} {p.unit})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddLineToGRN}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Lines Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-center w-24">Qty Received</th>
                  <th className="px-3 py-2 text-right w-28">Unit Cost</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchaseLines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No products added to this receiving note yet.
                    </td>
                  </tr>
                ) : (
                  purchaseLines.map((line, idx) => (
                    <tr key={line.productId}>
                      <td className="px-3 py-2 font-semibold text-slate-200">{line.productName}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleUpdateLine(idx, 'quantity', Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-center font-mono font-bold text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="any"
                          value={line.unitCost}
                          onChange={(e) => handleUpdateLine(idx, 'unitCost', Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-right font-mono text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(line.totalCost)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payment & Totals */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Amount Paid Upfront ({settings.currency})
              </label>
              <input
                type="number"
                step="any"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Remaining balance will be added to supplier accounts payable.
              </span>
            </div>

            <div className="flex flex-col justify-end text-right space-y-1">
              <span className="text-xs text-slate-400 font-medium">Grand Total Cost:</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {formatCurrency(purchaseGrandTotal)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsReceiveModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={receiving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950"
            >
              {receiving ? 'Updating Stock...' : 'Confirm Goods Received (Restock)'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Supplier Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Settle Payable: ${selectedSupplier?.companyName || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmPaySupplier} className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Total Outstanding Payable:</span>
            <span className="font-extrabold text-rose-400 font-mono text-base">
              {formatCurrency(selectedSupplier?.balance || 0)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Amount to Pay ({settings.currency}) *</label>
            <input
              type="number"
              step="any"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-rose-400 font-mono text-lg font-bold focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Disbursement Channel</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="BANK_TRANSFER">Bank Transfer / Cheque</option>
              <option value="MOBILE_MONEY">Corporate Mobile Money</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Cheque # / Bank Reference</label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. GCB-CHQ-998811"
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
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950"
            >
              {paying ? 'Recording...' : 'Disburse Supplier Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
