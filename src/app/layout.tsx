import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClientAuthProvider } from '@/components/ClientAuthProvider'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Lyceum - Industrial Analytics Platform',
  description: 'Advanced analytics and measurement platform for industrial applications',
  keywords: ['analytics', 'measurement', 'industrial', 'data visualization', 'testing'],
  authors: [{ name: 'Lyceum Team' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} antialiased bg-gray-900 text-white`}>
        <ClientAuthProvider>
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  )
}
