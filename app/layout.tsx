import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sara Dental Clinic',
  description: 'نظام إدارة Sara Dental Clinic',
}

export const viewport: Viewport = {
  themeColor: '#F2ACA5',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-background">
      <body className={`${cairo.className} antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
