import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { BusinessSettings } from '../types';
import { DEFAULT_BUSINESS_SETTINGS } from '../config/constants';
import { useToast } from './ToastContext';

interface SettingsContextType {
  settings: BusinessSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
  formatCurrency: (amount: number | undefined | null) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'business');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings({ ...DEFAULT_BUSINESS_SETTINGS, ...snapshot.data() } as BusinessSettings);
        } else {
          // Initialize if document does not exist
          setDoc(settingsDocRef, DEFAULT_BUSINESS_SETTINGS).catch((err) => {
            console.warn('Could not auto-seed settings document:', err);
          });
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Settings snapshot error (using local default):', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    try {
      const merged = {
        ...settings,
        ...newSettings,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'settings', 'business'), merged);
      setSettings(merged);
      success('Settings Updated', 'Business configuration saved successfully.');
    } catch (err) {
      toastError('Failed to Save Settings', 'Please check your permissions.');
      handleFirestoreError(err, OperationType.WRITE, 'settings/business');
    }
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    const val = amount ?? 0;
    return `${settings.currencySymbol || 'GH₵'} ${Number(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
