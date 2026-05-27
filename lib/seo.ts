export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://atrevidafit.com'),
);

export const siteName = 'AtrevidaFit';

export const defaultSeoDescription =
  'AtrevidaFit en Cochabamba: tratamientos corporales y faciales, aparatologia estetica, evaluacion gratuita y reservas online con confirmacion del equipo.';

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
