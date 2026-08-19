import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventoryAlerts } from '../../context/InventoryAlertsContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  Users,
  Truck,
  DollarSign,
  Wallet,
  FileBarChart,
  UserCog,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'pos'
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'cash'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export function Sidebar({ activeTab, onSelectTab }: SidebarProps) {
  const { isManager, isAdmin, isStorekeeper } = useAuth();
  const { totalAlertsCount, outOfStockProducts } = useInventoryAlerts();

  const mainNavItems = [
    { id: 'pos' as NavTab, label: 'POS Register', icon: ShoppingCart, highlight: true },
    { id: 'dashboard' as NavTab, label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'products' as NavTab, label: 'Products & Categories', icon: Package },
    { id: 'inventory' as NavTab, label: 'Inventory & Valuation', icon: Boxes, badge: totalAlertsCount },
    { id: 'sales' as NavTab, label: 'Sales & Receipts', icon: Receipt },
    { id: 'customers' as NavTab, label: 'Customers & Credit', icon: Users },
    { id: 'suppliers' as NavTab, label: 'Suppliers & Purchases', icon: Truck },
    { id: 'expenses' as NavTab, label: 'Operational Expenses', icon: DollarSign },
    { id: 'cash' as NavTab, label: 'Cash Drawer Shifts', icon: Wallet },
  ];

  const reportNavItems = [
    { id: 'reports' as NavTab, label: 'Financial & Profit Reports', icon: FileBarChart },
  ];

  const adminNavItems = [
    { id: 'users' as NavTab, label: 'User & Staff Accounts', icon: UserCog },
    { id: 'audit' as NavTab, label: 'Security & Audit Logs', icon: FileText },
    { id: 'settings' as NavTab, label: 'Settings & Database', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between overflow-y-auto shrink-0 select-none p-3 space-y-6">
      {/* Main Operations */}
      <div className="space-y-4">
        <div>
          <span className="px-3 text-[11px] font-bold text-slate-500 tracking-wider uppercase">Sales & Operations</span>
          <div className="mt-1 space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? item.highlight
                        ? 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-900/30'
                        : 'bg-slate-800 text-emerald-400 font-semibold'
                      : item.highlight
                      ? 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? (item.highlight ? 'text-white' : 'text-emerald-400') : item.highlight ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        outOfStockProducts.length > 0
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-amber-500 text-slate-950 font-black'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Financial Reports */}
        {(isManager || isAdmin) && (
          <div>
            <span className="px-3 text-[11px] font-bold text-slate-500 tracking-wider uppercase">Analytics & Intelligence</span>
            <div className="mt-1 space-y-1">
              {reportNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Administration */}
        {isAdmin && (
          <div>
            <span className="px-3 text-[11px] font-bold text-slate-500 tracking-wider uppercase">Administration</span>
            <div className="mt-1 space-y-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Version Tag */}
      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 px-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-400">OWE POS</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">v1.0.0</span>
        </div>
        <p className="mt-1 text-[10px] opacity-70">Production Firebase Architecture</p>
      </div>
    </aside>
  );
}
