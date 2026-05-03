import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'feedwise',
    short_name: 'feedwise',
    description: 'Lector de noticias personal con filtrado por IA',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/icons/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        // @ts-expect-error – form_factor is valid but not yet typed
        form_factor: 'wide',
      },
    ],
    categories: ['news', 'productivity'],
  }
}
