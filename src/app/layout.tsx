import type { Metadata } from 'next'
import './globals.css'
import { ClientAuthProvider } from '@/components/ClientAuthProvider'

// Temporarily disabled Google fonts due to Next.js 15 + Turbopack compatibility issue
// const geist = Geist({
//   subsets: ['latin'],
//   variable: '--font-geist-sans',
// })

// const geistMono = Geist_Mono({
//   subsets: ['latin'],
//   variable: '--font-geist-mono',
// })

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
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-900 text-white font-sans">
        <ClientAuthProvider>
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  )
}
