import { Sale, Expense, Product, StockMovement } from '../types';

export interface FinancialSummary {
  periodLabel: string;
  totalSalesRevenue: number;
  totalDiscountGiven: number;
  totalTaxCollected: number;
  totalCostOfGoodsSold: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  transactionsCount: number;
  averageTransactionValue: number;
  salesByPaymentMethod: Record<string, number>;
  salesByCashier: Record<string, { count: number; revenue: number }>;
  expensesByCategory: Record<string, number>;
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

export function calculateFinancialSummary(
  sales: Sale[],
  expenses: Expense[],
  daysRange: number = 30
): FinancialSummary {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysRange);
  cutoffDate.setHours(0, 0, 0, 0);

  const activeSales = sales.filter((s) => {
    if (s.status !== 'ACTIVE') return false;
    const sDate = new Date(s.createdAt);
    return sDate >= cutoffDate;
  });

  const periodExpenses = expenses.filter((e) => {
    if (e.status === 'VOID') return false;
    const eDate = new Date(e.date);
    return eDate >= cutoffDate;
  });

  const totalSalesRevenue = activeSales.reduce((sum, s) => sum + s.total, 0);
  const totalDiscountGiven = activeSales.reduce((sum, s) => sum + (s.discount || 0), 0);
  const totalTaxCollected = activeSales.reduce((sum, s) => sum + (s.tax || 0), 0);
  const totalCogs = activeSales.reduce((sum, s) => sum + (s.costTotal || 0), 0);
  const grossProfit = Math.max(0, totalSalesRevenue - totalCogs);
  const grossMarginPercent = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netMarginPercent = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

  const transactionsCount = activeSales.length;
  const averageTransactionValue = transactionsCount > 0 ? totalSalesRevenue / transactionsCount : 0;

  // Sales by payment method
  const salesByPaymentMethod: Record<string, number> = {};
  activeSales.forEach((s) => {
    const method = s.paymentMethod || 'OTHER';
    salesByPaymentMethod[method] = (salesByPaymentMethod[method] || 0) + s.total;
  });

  // Sales by Cashier
  const salesByCashier: Record<string, { count: number; revenue: number }> = {};
  activeSales.forEach((s) => {
    const name = s.cashierName || 'Staff';
    if (!salesByCashier[name]) {
      salesByCashier[name] = { count: 0, revenue: 0 };
    }
    salesByCashier[name].count += 1;
    salesByCashier[name].revenue += s.total;
  });

  // Expenses by Category
  const expensesByCategory: Record<string, number> = {};
  periodExpenses.forEach((e) => {
    const cat = e.category || 'OTHER';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount;
  });

  // Top products
  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  activeSales.forEach((s) => {
    if (s.items) {
      s.items.forEach((item) => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productMap[item.productId].quantity += item.quantity;
        productMap[item.productId].revenue += item.total;
      });
    }
  });

  const topSellingProducts = Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    periodLabel: daysRange === 1 ? 'Today' : daysRange >= 365 ? 'All Time' : `Last ${daysRange} Days`,
    totalSalesRevenue,
    totalDiscountGiven,
    totalTaxCollected,
    totalCostOfGoodsSold: totalCogs,
    totalCogs,
    grossProfit,
    grossMarginPercent,
    totalExpenses,
    netProfit,
    netMarginPercent,
    transactionsCount,
    averageTransactionValue,
    salesByPaymentMethod,
    salesByCashier,
    expensesByCategory,
    topSellingProducts,
  };
}

/**
 * Robust CSV Generator with UTF-8 BOM encoding for seamless Excel / QuickBooks import.
 */
export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ];

  // Prepend UTF-8 BOM (\uFEFF) so Excel correctly recognizes character sets
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Current Inventory Valuation & Catalog to CSV
 */
