import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ClientAuthProvider } from '@/components/ClientAuthProvider'
import { ClientThemeProvider } from '@/components/ClientThemeProvider'
import { ClientHeroUIProvider } from '@/components/ClientHeroUIProvider'

// Space Grotesk - Modern futuristic font
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

// JetBrains Mono for code/technical elements
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lyceum - Industrial Analytics Platform',
  description: 'Advanced analytics and measurement platform for industrial applications',
  keywords: ['analytics', 'measurement', 'industrial', 'data visualization', 'testing'],
  authors: [{ name: 'Lyceum Team' }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('lyceum_theme') || 'dark';
                  document.documentElement.classList.remove('light', 'dark', 'custom');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (theme === 'custom') {
                    document.documentElement.classList.add('custom');
                    const colors = JSON.parse(localStorage.getItem('lyceum_custom_colors') || '{}');
                    if (colors.primary) document.documentElement.style.setProperty('--color-primary', colors.primary);
                    if (colors.secondary) document.documentElement.style.setProperty('--color-secondary', colors.secondary);
                    if (colors.background) document.documentElement.style.setProperty('--color-background', colors.background);
                    if (colors.surface) document.documentElement.style.setProperty('--color-surface', colors.surface);
                    if (colors.text) document.documentElement.style.setProperty('--color-text', colors.text);
                    if (colors.textSecondary) document.documentElement.style.setProperty('--color-text-secondary', colors.textSecondary);
                    if (colors.border) document.documentElement.style.setProperty('--color-border', colors.border);
                  } else {
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {
                  console.error('Failed to load theme:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background text-foreground font-sans`}>
        <ClientHeroUIProvider>
          <ClientThemeProvider>
            <ClientAuthProvider>
              {children}
            </ClientAuthProvider>
          </ClientThemeProvider>
        </ClientHeroUIProvider>
      </body>
    </html>
  )
}
