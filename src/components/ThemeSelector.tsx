import { useState, useRef, useEffect } from 'react';

export type AppTheme = 'light' | 'dark' | 'navy' | 'emerald' | 'charcoal' | 'amber' | 'system';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  category: string;
  icon: string;
  bgHex: string;
  panelHex: string;
  accentHex: string;
  textHex: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    name: 'Light Mode',
    category: 'Day Shift',
    icon: '☀️',
    bgHex: '#ffffff',
    panelHex: '#f4f6f9',
    accentHex: '#2f6fdf',
    textHex: '#17202e',
  },
  {
    id: 'dark',
    name: 'Dark Slate',
    category: 'Night Shift',
    icon: '🌙',
    bgHex: '#11161e',
    panelHex: '#1a212c',
    accentHex: '#6c9cff',
    textHex: '#e7ebf2',
  },
  {
    id: 'navy',
    name: 'Turag Navy',
    category: 'Executive Blue',
    icon: '🌊',
    bgHex: '#09101f',
    panelHex: '#121d36',
    accentHex: '#38bdf8',
    textHex: '#e4edf8',
  },
  {
    id: 'emerald',
    name: 'Industrial Forest',
    category: 'Eco Garments',
    icon: '🌲',
    bgHex: '#081712',
    panelHex: '#10261f',
    accentHex: '#34d399',
    textHex: '#e2f4ed',
  },
  {
    id: 'charcoal',
    name: 'Deep Charcoal',
    category: 'High Contrast',
    icon: '⬛',
    bgHex: '#09090b',
    panelHex: '#141417',
    accentHex: '#22c55e',
    textHex: '#f4f4f5',
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    category: 'Artisan Terracotta',
    icon: '🍂',
    bgHex: '#15110d',
    panelHex: '#211b15',
    accentHex: '#f59e0b',
    textHex: '#f6eee3',
  },
  {
    id: 'system',
    name: 'System Default',
    category: 'Auto OS',
    icon: '💻',
    bgHex: '#71717a',
    panelHex: '#a1a1aa',
    accentHex: '#3b82f6',
    textHex: '#ffffff',
  },
];

interface ThemeSelectorProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTheme = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)] text-[var(--color-fg)] hover:border-[var(--color-fg-muted)] transition-all cursor-pointer shadow-2xs"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Change application theme mode"
      >
        <span className="text-sm">{activeTheme.icon}</span>
        <span className="hidden sm:inline font-medium">{activeTheme.name}</span>
        {/* Color preview indicator */}
        <span
          className="w-3 h-3 rounded-full border border-black/20 dark:border-white/20 inline-block shadow-2xs"
          style={{ backgroundColor: activeTheme.accentHex }}
        />
        <svg
          className={`w-3.5 h-3.5 text-[var(--color-fg-muted)] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Flyout Palette */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-64 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-panel)] shadow-xl z-50 p-2 text-xs flex flex-col gap-1 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="px-2 py-1.5 border-b border-[var(--color-border-line)] flex items-center justify-between">
            <span className="font-bold text-[var(--color-fg)]">Theme Palette</span>
            <span className="text-[10px] text-[var(--color-fg-muted)] font-medium">6 Themes + Auto</span>
          </div>

          <div className="max-h-72 overflow-y-auto flex flex-col gap-1 py-1">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = opt.id === currentTheme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onThemeChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-fg)] text-[var(--color-bg)] font-bold shadow-xs'
                      : 'hover:bg-[var(--color-bg)] text-[var(--color-fg)]'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{opt.icon}</span>
                    <div className="flex flex-col">
                      <span className="leading-tight">{opt.name}</span>
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'opacity-85' : 'text-[var(--color-fg-muted)]'
                        }`}
                      >
                        {opt.category}
                      </span>
                    </div>
                  </div>

                  {/* Swatches preview */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-2xs"
                      style={{ backgroundColor: opt.bgHex }}
                      title={`Background: ${opt.bgHex}`}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 shadow-2xs"
                      style={{ backgroundColor: opt.accentHex }}
                      title={`Accent: ${opt.accentHex}`}
                    />
                    {isSelected && (
                      <span className="text-xs ml-1 font-bold">✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-2 pt-1 border-t border-[var(--color-border-line)] text-[10px] text-[var(--color-fg-muted)] flex justify-between items-center">
            <span>Saved to your browser</span>
            <span>⚡ Instant preview</span>
          </div>
        </div>
      )}
    </div>
  );
}
