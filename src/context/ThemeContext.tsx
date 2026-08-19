import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'emerald' | 'sapphire' | 'nordic-light' | 'amber' | 'crimson' | 'amethyst';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  category: 'Dark' | 'Light';
  description: string;
  primaryColor: string;
  badgeColor: string;
  bgPreview: string;
  surfacePreview: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Executive',
    category: 'Dark',
    description: 'High-contrast dark slate with vibrant emerald accents. Ideal for low eye-strain register shifts.',
    primaryColor: '#10b981',
    badgeColor: 'bg-emerald-500',
    bgPreview: '#020617',
    surfacePreview: '#0f172a',
  },
  {
    id: 'sapphire',
    name: 'Sapphire Corporate',
    category: 'Dark',
    description: 'Deep navy obsidian with royal sapphire accents. Corporate ERP aesthetic.',
    primaryColor: '#3b82f6',
    badgeColor: 'bg-blue-500',
    bgPreview: '#030712',
    surfacePreview: '#0f172a',
  },
  {
    id: 'nordic-light',
    name: 'Nordic Daylight',
    category: 'Light',
    description: 'Crisp, high-contrast daylight mode. Built for brightly-lit pharmacy, grocery & supermarket counters.',
    primaryColor: '#059669',
    badgeColor: 'bg-emerald-600',
    bgPreview: '#f8fafc',
    surfacePreview: '#ffffff',
  },
  {
    id: 'amber',
    name: 'Amber Boutique',
    category: 'Dark',
    description: 'Warm charcoal slate with golden amber accents. Designed for luxury retail and specialty stores.',
    primaryColor: '#f59e0b',
    badgeColor: 'bg-amber-500',
    bgPreview: '#09090b',
    surfacePreview: '#18181b',
  },
  {
    id: 'crimson',
    name: 'Crimson Velocity',
    category: 'Dark',
    description: 'Deep obsidian with energetic ruby crimson highlights. Bold, high-energy retail styling.',
    primaryColor: '#f43f5e',
    badgeColor: 'bg-rose-500',
    bgPreview: '#050505',
    surfacePreview: '#121215',
  },
  {
    id: 'amethyst',
    name: 'Amethyst Royal',
    category: 'Dark',
    description: 'Deep violet midnight with royal purple accents. Modern executive styling.',
    primaryColor: '#8b5cf6',
    badgeColor: 'bg-purple-500',
    bgPreview: '#030014',
    surfacePreview: '#0f0c29',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  currentTheme: ThemeOption;
  setTheme: (themeId: ThemeId) => void;
  isLightMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('owe_pos_theme_id') as ThemeId;
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved;
    }
    return 'emerald';
  });

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const isLightMode = theme === 'nordic-light';

  useEffect(() => {
    // Apply data-theme attribute on root html and body
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (isLightMode) {
      root.classList.add('light-mode');
      root.classList.remove('dark');
      document.body.classList.remove('bg-slate-950', 'text-slate-100');
      document.body.classList.add('bg-slate-100', 'text-slate-900');
    } else {
      root.classList.remove('light-mode');
      root.classList.add('dark');
      document.body.classList.remove('bg-slate-100', 'text-slate-900');
      document.body.classList.add('bg-slate-950', 'text-slate-100');
    }

    localStorage.setItem('owe_pos_theme_id', theme);
  }, [theme, isLightMode]);

  const setTheme = (themeId: ThemeId) => {
    setThemeState(themeId);
  };

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, setTheme, isLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
