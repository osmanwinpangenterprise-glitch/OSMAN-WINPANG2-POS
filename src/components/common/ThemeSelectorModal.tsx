import React from 'react';
import { useTheme, THEMES, ThemeId } from '../../context/ThemeContext';
import { Modal } from './Modal';
import { Palette, Check, Sparkles, Sun, Moon } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeSelectorModal({ isOpen, onClose }: ThemeSelectorModalProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Professional Theme" maxWidth="3xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Choose a visual theme optimized for your store lighting, terminal displays, and aesthetic preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                }}
                className={`relative p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all group hover:scale-[1.02] ${
                  isSelected
                    ? 'border-emerald-500 bg-slate-900/90 shadow-lg ring-2 ring-emerald-500/30'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                {/* Header Swatch */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shadow-inner border border-white/20"
                        style={{ backgroundColor: t.primaryColor }}
                      />
                      <span className="font-bold text-sm text-slate-100">{t.name}</span>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        t.category === 'Light'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {t.category === 'Light' ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                      {t.category}
                    </span>
                  </div>

                  {/* Palette Preview Bar */}
                  <div className="h-10 rounded-xl overflow-hidden border border-slate-800 flex shadow-inner">
                    <div
                      className="w-1/3 flex items-center justify-center text-[9px] font-mono text-white/70"
                      style={{ backgroundColor: t.bgPreview }}
                    >
                      BG
                    </div>
                    <div
                      className="w-1/3 flex items-center justify-center text-[9px] font-mono text-white/80 border-x border-white/10"
                      style={{ backgroundColor: t.surfacePreview }}
                    >
                      SURF
                    </div>
                    <div
                      className="w-1/3 flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: t.primaryColor }}
                    >
                      ACCENT
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                {/* Footer status */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className={`text-[11px] ${isSelected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                    {isSelected ? 'Active Theme' : 'Click to Apply'}
                  </span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
