import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.safariride.com'
  
  // Define your static routes
  const staticRoutes = [
    '',
    '/about',
    '/how-it-works',
    '/contact-us',
    '/privacy',
    '/terms',
    '/cookies',
    '/faq',
    '/browse-cars',
    '/list-your-car',
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  return [...staticRoutes]
} 