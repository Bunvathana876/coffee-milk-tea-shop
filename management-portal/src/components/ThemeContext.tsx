import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type DensityMode = 'compact' | 'default' | 'comfortable'

export interface ThemeContextValue {
  theme: ThemeMode
  effectiveTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
  density: DensityMode
  setDensity: (density: DensityMode) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void
  toggleSidebar: () => void
  isCommandPaletteOpen: boolean
  setIsCommandPaletteOpen: (open: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
}

const defaultContextValue: ThemeContextValue = {
  theme: 'dark',
  effectiveTheme: 'dark',
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
}

export const ThemeContext = createContext<ThemeContextValue>(defaultContextValue)

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    const val = localStorage.getItem('bb_theme')
    if (val === 'light' || val === 'dark' || val === 'system') return val
  } catch {
    // Ignore storage errors
  }
  return 'dark'
}

function getStoredDensity(): DensityMode {
  if (typeof window === 'undefined') return 'default'
  try {
    const val = localStorage.getItem('bb_density')
    if (val === 'compact' || val === 'default' || val === 'comfortable') return val
  } catch {
    // Ignore storage errors
  }
  return 'default'
}

function getStoredSidebar(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('bb_sidebar_collapsed') === 'true'
  } catch {
    return false
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme)
  const [density, setDensityState] = useState<DensityMode>(getStoredDensity)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getStoredSidebar)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  // Listen to system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches)
    media.addEventListener?.('change', handler)
    return () => media.removeEventListener?.('change', handler)
  }, [])

  const effectiveTheme: 'light' | 'dark' =
    theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme

  // Apply dark class and density attribute to document root
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    root.setAttribute('data-theme', effectiveTheme)
    root.setAttribute('data-density', density)
  }, [effectiveTheme, density])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('bb_theme', newTheme)
    } catch {
      // Ignore storage errors
    }
  }, [])

  const setDensity = useCallback((newDensity: DensityMode) => {
    setDensityState(newDensity)
    try {
      localStorage.setItem('bb_density', newDensity)
    } catch {
      // Ignore storage errors
    }
  }, [])

  const handleSetSidebar = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsed(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      try {
        localStorage.setItem('bb_sidebar_collapsed', String(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }, [])

  const toggleSidebar = useCallback(() => {
    handleSetSidebar(prev => !prev)
  }, [handleSetSidebar])

  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), [])
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), [])

  // Global keyboard shortcut for Command Palette: Cmd+K or Ctrl+K
  useEffect(() => {
    if (typeof window === 'undefined') return
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsCommandPaletteOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
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
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
