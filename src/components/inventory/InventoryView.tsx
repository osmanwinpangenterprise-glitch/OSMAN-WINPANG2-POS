import React, { useState, useEffect, useMemo } from 'react';
import { Product, StockMovement, StockMovementType } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useInventoryAlerts } from '../../context/InventoryAlertsContext';
import { getProducts } from '../../services/productService';
import { adjustStock, getStockMovements, calculateInventoryValuation } from '../../services/inventoryService';
import { exportInventoryCSV, exportStockMovementsCSV } from '../../services/reportService';
import { Modal } from '../common/Modal';
import {
  Boxes,
  Sliders,
  TrendingUp,
  AlertTriangle,
  History,
  Download,
  Search,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  RefreshCw,
  AlertOctagon,
  PackagePlus,
  ShieldCheck,
} from 'lucide-react';

export function InventoryView() {
  const { formatCurrency } = useSettings();
  const { profile } = useAuth();
  const { success, error: toastError, warning } = useToast();
  const {
    totalAlertsCount,
    outOfStockProducts,
    lowStockProducts,
    allAlertProducts,
    isChecking,
    lastChecked,
    runBackgroundCheck,
  } = useInventoryAlerts();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MOVEMENTS'>('STOCK');

  // Search & Filters
  const [search, setSearch] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<StockMovementType>('ADJUSTMENT');
  const [adjustQty, setAdjustQty] = useState<string>('1');
  const [adjustDirection, setAdjustDirection] = useState<'ADD' | 'REMOVE'>('REMOVE');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjusting, setAdjusting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, mList] = await Promise.all([getProducts(), getStockMovements(150)]);
      setProducts(pList);
      setMovements(mList);
      // Run background synchronization check
      runBackgroundCheck();
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const valuation = useMemo(() => calculateInventoryValuation(products), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'ARCHIVED') return false;
      let matchesStock = true;
      if (stockFilter === 'LOW') matchesStock = p.currentStock > 0 && p.currentStock <= p.reorderLevel;
      if (stockFilter === 'OUT') matchesStock = p.currentStock <= 0;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);

      return matchesStock && matchesSearch;
    });
  }, [products, stockFilter, search]);

  const filteredMovements = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return movements;
    return movements.filter(
      (m) =>
        m.productName.toLowerCase().includes(q) ||
        (m.barcode && m.barcode.toLowerCase().includes(q)) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(q)) ||
        m.performedByName.toLowerCase().includes(q)
    );
  }, [movements, search]);

  const handleOpenAdjust = (p: Product, mode: 'ADD' | 'REMOVE' = 'REMOVE') => {
    setAdjustProduct(p);
    setAdjustDirection(mode);
    if (mode === 'ADD') {
      setAdjustType('PURCHASE');
      setAdjustQty('10');
      setAdjustReason('Restock batch received from supplier');
    } else {
      setAdjustType('ADJUSTMENT');
      setAdjustQty('1');
      setAdjustReason('Damaged goods write-off');
    }
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;

    const qtyNumber = Math.abs(Number(adjustQty) || 0);
    if (qtyNumber <= 0) {
      warning('Invalid Quantity', 'Please specify a quantity greater than zero.');
      return;
    }
    if (!adjustReason.trim()) {
      warning('Reason Required', 'Please enter an audit reason for the inventory adjustment.');
      return;
    }

    const netChange = adjustDirection === 'ADD' ? qtyNumber : -qtyNumber;

    setAdjusting(true);
    try {
      await adjustStock({
        productId: adjustProduct.productId,
        type: adjustType,
        quantityChange: netChange,
        reason: adjustReason.trim(),
        performedBy: profile?.userId || 'admin-01',
        performedByName: profile?.fullName || 'User',
        performedByRole: profile?.role || 'ADMINISTRATOR',
      });

      success(
        'Stock Adjusted',
        `${adjustProduct.name} stock updated by ${netChange > 0 ? '+' : ''}${netChange} ${adjustProduct.unit}`
      );
      setIsAdjustModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      toastError('Adjustment Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setAdjusting(false);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'STOCK') {
      if (products.length === 0) {
        toastError('Export Error', 'No inventory products found to export.');
        return;
      }
      exportInventoryCSV(products);
      success('Inventory Exported', 'Full inventory valuation CSV downloaded.');
    } else {
      if (movements.length === 0) {
        toastError('Export Error', 'No stock movement records to export.');
        return;
      }
      exportStockMovementsCSV(movements);
      success('Movements Exported', 'Stock ledger movement audit trail downloaded.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100">Inventory & Stock Ledger</h2>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto Background Audit</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Real-time stock valuation, reorder point monitoring, and discrepancy adjustments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Background Check Button */}
          <button
            onClick={() => runBackgroundCheck()}
            disabled={isChecking}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
            title="Scan all product stock levels against reorder thresholds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isChecking ? 'Scanning...' : 'Check Stock'}</span>
          </button>

          {/* Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'STOCK' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stock Valuation
            </button>
            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'MOVEMENTS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Movement History
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Real-time Reorder Alerts Warning Banner */}
      {valuation.lowStockCount + valuation.outOfStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-rose-950/70 border border-amber-500/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-100">Background Reorder Check: Items Flagged</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                  {valuation.outOfStockCount + valuation.lowStockCount} Flagged
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {valuation.outOfStockCount > 0 && (
                  <span className="text-rose-400 font-semibold">{valuation.outOfStockCount} out of stock. </span>
                )}
                {valuation.lowStockCount > 0 && (
                  <span className="text-amber-300 font-semibold">{valuation.lowStockCount} below reorder threshold point.</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                stockFilter === 'ALL'
                  ? 'bg-slate-800 border-slate-600 text-slate-100'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('LOW')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                stockFilter === 'LOW'
                  ? 'bg-amber-950 border-amber-700 text-amber-300'
                  : 'bg-slate-950/80 border-slate-800 text-amber-400/80 hover:text-amber-300'
              }`}
            >
              Low Stock ({valuation.lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('OUT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                stockFilter === 'OUT'
                  ? 'bg-rose-950 border-rose-700 text-rose-300'
                  : 'bg-slate-950/80 border-slate-800 text-rose-400/80 hover:text-rose-300'
              }`}
            >
              Out of Stock ({valuation.outOfStockCount})
            </button>
          </div>
        </div>
      )}

      {/* Valuation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Cost Valuation</span>
          <div className="text-xl font-extrabold text-slate-100">{formatCurrency(valuation.totalCostValue)}</div>
          <span className="text-[10px] text-slate-500">{valuation.totalItemsCount} units across {valuation.totalSkus} SKUs</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Retail Valuation</span>
          <div className="text-xl font-extrabold text-emerald-400">{formatCurrency(valuation.totalRetailValue)}</div>
          <span className="text-[10px] text-slate-500">Gross realization value</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Potential Gross Profit</span>
          <div className="text-xl font-extrabold text-teal-400">{formatCurrency(valuation.potentialGrossProfit)}</div>
          <span className="text-[10px] text-teal-400/80 font-medium">
            {valuation.totalRetailValue > 0 ? ((valuation.potentialGrossProfit / valuation.totalRetailValue) * 100).toFixed(1) : 0}% potential margin
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Stock Status Alerts</span>
            {valuation.lowStockCount + valuation.outOfStockCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                Action Required
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                Healthy
              </span>
            )}
          </div>
          <div className="text-xl font-extrabold text-amber-400">
            {valuation.lowStockCount} Low / {valuation.outOfStockCount} Out
          </div>
          <span className="text-[10px] text-amber-400/80 font-medium">
            {valuation.lowStockCount + valuation.outOfStockCount > 0 ? 'Flagged by background monitor' : 'All items optimal'}
          </span>
        </div>
      </div>

      {/* Search & Stock Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'STOCK' ? 'Search items by name, barcode, or SKU...' : 'Search movement audit trail...'}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {activeTab === 'STOCK' && (
          <div className="sm:col-span-4">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'ALL' | 'LOW' | 'OUT')}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
            >
              <option value="ALL">All Items ({products.length})</option>
              <option value="LOW">⚠️ Below Reorder Level ({valuation.lowStockCount})</option>
              <option value="OUT">🚨 Out of Stock ({valuation.outOfStockCount})</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Table: Stock or Movements */}
      {activeTab === 'STOCK' ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Product Name & Status</th>
                  <th className="px-4 py-3">Barcode / SKU</th>
                  <th className="px-4 py-3 text-center">Current Stock vs Reorder Level</th>
                  <th className="px-4 py-3 text-right">Cost Value</th>
                  <th className="px-4 py-3 text-right">Retail Value</th>
                  <th className="px-4 py-3 text-right">Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.currentStock > 0 && p.currentStock <= p.reorderLevel;
                    const isOut = p.currentStock <= 0;

                    return (
                      <tr
                        key={p.productId}
                        className={`transition-colors ${
                          isOut
                            ? 'bg-rose-950/10 hover:bg-rose-950/20'
                            : isLow
                            ? 'bg-amber-950/10 hover:bg-amber-950/20'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="font-bold text-slate-100 block">{p.name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500">{p.categoryName || 'General'}</span>
                                {isOut ? (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[9px] font-bold">
                                    OUT OF STOCK
                                  </span>
                                ) : isLow ? (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-bold">
                                    BELOW REORDER POINT
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                          <div>{p.barcode || '—'}</div>
                          <div className="text-[10px] text-slate-500">{p.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-xs ${
                                isOut
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : isLow
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              }`}
                            >
                              {p.currentStock} {p.unit}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Min threshold: {p.reorderLevel} {p.unit}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-300">
                          {formatCurrency(p.currentStock * p.costPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(p.currentStock * p.sellingPrice)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(isLow || isOut) && (
                              <button
                                onClick={() => handleOpenAdjust(p, 'ADD')}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-xs font-semibold text-emerald-300 flex items-center gap-1 transition-colors border border-emerald-800/80"
                                title="Quick Restock Batch"
                              >
                                <PackagePlus className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Restock</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenAdjust(p, 'REMOVE')}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors border border-slate-700"
                              title="Manual Stock Discrepancy Adjustment"
                            >
                              <Sliders className="w-3.5 h-3.5 text-amber-400" />
                              <span>Adjust</span>
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
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3 text-center">Change</th>
                  <th className="px-4 py-3 text-center">Before → After</th>
                  <th className="px-4 py-3">Reference / Reason</th>
                  <th className="px-4 py-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No stock movement records found.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr key={m.movementId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-100 block">{m.productName}</span>
                        {m.barcode && <span className="font-mono text-[10px] text-slate-500">#{m.barcode}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.type === 'SALE'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : m.type === 'PURCHASE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : m.type === 'DAMAGE' || m.type === 'EXPIRED'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-center font-bold font-mono ${
                          m.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-400 text-[11px]">
                        {m.previousStock} → {m.newStock}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div>{m.reason || 'General movement'}</div>
                        {m.referenceId && (
                          <div className="text-[10px] text-slate-500 font-mono">Ref: {m.referenceId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">{m.performedByName || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && adjustProduct && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={`Inventory Adjustment: ${adjustProduct.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteAdjustment} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block">Current Stock On Hand:</span>
                <span className="font-extrabold text-sm text-slate-100">
                  {adjustProduct.currentStock} {adjustProduct.unit}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Reorder Alert Threshold:</span>
                <span className="font-bold text-amber-400">
                  {adjustProduct.reorderLevel} {adjustProduct.unit}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Adjustment Operation</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustDirection('ADD')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    adjustDirection === 'ADD'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Increase Stock (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustDirection('REMOVE')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    adjustDirection === 'REMOVE'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Decrease Stock (-)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Quantity ({adjustProduct.unit}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Audit Movement Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as StockMovementType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ADJUSTMENT">Discrepancy / Stock Count</option>
                  <option value="PURCHASE">Direct Supplier Restock</option>
                  <option value="RETURN">Customer Return / Restock</option>
                  <option value="REFUND">Refund Restock</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Reason / Audit Trail Note *</label>
              <textarea
                required
                rows={2}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Physical stock count mismatch, newly delivered consignment, damaged packing..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md ${
                  adjustDirection === 'ADD'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {adjusting ? 'Updating Stock...' : 'Confirm Stock Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
