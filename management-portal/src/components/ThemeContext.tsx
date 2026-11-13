import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light';
export type DensityMode = 'compact' | 'default' | 'comfortable';

export interface ThemeContextValue {
  theme: ThemeMode;
  effectiveTheme: 'light';
  setTheme: (theme?: any) => void;
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

const defaultContextValue: ThemeContextValue = {
  theme: 'light',
  effectiveTheme: 'light',
  setTheme: () => {},
  density: 'default',
  setDensity: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},
  isCommandPaletteOpen: false,
  setIsCommandPaletteOpen: () => {},
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
};

export const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const val = localStorage.getItem('bb_theme');
    // Clear out any obsolete dark or system settings
    if (val && val !== 'light') {
      localStorage.removeItem('bb_theme');
    }
  } catch {
    // Ignore storage errors
  }
  return 'light';
}

function getStoredDensity(): DensityMode {
  if (typeof window === 'undefined') return 'default';
  try {
    const val = localStorage.getItem('bb_density');
    if (val === 'compact' || val === 'default' || val === 'comfortable') return val;
  } catch {
    // Ignore storage errors
  }
  return 'default';
}

function getStoredSidebar(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('bb_sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<DensityMode>(getStoredDensity);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getStoredSidebar);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Permanently enforce light theme on the document root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.setAttribute('data-density', density);
    try {
      localStorage.removeItem('bb_theme');
    } catch {
      // Ignore storage errors
    }
  }, [density]);

  const setTheme = useCallback((_newTheme?: any) => {
    // Permanent Light Mode: Purge legacy theme preference
    try {
      localStorage.removeItem('bb_theme');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setDensity = useCallback((newDensity: DensityMode) => {
    setDensityState(newDensity);
    try {
      localStorage.setItem('bb_density', newDensity);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSetSidebar = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsed(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem('bb_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    handleSetSidebar(prev => !prev);
  }, [handleSetSidebar]);

  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

  // Global keyboard shortcut for Command Palette: Cmd+K or Ctrl+K
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(open => !open);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        effectiveTheme: 'light',
        setTheme,
        density,
        setDensity,
        sidebarCollapsed,
        setSidebarCollapsed: handleSetSidebar,
        toggleSidebar,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        openCommandPalette,
        closeCommandPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
