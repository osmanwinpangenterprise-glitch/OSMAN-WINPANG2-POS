import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { getSalesHistory } from '../../services/salesService';
import { getProducts } from '../../services/productService';
import { getExpenses } from '../../services/expenseService';
import { getCustomers } from '../../services/customerService';
import { getSuppliers } from '../../services/supplierService';
import { calculateFinancialSummary } from '../../services/reportService';
import { calculateInventoryValuation } from '../../services/inventoryService';
import { useInventoryAlerts } from '../../context/InventoryAlertsContext';
import { Product, Sale, Expense, Customer, Supplier } from '../../types';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Users,
  Truck,
  CreditCard,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  RefreshCw,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';

export function DashboardView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { formatCurrency, settings } = useSettings();
  const { profile } = useAuth();
  const {
    totalAlertsCount,
    outOfStockProducts,
    lowStockProducts,
    allAlertProducts,
    isChecking,
    runBackgroundCheck,
  } = useInventoryAlerts();

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<number>(30); // 1 = today, 7 = 7d, 30 = 30d

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, pList, eList, cList, supList] = await Promise.all([
        getSalesHistory(200),
        getProducts(),
        getExpenses(),
        getCustomers(),
        getSuppliers(),
      ]);
      setSales(sList);
      setProducts(pList);
      setExpenses(eList);
      setCustomers(cList);
      setSuppliers(supList);
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    return calculateFinancialSummary(sales, expenses, timeRange);
  }, [sales, expenses, timeRange]);

  const valuation = useMemo(() => {
    return calculateInventoryValuation(products);
  }, [products]);

  const totalCustomerDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [customers]);

  const totalSupplierPayables = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  }, [suppliers]);

  // Daily revenue bar data for last 7 days
  const chartDays = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString([], { weekday: 'short' });

      const daySales = sales.filter((s) => s.status === 'ACTIVE' && s.createdAt.startsWith(dateStr));
      const revenue = daySales.reduce((sum, s) => sum + s.total, 0);
      const profit = daySales.reduce((sum, s) => sum + (s.profit || 0), 0);

      days.push({ dayName, dateStr, revenue, profit });
    }
    const maxRev = Math.max(...days.map((d) => d.revenue), 100);
    return { days, maxRev };
  }, [sales]);

  const lowStockItems = useMemo(() => {
    return products.filter((p) => p.status === 'ACTIVE' && p.currentStock <= p.reorderLevel).slice(0, 5);
  }, [products]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading executive analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-6">
      {/* Top Banner: Welcome & Time Range Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Welcome back, {profile?.fullName || 'Manager'}
          </h2>
          <p className="text-xs text-slate-400">
            Real-time financial performance and inventory health overview
          </p>
        </div>

        {/* Time Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {[
            { label: 'Today', days: 1 },
            { label: '7 Days', days: 7 },
            { label: '30 Days', days: 30 },
            { label: 'All Time', days: 365 },
          ].map((t) => (
            <button
              key={t.days}
              onClick={() => setTimeRange(t.days)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                timeRange === t.days ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Inventory Background Check Notification Banner */}
      {totalAlertsCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-rose-950/70 border border-amber-500/40 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">Inventory Reorder Warning</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black tracking-wide shadow-xs">
                  {totalAlertsCount} Action{totalAlertsCount > 1 ? 's' : ''} Needed
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                <strong className="text-rose-400 font-bold">{outOfStockProducts.length} items</strong> out of stock, and{' '}
                <strong className="text-amber-300 font-bold">{lowStockProducts.length} items</strong> have fallen below their reorder threshold point.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <button
              onClick={() => runBackgroundCheck()}
              disabled={isChecking}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Rescan stock levels"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Rescan</span>
            </button>

            <button
              onClick={() => onNavigate('inventory')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Restock Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Row 1: KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Revenue */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Sales Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 tracking-tight">
            {formatCurrency(summary.totalSalesRevenue)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{summary.transactionsCount} orders completed</span>
          </div>
        </div>

        {/* Gross & Net Profit */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Estimated Net Profit</span>
            <div className="w-8 h-8 rounded-xl bg-teal-950/80 border border-teal-800 text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
            {formatCurrency(summary.netProfit)}
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Gross: {formatCurrency(summary.grossProfit)}</span>
            <span className="font-semibold text-teal-400">{summary.netMarginPercent.toFixed(1)}% margin</span>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Inventory Cost Value</span>
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 tracking-tight">
            {formatCurrency(valuation.totalCostValue)}
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>{valuation.totalItemsCount} units in stock</span>
            <span className="text-blue-400 font-medium">{valuation.totalSkus} SKUs</span>
          </div>
        </div>

        {/* Customer Receivables / Debt */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Customer Credit Debt</span>
            <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 tracking-tight">
            {formatCurrency(totalCustomerDebt)}
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Payables to Suppliers:</span>
            <span className="text-rose-400 font-medium">{formatCurrency(totalSupplierPayables)}</span>
          </div>
        </div>
      </div>

      {/* Row 2: 7-Day Revenue Trend & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 7-Day Revenue Chart */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-100">7-Day Sales Trend</h3>
              <p className="text-xs text-slate-400">Daily gross revenue and net profit</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-1 text-teal-300">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span>Profit</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
            {chartDays.days.map((d, i) => {
              const revPercent = Math.max(8, (d.revenue / chartDays.maxRev) * 100);
              const profitPercent = Math.max(4, (d.profit / chartDays.maxRev) * 100);

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    {formatCurrency(d.revenue)}
                  </div>
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    {/* Revenue Bar */}
                    <div
                      style={{ height: `${revPercent}%` }}
                      className="w-1/2 max-w-[28px] rounded-t-lg bg-emerald-600 group-hover:bg-emerald-500 transition-all"
                    />
                    {/* Profit Bar */}
                    <div
                      style={{ height: `${profitPercent}%` }}
                      className="w-1/2 max-w-[28px] rounded-t-lg bg-teal-400 group-hover:bg-teal-300 transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{d.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-100">Tender Channel Breakdown</h3>
            <p className="text-xs text-slate-400">Revenue split across payment methods</p>
          </div>

          <div className="space-y-2.5 my-2">
            {Object.keys(summary.salesByPaymentMethod).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No sales recorded in selected timeframe.</p>
            ) : (
              Object.entries(summary.salesByPaymentMethod).map(([method, amount]) => {
                const amt = Number(amount) || 0;
                const percent = summary.totalSalesRevenue > 0 ? (amt / summary.totalSalesRevenue) * 100 : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{method}</span>
                      <span className="text-emerald-400">{formatCurrency(amt)} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div style={{ width: `${percent}%` }} className="h-full bg-emerald-500 rounded-full" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => onNavigate('reports')}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View Full Financial Statement</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 3: Top Selling Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Products */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100">Top Velocity Products</h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-emerald-400 hover:underline font-semibold"
            >
              Sales Log →
            </button>
          </div>

          <div className="space-y-2">
            {summary.topSellingProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No sales recorded yet.</p>
            ) : (
              summary.topSellingProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-xs text-slate-100 block">{p.name}</span>
                      <span className="text-[10px] text-slate-400">{p.quantity} units sold</span>
                    </div>
                  </div>
                  <span className="font-bold text-xs text-emerald-400 font-mono">{formatCurrency(p.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100">Stock Reorder Alerts</h3>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Stock Manager →
            </button>
          </div>

          <div className="space-y-2">
            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-slate-400 font-medium">All items are sufficiently stocked!</p>
              </div>
            ) : (
              lowStockItems.map((prod) => (
                <div
                  key={prod.productId}
                  className="p-3 rounded-xl bg-slate-950 border border-amber-900/40 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-xs text-slate-100 block">{prod.name}</span>
                    <span className="text-[10px] text-slate-400">
                      Reorder Threshold: {prod.reorderLevel} {prod.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        prod.currentStock <= 0
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {prod.currentStock} {prod.unit} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
