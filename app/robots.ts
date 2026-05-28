import type { MetadataRoute } from 'next';
import { absoluteUrl, siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/atrevida-gestion/', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/atrevida-gestion/', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl.origin,
  };
}
