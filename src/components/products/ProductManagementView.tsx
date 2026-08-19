import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, Supplier } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getProducts, getCategories, createProduct, updateProduct, archiveProduct, saveCategory, checkBarcodeExists } from '../../services/productService';
import { getSuppliers } from '../../services/supplierService';
import { exportInventoryCSV } from '../../services/reportService';
import { Modal } from '../common/Modal';
import { ConfirmationModal } from '../common/Modal';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Barcode,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function ProductManagementView() {
  const { formatCurrency, settings } = useSettings();
  const { profile } = useAuth();
  const { success, error: toastError, warning } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Add / Edit Product Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formUnit, setFormUnit] = useState('PCS');
  const [formCostPrice, setFormCostPrice] = useState('0');
  const [formSellingPrice, setFormSellingPrice] = useState('0');
  const [formWholesalePrice, setFormWholesalePrice] = useState('0');
  const [formCurrentStock, setFormCurrentStock] = useState('0');
  const [formReorderLevel, setFormReorderLevel] = useState('10');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formTaxable, setFormTaxable] = useState(true);
  const [saving, setSaving] = useState(false);

  // Category Manager Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Delete Confirm Modal
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pList, cList, sList] = await Promise.all([getProducts(), getCategories(), getSuppliers()]);
      setProducts(pList);
      setCategories(cList);
      setSuppliers(sList);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'ARCHIVED') return false;
      const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;

      let matchesStock = true;
      if (stockFilter === 'LOW') matchesStock = p.currentStock > 0 && p.currentStock <= p.reorderLevel;
      if (stockFilter === 'OUT') matchesStock = p.currentStock <= 0;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q));

      return matchesCat && matchesStock && matchesSearch;
    });
  }, [products, selectedCategory, stockFilter, search]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode(`600${Math.floor(100000 + Math.random() * 900000)}`);
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormDescription('');
    setFormCategoryId(categories[0]?.categoryId || '');
    setFormUnit('PCS');
    setFormCostPrice('0');
    setFormSellingPrice('0');
    setFormWholesalePrice('0');
    setFormCurrentStock('0');
    setFormReorderLevel('10');
    setFormSupplierId(suppliers[0]?.supplierId || '');
    setFormTaxable(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBarcode(p.barcode || '');
    setFormSku(p.sku || '');
    setFormDescription(p.description || '');
    setFormCategoryId(p.categoryId);
    setFormUnit(p.unit || 'PCS');
    setFormCostPrice(p.costPrice.toString());
    setFormSellingPrice(p.sellingPrice.toString());
    setFormWholesalePrice((p.wholesalePrice || 0).toString());
    setFormCurrentStock(p.currentStock.toString());
    setFormReorderLevel(p.reorderLevel.toString());
    setFormSupplierId(p.supplierId || '');
    setFormTaxable(p.taxable ?? true);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      warning('Validation Error', 'Product name is required.');
      return;
    }

    const cost = Number(formCostPrice) || 0;
    const sell = Number(formSellingPrice) || 0;
    const wholesale = Number(formWholesalePrice) || 0;
    const stock = Number(formCurrentStock) || 0;
    const reorder = Number(formReorderLevel) || 0;

    if (sell < cost) {
      warning('Pricing Warning', 'Selling price is less than unit cost price.');
    }

    // Check duplicate barcode
    if (formBarcode.trim()) {
      const exists = await checkBarcodeExists(formBarcode.trim(), editingProduct?.productId);
      if (exists) {
        toastError('Barcode in Use', `Barcode "${formBarcode}" is already assigned to another item.`);
        return;
      }
    }

    const categoryObj = categories.find((c) => c.categoryId === formCategoryId);
    const supplierObj = suppliers.find((s) => s.supplierId === formSupplierId);

    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(
          editingProduct.productId,
          {
            name: formName.trim(),
            barcode: formBarcode.trim(),
            sku: formSku.trim(),
            description: formDescription.trim(),
            categoryId: formCategoryId,
            categoryName: categoryObj?.name || 'Uncategorized',
            unit: formUnit,
            costPrice: cost,
            sellingPrice: sell,
            wholesalePrice: wholesale,
            currentStock: stock,
            reorderLevel: reorder,
            supplierId: formSupplierId || undefined,
            supplierName: supplierObj?.companyName || undefined,
            taxable: formTaxable,
          },
          profile?.userId || 'admin-01',
          profile?.fullName || 'Admin',
          profile?.role || 'ADMINISTRATOR'
        );
        success('Product Updated', `${formName} saved.`);
      } else {
        await createProduct(
          {
            name: formName.trim(),
            barcode: formBarcode.trim(),
            sku: formSku.trim(),
            description: formDescription.trim(),
            categoryId: formCategoryId,
            categoryName: categoryObj?.name || 'Uncategorized',
            unit: formUnit,
            costPrice: cost,
            sellingPrice: sell,
            wholesalePrice: wholesale,
            currentStock: stock,
            reorderLevel: reorder,
            supplierId: formSupplierId || undefined,
            supplierName: supplierObj?.companyName || undefined,
            taxable: formTaxable,
            taxRate: settings.taxRate,
            status: 'ACTIVE',
          },
          profile?.userId || 'admin-01',
          profile?.fullName || 'Admin',
          profile?.role || 'ADMINISTRATOR'
        );
        success('Product Created', `${formName} added to catalog.`);
      }

      setIsModalOpen(false);
      loadAll();
    } catch (err: unknown) {
      toastError('Save Failed', err instanceof Error ? err.message : 'Error saving product.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!deleteProductId) return;
    try {
      await archiveProduct(
        deleteProductId,
        profile?.userId || 'admin-01',
        profile?.fullName || 'Admin',
        profile?.role || 'ADMINISTRATOR'
      );
      success('Product Archived', 'Item removed from active retail list.');
      setDeleteProductId(null);
      loadAll();
    } catch (err: unknown) {
      toastError('Archive Failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await saveCategory({
        categoryId: `CAT-${Date.now().toString(36).toUpperCase()}`,
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        status: 'ACTIVE',
      });
      success('Category Added', `${newCatName} created.`);
      setNewCatName('');
      setNewCatDesc('');
      const cList = await getCategories();
      setCategories(cList);
    } catch (err: unknown) {
      toastError('Category Error', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      toastError('Export Error', 'No products found to export.');
      return;
    }
    exportInventoryCSV(products);
    success('CSV Exported', 'Product catalog & inventory downloaded successfully.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Product & Category Catalog</h2>
          <p className="text-xs text-slate-400">
            Manage SKU identifiers, pricing tiers, barcodes, and inventory thresholds
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Categories ({categories.length})</span>
          </button>

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
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, barcode, or SKU..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.categoryId} value={cat.categoryId}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as 'ALL' | 'LOW' | 'OUT')}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="LOW">Low Stock (Reorder Needed)</option>
            <option value="OUT">Out of Stock Only</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Product Details</th>
                <th className="px-4 py-3">Barcode / SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Cost Price</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-right">Margin %</th>
                <th className="px-4 py-3 text-center">Stock Level</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No matching products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock > 0 && p.currentStock <= p.reorderLevel;
                  const isOut = p.currentStock <= 0;
                  const marginPercent = p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0;

                  return (
                    <tr key={p.productId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-100 block">{p.name}</span>
                        {p.description && <span className="text-[10px] text-slate-500 block truncate max-w-xs">{p.description}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        <div>{p.barcode || '—'}</div>
                        <div className="text-[10px] text-slate-500">{p.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.categoryName || 'General'}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{formatCurrency(p.costPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(p.sellingPrice)}
                        {p.wholesalePrice > 0 && (
                          <span className="block text-[10px] text-slate-500 font-normal">
                            WS: {formatCurrency(p.wholesalePrice)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-teal-400">
                        {marginPercent.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            isOut
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : isLow
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteProductId(p.productId)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Archive product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit ${editingProduct.name}` : 'Register New Product'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Royal Feast Perfumed Rice 50kg"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Barcode (EAN/UPC)</label>
              <input
                type="text"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                placeholder="Scan or auto-generated"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">SKU / Item Code</label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="e.g. RIC-50KG-01"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit of Measure</label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="PCS">PCS (Pieces)</option>
                <option value="BAG">BAG</option>
                <option value="BOX">BOX / Carton</option>
                <option value="PACK">PACK</option>
                <option value="BOTTLE">BOTTLE</option>
                <option value="KG">KG (Kilogram)</option>
                <option value="L">L (Litre)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cost Price ({settings.currency})</label>
              <input
                type="number"
                step="any"
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Selling Price ({settings.currency})</label>
              <input
                type="number"
                step="any"
                value={formSellingPrice}
                onChange={(e) => setFormSellingPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Wholesale Price ({settings.currency})</label>
              <input
                type="number"
                step="any"
                value={formWholesalePrice}
                onChange={(e) => setFormWholesalePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stock Count</label>
              <input
                type="number"
                value={formCurrentStock}
                onChange={(e) => setFormCurrentStock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reorder Alert Level</label>
              <input
                type="number"
                value={formReorderLevel}
                onChange={(e) => setFormReorderLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
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
              {saving ? 'Saving Product...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Manager Modal */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Category Management" maxWidth="md">
        <div className="space-y-4">
          <form onSubmit={handleCreateCategory} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 block">Add New Category</span>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Beverages & Drinks"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Create Category
              </button>
            </div>
          </form>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {categories.map((cat) => (
              <div
                key={cat.categoryId}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200 block">{cat.name}</span>
                  {cat.description && <span className="text-[10px] text-slate-500">{cat.description}</span>}
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {products.filter((p) => p.categoryId === cat.categoryId).length} items
                </span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Archive Product Confirmation */}
      <ConfirmationModal
        isOpen={Boolean(deleteProductId)}
        onClose={() => setDeleteProductId(null)}
        onConfirm={handleConfirmArchive}
        title="Archive Product"
        message="Are you sure you want to archive this item? It will be hidden from the active POS catalog."
        confirmText="Archive Item"
        danger
      />
    </div>
  );
}