export function exportInventoryCSV(products: Product[]) {
  const rows = products.map((p) => ({
    Barcode: p.barcode,
    SKU: p.sku,
    'Product Name': p.name,
    Category: p.categoryName || 'Uncategorized',
    'Current Stock': p.currentStock,
    Unit: p.unit || 'PCS',
    'Cost Price': p.costPrice.toFixed(2),
    'Selling Price (Retail)': p.sellingPrice.toFixed(2),
    'Wholesale Price': (p.wholesalePrice || 0).toFixed(2),
    'Total Cost Value': (p.currentStock * p.costPrice).toFixed(2),
    'Total Retail Value': (p.currentStock * p.sellingPrice).toFixed(2),
    'Reorder Threshold': p.reorderLevel,
    'Stock Status':
      p.currentStock <= 0 ? 'OUT_OF_STOCK' : p.currentStock <= p.reorderLevel ? 'LOW_STOCK' : 'OPTIMAL',
    Status: p.status,
  }));
  exportToCSV('osman-winpang-inventory-valuation', rows);
}

/**
 * Export Completed Sales Ledger to CSV
 */
export function exportSalesSummaryCSV(sales: Sale[]) {
  const rows = sales.map((s) => ({
    'Receipt Number': s.receiptNumber,
    Date: new Date(s.createdAt).toLocaleString(),
    Cashier: s.cashierName,
    Customer: s.customerName,
    'Payment Method': s.paymentMethod,
    'Payment Reference': s.paymentReference || '',
    'Subtotal (GH₵)': s.subtotal.toFixed(2),
    'Discount (GH₵)': (s.discount || 0).toFixed(2),
    'Tax (GH₵)': (s.tax || 0).toFixed(2),
    'Total Paid (GH₵)': s.total.toFixed(2),
    'COGS (GH₵)': (s.costTotal || 0).toFixed(2),
    'Gross Profit (GH₵)': (s.profit || 0).toFixed(2),
    Status: s.status,
  }));
  exportToCSV('osman-winpang-sales-ledger', rows);
}

/**
 * Export Detailed Itemized Sales Lines to CSV
 */
export function exportItemizedSalesCSV(sales: Sale[]) {
  const rows: Record<string, unknown>[] = [];
  sales.forEach((s) => {
    if (s.items && s.items.length > 0) {
      s.items.forEach((item) => {
        rows.push({
          'Receipt Number': s.receiptNumber,
          'Transaction Date': new Date(s.createdAt).toLocaleString(),
          Cashier: s.cashierName,
          Customer: s.customerName,
          Barcode: item.barcode || '',
          'Product Name': item.productName,
          Quantity: item.quantity,
          'Unit Cost (GH₵)': (item.unitCost || 0).toFixed(2),
          'Unit Price (GH₵)': item.unitPrice.toFixed(2),
          'Discount (GH₵)': (item.discount || 0).toFixed(2),
          'Tax (GH₵)': (item.tax || 0).toFixed(2),
          'Line Subtotal (GH₵)': item.subtotal.toFixed(2),
          'Line Total (GH₵)': item.total.toFixed(2),
          'Line Profit (GH₵)': (item.profit || (item.total - (item.unitCost || 0) * item.quantity)).toFixed(2),
          'Payment Method': s.paymentMethod,
          'Sale Status': s.status,
        });
      });
    }
  });
  exportToCSV('osman-winpang-itemized-sales-breakdown', rows);
}

/**
 * Export Stock Movements Audit Trail
 */
export function exportStockMovementsCSV(movements: StockMovement[]) {
  const rows = movements.map((m) => ({
    'Timestamp': new Date(m.createdAt).toLocaleString(),
    'Product Name': m.productName,
    Barcode: m.barcode || '',
    'Movement Type': m.type,
    'Quantity Change': m.quantity,
    'Stock Before': m.previousStock,
    'Stock After': m.newStock,
    'Reference ID': m.referenceId || '',
    'Audit Reason': m.reason || '',
    'Performed By': m.performedByName || m.performedBy || 'System User',
  }));
  exportToCSV('osman-winpang-stock-movements', rows);
}
