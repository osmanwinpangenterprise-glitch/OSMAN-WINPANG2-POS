import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useCashSession } from '../../context/CashSessionContext';
import { useInventoryAlerts } from '../../context/InventoryAlertsContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useTheme } from '../../context/ThemeContext';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import { DEMO_STAFF } from '../../config/constants';
import { Modal } from './Modal';
import {
  ShoppingBag,
  Shield,
  Clock,
  Wifi,
  WifiOff,
  HelpCircle,
  Lock,
  Unlock,
  ChevronDown,
  UserCheck,
  Palette,
  Bell,
  AlertTriangle,
  RefreshCw,
  Boxes,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface NavbarProps {
  onOpenCashModal: () => void;
  onOpenShortcutsModal: () => void;
  onNavigate?: (tab: string) => void;
}

export function Navbar({ onOpenCashModal, onOpenShortcutsModal, onNavigate }: NavbarProps) {
  const { profile, activeRole, switchStaffProfile, loginWithGoogle, user, logout } = useAuth();
  const { settings, formatCurrency } = useSettings();
  const { activeSession } = useCashSession();
  const { currentTheme } = useTheme();
  const {
    totalAlertsCount,
    outOfStockProducts,
    lowStockProducts,
    allAlertProducts,
    isChecking,
    lastChecked,
    runBackgroundCheck,
  } = useInventoryAlerts();
  const isOnline = useOnlineStatus();

  const [timeStr, setTimeStr] = useState<string>('');
  const [showStaffMenu, setShowStaffMenu] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
          ' • ' +
          now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const roleColors = {
    ADMINISTRATOR: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    MANAGER: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    CASHIER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    STOREKEEPER: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  };

  const handleNavigateToInventory = () => {
    setShowNotifications(false);
    if (onNavigate) {
      onNavigate('inventory');
    }
  };

  return (
    <>
      <header className="bg-slate-900/90 border-b border-slate-800 text-slate-100 sticky top-0 z-30 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-lg border border-emerald-500/30">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                {settings.businessName || 'Osman Winpang Enterprise'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                {settings.shortName || 'OWE POS'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Enterprise Point of Sale & Management</p>
          </div>
        </div>

        {/* Middle Status Indicators */}
        <div className="hidden lg:flex items-center gap-4 text-xs">
          {/* Cash Register Session Pill */}
          <button
            onClick={onOpenCashModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              activeSession
                ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 border-amber-700/50 text-amber-300 hover:bg-amber-900/60'
            }`}
            title={activeSession ? 'Cash drawer open' : 'No active cash session'}
          >
            {activeSession ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
            <span>
              {activeSession ? (
                <>
                  <strong className="font-semibold">Drawer Active:</strong> {formatCurrency(activeSession.expectedCash)}
                </>
              ) : (
                <strong className="font-semibold text-amber-400">Drawer Closed (Click to Open)</strong>
              )}
            </span>
          </button>

          {/* Online Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              isOnline ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-rose-950/80 border-rose-700/50 text-rose-300'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span>{isOnline ? 'Cloud Synced' : 'Offline Mode'}</span>
          </div>

          {/* Live Clock */}
          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{timeStr}</span>
          </div>
        </div>

        {/* Right Controls: Notifications, Staff Switcher, Theme Switcher & Shortcuts */}
        <div className="flex items-center gap-2">
          {/* Inventory Alerts Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className={`relative p-2 rounded-xl border transition-all flex items-center justify-center ${
                totalAlertsCount > 0
                  ? 'bg-amber-950/70 border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title={`${totalAlertsCount} inventory reorder alerts`}
            >
              <Bell className={`w-4 h-4 ${totalAlertsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900 shadow-md">
                  {totalAlertsCount > 99 ? '99+' : totalAlertsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${totalAlertsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span className="font-bold text-xs text-slate-100">Stock Reorder & Alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => runBackgroundCheck()}
                      disabled={isChecking}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Run real-time inventory scan"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
                    </button>
                    <span className="text-[10px] text-slate-500">
                      {lastChecked ? lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Checked'}
                    </span>
                  </div>
                </div>

                {totalAlertsCount === 0 ? (
                  <div className="py-6 text-center space-y-1 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="font-bold text-slate-200">Optimal Stock Levels</p>
                    <p className="text-slate-500 text-[11px]">All catalog products are above reorder thresholds.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {/* Summary count badge pill */}
                    <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-rose-400 font-semibold">{outOfStockProducts.length} Out of Stock</span>
                      <span className="text-amber-400 font-semibold">{lowStockProducts.length} Below Reorder Point</span>
                    </div>

                    {allAlertProducts.slice(0, 8).map((p) => {
                      const isOut = p.currentStock <= 0;
                      return (
                        <div
                          key={p.productId}
                          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="space-y-0.5 max-w-[65%]">
                            <span className="font-semibold text-slate-200 block truncate">{p.name}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span>SKU: {p.sku || p.barcode}</span>
                              <span>•</span>
                              <span>Reorder at: {p.reorderLevel} {p.unit}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${
                                isOut
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {p.currentStock} {p.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {allAlertProducts.length > 8 && (
                      <p className="text-center text-[11px] text-slate-500 pt-1">
                        + {allAlertProducts.length - 8} more items needing reorder
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <button
                    onClick={handleNavigateToInventory}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Open Inventory Stock Manager</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme Selector Button */}
          <button
            onClick={() => setShowThemeModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700 shadow-xs"
            title={`Active Theme: ${currentTheme.name} (Click to Change)`}
          >
            <div
              className="w-3 h-3 rounded-full shadow-inner border border-white/20 shrink-0"
              style={{ backgroundColor: currentTheme.primaryColor }}
            />
            <span className="hidden sm:inline font-medium">{currentTheme.name.split(' ')[0]}</span>
            <Palette className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={onOpenShortcutsModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700"
            title="Keyboard shortcuts (F2, F4, F6, F8, F9, F10)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hotkeys</span>
          </button>

          {/* Staff Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStaffMenu((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                roleColors[activeRole] || 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <div className="text-left hidden md:block">
                <span className="font-semibold block leading-tight">{profile?.fullName || 'Staff Member'}</span>
                <span className="text-[10px] opacity-80 uppercase tracking-wider">{activeRole}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-1" />
            </button>

            {showStaffMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="text-xs font-semibold text-slate-300">Quick Staff Profile Switch</p>
                  <p className="text-[11px] text-slate-500">Test different role permissions</p>
                </div>

                <div className="space-y-1">
                  {DEMO_STAFF.map((staff) => (
                    <button
                      key={staff.userId}
                      onClick={() => {
                        switchStaffProfile(staff);
                        setShowStaffMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        profile?.userId === staff.userId ? 'bg-emerald-950/80 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-200">{staff.fullName}</div>
                        <div className="text-[10px] opacity-70 uppercase tracking-wider">{staff.role}</div>
                      </div>
                      {profile?.userId === staff.userId && <UserCheck className="w-4 h-4 text-emerald-400" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-2 mt-2">
                  {!user ? (
                    <button
                      onClick={() => {
                        setShowStaffMenu(false);
                        loginWithGoogle();
                      }}
                      className="w-full text-center px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      Sign in with Google
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowStaffMenu(false);
                        logout();
                      }}
                      className="w-full text-center px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-xs font-medium text-rose-300 transition-colors"
                    >
                      Sign Out ({user.email})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ThemeSelectorModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />
    </>
  );
}

export function ShortcutsHelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const shortcuts = [
    { key: 'F2', action: 'Search Product Catalog / Focus Barcode' },
    { key: 'F4', action: 'Select Customer (Walk-in or Credit Account)' },
    { key: 'F6', action: 'Open Payment & Checkout Drawer' },
    { key: 'F8', action: 'Hold Current Sale Cart' },
    { key: 'F9', action: 'Retrieve Held Sales' },
    { key: 'F10', action: 'Complete Sale (Instant Checkout)' },
    { key: 'ESC', action: 'Close Active Modal / Cancel Operation' },
    { key: 'Scanner', action: 'Auto-detects USB/Bluetooth Barcode Guns' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="POS Keyboard Shortcuts" maxWidth="md">
      <div className="space-y-3">
        <p className="text-xs text-slate-400 mb-2">
          Use high-velocity hotkeys to execute fast checkouts without reaching for the mouse:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
              <span className="text-xs text-slate-300">{s.action}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs font-bold shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
