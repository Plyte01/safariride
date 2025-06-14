import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard/',
        '/messages/',
        '/my-bookings/',
        '/profile/',
      ],
    },
    sitemap: 'https://www.safariride.com/sitemap.xml',
  }
} 