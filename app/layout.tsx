import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { SplashScreen } from '@/components/layout/SplashScreen'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'feedwise',
  description: 'Lector de noticias personal con filtrado por IA',
  applicationName: 'feedwise',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'feedwise',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const splashStyles = `
  #app-splash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: #0f172a;
    transition: opacity 0.35s ease;
    pointer-events: none;
  }
  @media (prefers-color-scheme: light) {
    #app-splash { background: #ffffff; }
    #app-splash .splash-name { color: #0f172a; }
    #app-splash .splash-dot { background: #94a3b8; }
  }
  #app-splash img {
    width: 72px;
    height: 72px;
    border-radius: 18px;
    animation: splash-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  #app-splash .splash-name {
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #f8fafc;
    animation: splash-in 0.4s 0.05s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  #app-splash .splash-dots {
    display: flex;
    gap: 6px;
    animation: splash-in 0.4s 0.1s ease both;
  }
  #app-splash .splash-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #475569;
    animation: splash-pulse 1.2s ease-in-out infinite;
  }
  #app-splash .splash-dot:nth-child(2) { animation-delay: 0.15s; }
  #app-splash .splash-dot:nth-child(3) { animation-delay: 0.30s; }
  @keyframes splash-in {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes splash-pulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
    40%            { opacity: 1;   transform: scale(1.1); }
  }
`

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages()

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: splashStyles }} />
      </head>
      <body className={inter.className}>
        <div id="app-splash" aria-hidden="true">
          <Image src="/icons/icon-192.png" alt="" width={72} height={72} unoptimized />
          <span className="splash-name">feedwise</span>
          <div className="splash-dots">
            <span className="splash-dot" />
            <span className="splash-dot" />
            <span className="splash-dot" />
          </div>
        </div>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <SplashScreen />
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
