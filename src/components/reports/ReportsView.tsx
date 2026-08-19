import React, { useState, useEffect, useMemo } from 'react';
import { Sale, Expense, Product } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { getSalesHistory } from '../../services/salesService';
import { getExpenses } from '../../services/expenseService';
import { getProducts } from '../../services/productService';
import {
  calculateFinancialSummary,
  exportToCSV,
  exportInventoryCSV,
  exportSalesSummaryCSV,
  exportItemizedSalesCSV,
} from '../../services/reportService';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  TrendingDown,
  Percent,
  Printer,
  CreditCard,
  UserCheck,
  Package,
  Layers,
  FileText,
  Boxes,
} from 'lucide-react';

export function ReportsView() {
  const { formatCurrency, settings } = useSettings();
  const { success, error: toastError } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<number>(30); // 1 = today, 7 = 7d, 30 = 30d, 365 = all

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, eList, pList] = await Promise.all([
        getSalesHistory(500),
        getExpenses(),
        getProducts(),
      ]);
      setSales(sList);
      setExpenses(eList);
      setProducts(pList);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    return calculateFinancialSummary(sales, expenses, timeRange);
  }, [sales, expenses, timeRange]);

  const handlePrintStatement = () => {
    window.print();
  };

  const handleExportPLCSV = () => {
    const rows = [
      { Metric: 'Reporting Period', Value: summary.periodLabel },
      { Metric: 'Gross Sales Revenue', Value: summary.totalSalesRevenue },
      { Metric: 'Discounts Granted', Value: summary.totalDiscountGiven },
      { Metric: 'Taxes/VAT Collected', Value: summary.totalTaxCollected },
      { Metric: 'Cost of Goods Sold (COGS)', Value: summary.totalCostOfGoodsSold },
      { Metric: 'Gross Profit', Value: summary.grossProfit },
      { Metric: 'Gross Margin %', Value: `${summary.grossMarginPercent.toFixed(2)}%` },
      { Metric: 'Operating Overhead / Expenses', Value: summary.totalExpenses },
      { Metric: 'Net Profit', Value: summary.netProfit },
      { Metric: 'Net Margin %', Value: `${summary.netMarginPercent.toFixed(2)}%` },
      { Metric: 'Completed Sales Transactions', Value: summary.transactionsCount },
      { Metric: 'Average Order Value (AOV)', Value: summary.averageTransactionValue },
    ];
    exportToCSV('osman-winpang-profit-loss-statement', rows);
    success('CSV Exported', 'Financial P&L statement exported.');
  };

  const handleExportInventory = () => {
    if (products.length === 0) {
      toastError('Export Error', 'No inventory products found to export.');
      return;
    }
    exportInventoryCSV(products);
    success('Inventory Exported', 'Complete inventory catalog & valuation CSV downloaded.');
  };

  const handleExportSales = () => {
    if (sales.length === 0) {
      toastError('Export Error', 'No sales transactions found to export.');
      return;
    }
    exportSalesSummaryCSV(sales);
    success('Sales Ledger Exported', 'Completed sales transactions ledger downloaded.');
  };

  const handleExportItemized = () => {
    if (sales.length === 0) {
      toastError('Export Error', 'No itemized sales found to export.');
      return;
    }
    exportItemizedSalesCSV(sales);
    success('Itemized Sales Exported', 'Detailed product line sales CSV downloaded.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Financial Reports & Accounting Exports</h2>
          <p className="text-xs text-slate-400">
            P&L statement, inventory valuation, itemized sales ledger, and accounting export center
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
            {[
              { label: 'Today', days: 1 },
              { label: '7 Days', days: 7 },
              { label: '30 Days', days: 30 },
              { label: 'All Time', days: 365 },
            ].map((t) => (
              <button
                key={t.days}
                onClick={() => setTimeRange(t.days)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === t.days ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportPLCSV}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export P&L CSV</span>
          </button>

          <button
            onClick={handlePrintStatement}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print P&L</span>
          </button>
        </div>
      </div>

      {/* Accounting & CSV Data Export Hub */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">Accounting & Spreadsheet Export Hub (CSV)</h3>
          </div>
          <span className="text-xs text-slate-400">Excel, Google Sheets, & QuickBooks Compatible</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Inventory Valuation CSV */}
          <button
            onClick={handleExportInventory}
            className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left flex flex-col justify-between transition-all group"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Boxes className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-slate-200">Current Inventory CSV</h4>
              <p className="text-[11px] text-slate-400">Stock on hand, cost vs retail valuation, and reorder levels.</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span>{products.length} Products</span>
              <Download className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Sales Summary Ledger CSV */}
          <button
            onClick={handleExportSales}
            className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-left flex flex-col justify-between transition-all group"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-slate-200">Sales Transactions Ledger</h4>
              <p className="text-[11px] text-slate-400">Receipts, tender methods, discounts, tax, totals & cashier names.</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
              <span>{sales.length} Transactions</span>
              <Download className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Itemized Line Sales CSV */}
          <button
            onClick={handleExportItemized}
            className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left flex flex-col justify-between transition-all group"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-slate-200">Itemized Sales Lines CSV</h4>
              <p className="text-[11px] text-slate-400">Line-by-line item sales, quantity sold, discounts, cost & margin.</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
              <span>Item-Level Detail</span>
              <Download className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* P&L Statement CSV */}
          <button
            onClick={handleExportPLCSV}
            className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-purple-500/50 text-left flex flex-col justify-between transition-all group"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-slate-200">Income & Profit Statement</h4>
              <p className="text-[11px] text-slate-400">Executive P&L summary breakdown for selected timeframe.</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-purple-400 font-semibold">
              <span>{summary.periodLabel}</span>
              <Download className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* Main Profit & Loss Statement Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="border-b border-slate-800 pb-4 flex justify-between items-end">
          <div>
            <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
              {settings.businessName || 'Enterprise'} — Income Statement
            </h3>
            <p className="text-xs text-slate-400">
              Period: Last {timeRange === 1 ? '24 Hours' : `${timeRange} Days`} | Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Net Profit</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(summary.netProfit)}
            </div>
          </div>
        </div>

        {/* P&L Line Breakdown */}
        <div className="space-y-3 text-xs">
          {/* Revenue */}
          <div className="flex justify-between items-center py-2 border-b border-slate-800/60 font-semibold">
            <span className="text-slate-200 text-sm">1. Gross Retail Sales Revenue</span>
            <span className="font-mono text-slate-100 text-sm">{formatCurrency(summary.totalSalesRevenue)}</span>
          </div>

          {/* Discounts */}
          <div className="flex justify-between items-center py-1.5 pl-4 text-slate-400">
            <span>Less: Promotional & Customer Discounts</span>
            <span className="font-mono text-rose-400">-{formatCurrency(summary.totalDiscountGiven)}</span>
          </div>

          {/* Tax / VAT */}
          <div className="flex justify-between items-center py-1.5 pl-4 text-slate-400">
            <span>Add: {settings.taxName || 'Tax / VAT'} Collected</span>
            <span className="font-mono text-slate-300">+{formatCurrency(summary.totalTaxCollected)}</span>
          </div>

          {/* Cost of Goods Sold */}
          <div className="flex justify-between items-center py-2 border-b border-slate-800/60 font-semibold">
            <span className="text-slate-200">2. Cost of Goods Sold (COGS)</span>
            <span className="font-mono text-rose-400">-{formatCurrency(summary.totalCostOfGoodsSold)}</span>
          </div>

          {/* Gross Profit Subtotal */}
          <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 font-bold">
            <div className="space-y-0.5">
              <span className="text-slate-100 block">GROSS OPERATING PROFIT</span>
              <span className="text-[10px] text-teal-400 font-normal">Gross Margin: {summary.grossMarginPercent.toFixed(1)}%</span>
            </div>
            <span className="font-mono text-teal-400 text-base">{formatCurrency(summary.grossProfit)}</span>
          </div>

          {/* Operating Overhead / Expenses */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center py-1 font-semibold text-slate-200">
              <span>3. Operating Overhead / Expenses</span>
              <span className="font-mono text-rose-400">-{formatCurrency(summary.totalExpenses)}</span>
            </div>

            {Object.entries(summary.expensesByCategory).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between items-center py-1 pl-4 text-slate-400">
                <span>{cat}</span>
                <span className="font-mono text-slate-400">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>

          {/* Final Net Profit */}
          <div className="flex justify-between items-center py-4 px-4 rounded-xl bg-emerald-950/60 border border-emerald-800 font-extrabold text-sm text-emerald-300 mt-4">
            <div>
              <span className="block">NET BOTTOM-LINE PROFIT</span>
              <span className="text-xs font-medium text-emerald-400">Net Margin: {summary.netMarginPercent.toFixed(1)}%</span>
            </div>
            <span className="font-mono text-xl text-emerald-400">{formatCurrency(summary.netProfit)}</span>
          </div>
        </div>
      </div>

      {/* Cashier Performance & Tender Channel Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 no-print">
        {/* Cashier Performance */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">Cashier Productivity</h3>
          </div>

          <div className="space-y-2">
            {Object.keys(summary.salesByCashier).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No cashier data for period.</p>
            ) : (
              Object.entries(summary.salesByCashier).map(([name, statObj]) => {
                const stat = statObj as { count: number; revenue: number };
                return (
                  <div
                    key={name}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{name}</span>
                      <span className="text-[10px] text-slate-500">{stat.count} orders rang up</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">{formatCurrency(stat.revenue)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Tender Matrix */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm text-slate-100">Tender Channel Volume</h3>
          </div>

          <div className="space-y-2">
            {Object.keys(summary.salesByPaymentMethod).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No payment data for period.</p>
            ) : (
              Object.entries(summary.salesByPaymentMethod).map(([method, amount]) => (
                <div
                  key={method}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-200">{method}</span>
                  <span className="font-mono font-bold text-slate-100">{formatCurrency(amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
