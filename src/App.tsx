import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { CashSessionProvider } from './context/CashSessionContext';
import { CartProvider } from './context/CartContext';
import { InventoryAlertsProvider } from './context/InventoryAlertsContext';
import { Navbar, ShortcutsHelpModal } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { PosView } from './components/pos/PosView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductManagementView } from './components/products/ProductManagementView';
import { InventoryView } from './components/inventory/InventoryView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { CustomersView } from './components/customers/CustomersView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { CashSessionsView } from './components/cash/CashSessionsView';
import { ReportsView } from './components/reports/ReportsView';
import { UserManagementView } from './components/admin/UserManagementView';
import { AuditLogsView } from './components/admin/AuditLogsView';
import { SettingsView } from './components/admin/SettingsView';
import { getProducts } from './services/productService';
import { seedInitialDemoData } from './services/seedService';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isSeedingInitial, setIsSeedingInitial] = useState<boolean>(false);
  const [hasPromptedSeed, setHasPromptedSeed] = useState<boolean>(false);

  // Check if store is brand new and offer automatic seeding
  useEffect(() => {
    async function checkFirstRun() {
      try {
        const prods = await getProducts();
        if (prods.length === 0 && !hasPromptedSeed) {
          setHasPromptedSeed(true);
          // Auto initialize initial seed data on fresh run
          setIsSeedingInitial(true);
          await seedInitialDemoData();
          setIsSeedingInitial(false);
        }
      } catch (err) {
        console.debug('Initial check error:', err);
        setIsSeedingInitial(false);
      }
    }
    checkFirstRun();
  }, [hasPromptedSeed]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Navbar */}
      <Navbar
        onOpenCashModal={() => setActiveTab('cash')}
        onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
        onNavigate={(tab) => setActiveTab(tab as NavTab)}
      />

      {/* Main Workspace: Sidebar + Dynamic Module View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Module Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        {/* Dynamic Center Stage */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 relative">
          {isSeedingInitial && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Bootstrapping Enterprise Catalog & Database</span>
                </h3>
                <p className="text-xs text-slate-400">Loading initial retail inventory, categories, and accounts...</p>
              </div>
            </div>
          )}

          {activeTab === 'pos' && <PosView />}
          {activeTab === 'dashboard' && <DashboardView onNavigate={(tab) => setActiveTab(tab as NavTab)} />}
          {activeTab === 'products' && <ProductManagementView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'sales' && <SalesHistoryView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'suppliers' && <SuppliersView />}
          {activeTab === 'expenses' && <ExpensesView />}
          {activeTab === 'cash' && <CashSessionsView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'users' && <UserManagementView />}
          {activeTab === 'audit' && <AuditLogsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Hotkeys Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SettingsProvider>
          <AuthProvider>
            <CashSessionProvider>
              <CartProvider>
                <InventoryAlertsProvider>
                  <AppContent />
                </InventoryAlertsProvider>
              </CartProvider>
            </CashSessionProvider>
          </AuthProvider>
        </SettingsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
