import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

const routes = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/reservas', changeFrequency: 'daily', priority: 0.95 },
  { path: '/reservas/crear', changeFrequency: 'daily', priority: 0.82 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    images: route.path === '/' || route.path.startsWith('/reservas')
      ? [absoluteUrl('/reserva.jpg')]
      : undefined,
  }));
}
