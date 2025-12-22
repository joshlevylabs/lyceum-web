'use client'

import { Key, Gear, ShieldCheck, ArrowRight, Sun, Moon, Desktop } from '@phosphor-icons/react'
import { useTheme } from '@/contexts/ThemeContext'

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-sm text-foreground/60 mt-1">Manage admin configuration and licensing setup.</p>
      </div>

      {/* Appearance Section */}
      <div className="glass-card">
        <div className="p-5 border-b border-cyan-500/10">
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          <p className="text-sm text-foreground/60 mt-1">Customize the look and feel of the admin panel.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Light Theme Option */}
            <button
              onClick={() => setTheme('light')}
              className={`relative p-6 rounded-lg border-2 transition-all ${
                theme === 'light'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-cyan-500/20 hover:border-cyan-500/40 bg-transparent'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <Sun className="h-8 w-8 text-amber-400" weight="duotone" />
                <span className="font-medium text-foreground">Light</span>
                <p className="text-xs text-foreground/60 text-center">
                  Bright and clean interface
                </p>
              </div>
              {theme === 'light' && (
                <div className="absolute top-3 right-3">
                  <div className="h-6 w-6 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>

            {/* Dark Theme Option */}
            <button
              onClick={() => setTheme('dark')}
              className={`relative p-6 rounded-lg border-2 transition-all ${
                theme === 'dark'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-cyan-500/20 hover:border-cyan-500/40 bg-transparent'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <Moon className="h-8 w-8 text-indigo-400" weight="duotone" />
                <span className="font-medium text-foreground">Dark</span>
                <p className="text-xs text-foreground/60 text-center">
                  Easy on the eyes in low light
                </p>
              </div>
              {theme === 'dark' && (
                <div className="absolute top-3 right-3">
                  <div className="h-6 w-6 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>

            {/* System Theme Option */}
            <button
              onClick={() => setTheme('system')}
              className={`relative p-6 rounded-lg border-2 transition-all ${
                theme === 'system'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-cyan-500/20 hover:border-cyan-500/40 bg-transparent'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <Desktop className="h-8 w-8 text-foreground/60" weight="duotone" />
                <span className="font-medium text-foreground">System</span>
                <p className="text-xs text-foreground/60 text-center">
                  Sync with system preferences
                </p>
              </div>
              {theme === 'system' && (
                <div className="absolute top-3 right-3">
                  <div className="h-6 w-6 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="glass-card">
        <div className="p-5 border-b border-cyan-500/10">
          <h2 className="text-lg font-semibold text-foreground">Quick Links</h2>
          <p className="text-sm text-foreground/60 mt-1">Access admin tools and configuration.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/admin/debug-licenses" className="p-5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 flex items-start gap-4 group transition-all">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Key className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-cyan-400 transition-colors">Licensing Debug Tool</h3>
                <p className="text-sm text-foreground/60 mt-1">Create tables, test license creation and validation.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-foreground/40 group-hover:text-cyan-400 transition-colors" />
            </a>
            <a href="/admin/setup-enhanced-licensing" className="p-5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 flex items-start gap-4 group transition-all">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Gear className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-cyan-400 transition-colors">Setup Enhanced Licensing</h3>
                <p className="text-sm text-foreground/60 mt-1">Run schema updates and configuration.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-foreground/40 group-hover:text-cyan-400 transition-colors" />
            </a>
            <a href="/admin/health" className="p-5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 flex items-start gap-4 group transition-all">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="h-6 w-6 text-emerald-400" weight="duotone" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-cyan-400 transition-colors">System Health</h3>
                <p className="text-sm text-foreground/60 mt-1">Check environment and database connectivity.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-foreground/40 group-hover:text-cyan-400 transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
