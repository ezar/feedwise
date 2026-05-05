import withPWAInit from '@ducanh2912/next-pwa'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  customWorkerSrc: 'worker',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // Articles API — NetworkFirst: sirve de red, cae a caché si offline
        urlPattern: /^\/api\/articles(\?.*)?$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-articles',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        // Páginas del dashboard — NetworkFirst con fallback a caché
        urlPattern: /^\/(briefing|saved|settings|feeds)?(\/.*)?$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'news.google.com' },
    ],
  },
}

export default withPWA(withNextIntl(nextConfig))
