import { Check, Laptop, Layout, Moon, Palette, ShieldCheck, Sliders, Sun } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { useTheme, type DensityMode, type ThemeMode } from '../components/ThemeContext'

export function SettingsPage() {
  const { user } = useAuth()
  const {
    theme,
    setTheme,
    density,
    setDensity,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useTheme()

  const themes: { id: ThemeMode; label: string; desc: string; icon: typeof Sun }[] = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Crisp Cobalt & Warm Cream palette optimized for daytime café operations.',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'High-contrast Deep Ink canvas for low-light environments and evening shifts.',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'System Preference',
      desc: 'Automatically aligns with your operating system display settings.',
      icon: Laptop,
    },
  ]

  const densities: { id: DensityMode; label: string; desc: string; badge: string }[] = [
    {
      id: 'compact',
      label: 'Compact',
      desc: 'Tight row padding and denser data tables for rapid order scanning.',
      badge: 'High Density',
    },
    {
      id: 'default',
      label: 'Default',
      desc: 'Balanced spacing and balanced typography for standard administration.',
      badge: 'Recommended',
    },
    {
      id: 'comfortable',
      label: 'Comfortable',
      desc: 'Generous padding and relaxed touch targets for tablet and POS displays.',
      badge: 'Spacious',
    },
  ]

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PREFERENCES &amp; WORKSPACE</div>
          <h1>
            Workspace Settings
            <span className="heading-period">.</span>
          </h1>
          <p>
            Customize display theme, table density, and local device preferences for Brew &amp; Boba.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Theme Settings Section */}
        <section className="settings-card" aria-labelledby="theme-heading">
          <div className="settings-card-header">
            <div className="settings-header-icon">
              <Palette size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="theme-heading">Theme &amp; Appearance</h2>
              <p>Select your preferred color scheme for the administration workspace.</p>
            </div>
          </div>

          <div className="theme-options-grid" role="radiogroup" aria-labelledby="theme-heading">
            {themes.map(t => {
              const isSelected = theme === t.id
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`theme-option-card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setTheme(t.id)}
                >
                  <div className="theme-option-top">
                    <span className="theme-icon-box">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    {isSelected && (
                      <span className="theme-active-pill">
                        <Check size={14} aria-hidden="true" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                  <strong>{t.label}</strong>
                  <p>{t.desc}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Interface Density Section */}
        <section className="settings-card" aria-labelledby="density-heading">
          <div className="settings-card-header">
            <div className="settings-header-icon">
              <Sliders size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="density-heading">Interface Density</h2>
              <p>Adjust the density of data tables, order lists, and form controls.</p>
            </div>
          </div>

          <div className="density-options-grid" role="radiogroup" aria-labelledby="density-heading">
            {densities.map(d => {
              const isSelected = density === d.id
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`density-option-card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setDensity(d.id)}
                >
                  <div className="density-option-top">
                    <span className="density-badge">{d.badge}</span>
                    {isSelected && (
                      <span className="theme-active-pill">
                        <Check size={14} aria-hidden="true" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                  <strong>{d.label}</strong>
                  <p>{d.desc}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Sidebar Preferences */}
        <section className="settings-card" aria-labelledby="layout-heading">
          <div className="settings-card-header">
            <div className="settings-header-icon">
              <Layout size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="layout-heading">Sidebar &amp; Navigation Layout</h2>
              <p>Manage default drawer and sidebar display behaviors on this computer.</p>
            </div>
          </div>

          <div className="sidebar-preference-row">
            <div>
              <strong>Collapse sidebar by default</strong>
              <p>Automatically collapse sidebar into compact icon mode to maximize table workspace.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sidebarCollapsed}
              className={`toggle-switch${sidebarCollapsed ? ' is-on' : ''}`}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <span className="toggle-thumb" />
              <span className="sr-only">
                {sidebarCollapsed ? 'Sidebar currently collapsed by default' : 'Sidebar currently expanded by default'}
              </span>
            </button>
          </div>
        </section>

        {/* Security & Local Storage Policy */}
        <section className="settings-card info-card" aria-labelledby="storage-heading">
          <div className="settings-card-header">
            <div className="settings-header-icon text-brand">
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="storage-heading">Local Storage &amp; Session Privacy</h2>
              <p>How preferences and session security are handled.</p>
            </div>
          </div>

          <div className="storage-info-content">
            <p>
              Your appearance preferences (theme, density, sidebar mode) are stored strictly in your browser&apos;s
              local storage. They are never transmitted across the network or shared with customer devices.
            </p>
            <div className="connection-badges-row">
              <div className="connection-badge">
                <span className="live-dot" aria-hidden="true" />
                <span>Verified Account: <strong>{user?.email || 'admin@brewboba.com'}</strong></span>
              </div>
              <div className="connection-badge">
                <span>Role: <strong>{user?.role || 'admin'}</strong></span>
              </div>
              <div className="connection-badge">
                <span>Portal Build: <strong>v0.1.0 (Apex Engine)</strong></span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
