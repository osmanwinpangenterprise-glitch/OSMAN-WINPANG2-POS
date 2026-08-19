import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Category } from '../../types';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { Search, Barcode, Plus, PackageX, Sparkles, Filter } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
}

export function ProductGrid({ products, categories, loading }: ProductGridProps) {
  const { addToCart, playErrorSound } = useCart();
  const { formatCurrency, settings } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input when F2 pressed or component mounts
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Filtered catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'ARCHIVED' || p.status === 'INACTIVE') return false;
      const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle manual or scanned barcode submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const matchedProduct = products.find((p) => p.barcode === code || p.sku === code || p.productId === code);
    if (matchedProduct) {
      addToCart(matchedProduct, 1);
      setBarcodeInput('');
    } else {
      playErrorSound();
      alert(`No product found matching barcode "${code}".`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 p-4 space-y-3">
      {/* Top Search & Barcode Quick-Scanner Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 shrink-0">
        {/* Barcode Gun / Fast Entry Input */}
        <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 relative flex items-center">
          <div className="absolute left-3 text-emerald-400">
            <Barcode className="w-4 h-4" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Scan Barcode or Type & Enter..."
            className="barcode-capture-input w-full pl-9 pr-14 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/50 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors"
          >
            Add
          </button>
        </form>

        {/* Product Name / Keyword Search */}
        <div className="sm:col-span-7 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name, SKU, or category..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-700 placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedCategory === 'ALL'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Filter className="w-3 h-3" />
          <span>All Items ({products.filter((p) => p.status === 'ACTIVE').length})</span>
        </button>
        {categories
          .filter((c) => c.status === 'ACTIVE')
          .map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.categoryId && p.status === 'ACTIVE').length;
            const isSelected = selectedCategory === cat.categoryId;
            return (
              <button
                key={cat.categoryId}
                onClick={() => setSelectedCategory(cat.categoryId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.name} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
      </div>

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading store catalog...</span>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-8 text-center space-y-2">
            <PackageX className="w-12 h-12 text-slate-600 stroke-1" />
            <p className="font-semibold text-slate-400">No matching products found</p>
            <p className="text-slate-500 max-w-xs">
              {searchQuery ? `No items found for "${searchQuery}". Try another keyword or scan a barcode.` : 'No products available in this category.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 pb-4">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.currentStock <= 0;
              const isLowStock = product.currentStock > 0 && product.currentStock <= product.reorderLevel;

              return (
                <button
                  key={product.productId}
                  onClick={() => addToCart(product, 1)}
                  disabled={isOutOfStock && !settings.allowNegativeStock}
                  className={`group relative text-left p-3 rounded-2xl bg-slate-900 border transition-all flex flex-col justify-between h-36 ${
                    isOutOfStock
                      ? 'border-rose-900/40 opacity-60 bg-rose-950/10 cursor-not-allowed'
                      : isLowStock
                      ? 'border-amber-800/50 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-950/20'
                      : 'border-slate-800 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-950/30'
                  }`}
                >
                  {/* Card Header: Category & Stock Badge */}
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[70%]">
                      {product.categoryName || 'Item'}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        isOutOfStock
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : isLowStock
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {isOutOfStock ? 'Out' : `${product.currentStock} ${product.unit || 'PCS'}`}
                    </span>
                  </div>

                  {/* Product Name */}
                  <div className="my-1">
                    <h4 className="font-semibold text-xs text-slate-100 line-clamp-2 leading-tight group-hover:text-emerald-300 transition-colors">
                      {product.name}
                    </h4>
                    {product.barcode && (
                      <span className="text-[10px] font-mono text-slate-500 block truncate mt-0.5">
                        #{product.barcode}
                      </span>
                    )}
                  </div>

                  {/* Card Footer: Price & Add Icon */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 w-full">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">
                        {formatCurrency(product.sellingPrice)}
                      </span>
                      {product.wholesalePrice > 0 && (
                        <span className="text-[9px] text-slate-500 block">
                          WS: {formatCurrency(product.wholesalePrice)}
                        </span>
                      )}
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
