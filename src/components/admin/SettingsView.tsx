import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { seedInitialDemoData } from '../../services/seedService';
import { ConfirmationModal } from '../common/Modal';
import {
  Store,
  Receipt,
  Percent,
  Volume2,
  Database,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Palette,
  Check,
  Sun,
  Moon,
} from 'lucide-react';

export function SettingsView() {
  const { settings, updateSettings } = useSettings();
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error: toastError, warning } = useToast();

  const [businessName, setBusinessName] = useState(settings.businessName || 'Osman Winpang Enterprise');
  const [address, setAddress] = useState(settings.address || 'Central Business District, Accra, Ghana');
  const [phone, setPhone] = useState(settings.phone || '+233 24 000 0000');
  const [email, setEmail] = useState(settings.email || 'osmanwinpang@gmail.com');
  const [taxId, setTaxId] = useState(settings.taxId || 'C0012948576');
  const [currency, setCurrency] = useState(settings.currency || 'GHS');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || 'GH₵');
  const [taxRate, setTaxRate] = useState(settings.taxRate?.toString() || '15');
  const [taxName, setTaxName] = useState(settings.taxName || 'VAT / NHIL / GETFund');
  const [enableTax, setEnableTax] = useState(settings.enableTax ?? true);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(settings.maxDiscountPercent?.toString() || '25');
  const [receiptFooter, setReceiptFooter] = useState(
    settings.receiptFooter || 'Thank you for your business! Please check items before leaving.'
  );
  const [soundEffects, setSoundEffects] = useState(settings.soundEffects ?? true);

  const [saving, setSaving] = useState(false);
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        businessName: businessName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        taxId: taxId.trim(),
        currency: currency.trim(),
        currencySymbol: currencySymbol.trim(),
        taxRate: Number(taxRate) || 0,
        taxName: taxName.trim(),
        enableTax,
        maxDiscountPercent: Number(maxDiscountPercent) || 20,
        receiptFooter: receiptFooter.trim(),
        soundEffects,
      });
      success('Settings Saved', 'System preferences updated.');
    } catch (err: unknown) {
      toastError('Save Error', err instanceof Error ? err.message : 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteSeed = async () => {
    setSeeding(true);
    try {
      await seedInitialDemoData();
      success('Demo Store Initialized', 'Loaded comprehensive catalog, suppliers, customers, and transactions.');
      setIsSeedModalOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      toastError('Seed Error', err instanceof Error ? err.message : 'Error loading demo data');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Enterprise POS Configuration & Policies</h2>
        <p className="text-xs text-slate-400">
          Store branding, GRA Tax compliance settings, receipt customizer, and demo data generator
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Identity */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Store Identity & Header Info</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Location Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GRA Taxpayer ID (TIN) / VAT Reg #</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Currency & Tax Policies */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <Percent className="w-4 h-4 text-teal-400" />
            <span>Taxation & Currency Formatting</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency Code</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency Display Symbol</label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-bold text-emerald-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tax / VAT Rate (%)</label>
              <input
                type="number"
                step="any"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tax Label on Receipts</label>
              <input
                type="text"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Cashier Discount %</label>
              <input
                type="number"
                value={maxDiscountPercent}
                onChange={(e) => setMaxDiscountPercent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Theme & Visual Appearance */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Professional Terminal Themes & Appearance</span>
            </div>
            <span className="text-xs text-slate-400">Live preview & persistent UI profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    success('Theme Applied', `${t.name} is now active.`);
                  }}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
                    isSelected
                      ? 'border-emerald-500 bg-slate-950 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: t.primaryColor }}
                        />
                        <span className="font-bold text-xs text-slate-100">{t.name}</span>
                      </div>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          t.category === 'Light'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {t.category === 'Light' ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                        {t.category}
                      </span>
                    </div>

                    {/* Preview Stripe */}
                    <div className="h-4 rounded-lg overflow-hidden border border-slate-800 flex">
                      <div className="w-1/2" style={{ backgroundColor: t.bgPreview }} />
                      <div className="w-1/4" style={{ backgroundColor: t.surfacePreview }} />
                      <div className="w-1/4" style={{ backgroundColor: t.primaryColor }} />
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-2">{t.description}</p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className={isSelected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {isSelected ? 'Active' : 'Apply'}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Receipt & Audio Settings */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Thermal Receipt Customization & Audio</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt Footer Message</label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-300">
                Enable Web Audio tactile scanner and payment confirmation beeps
              </span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-md shadow-emerald-950"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Preferences...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Demo Data Seeder Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 space-y-3 mt-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>1-Click Enterprise Demo Data Generator</span>
            </div>
            <p className="text-xs text-slate-400">
              Populates realistic retail catalog, product categories, wholesale customers, suppliers, and sales history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSeedModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Seed Demo Data</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Demo Data Seed */}
      <ConfirmationModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        onConfirm={handleExecuteSeed}
        title="Initialize Demo Data"
        message="This will populate sample Ghanaian grocery & wholesale inventory, suppliers, customers, and recent transaction records. Continue?"
        confirmText={seeding ? 'Seeding...' : 'Populate Sample Data'}
      />
    </div>
  );
}
