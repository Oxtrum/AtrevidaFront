import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { absoluteUrl, defaultSeoDescription, siteName, siteUrl } from "@/lib/seo";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: siteName,
  title: {
    default: "AtrevidaFit | Tratamientos corporales y faciales en Cochabamba",
    template: `%s | ${siteName}`,
  },
  description: defaultSeoDescription,
  keywords: [
    "AtrevidaFit",
    "Atrevida Fit",
    "tratamientos corporales Cochabamba",
    "tratamientos faciales Cochabamba",
    "maderoterapia Cochabamba",
    "criolipolisis Cochabamba",
    "radiofrecuencia Cochabamba",
    "lipolaser Cochabamba",
    "estetica Cochabamba",
    "reservas estetica Cochabamba",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_BO",
    url: "/",
    siteName,
    title: "AtrevidaFit | Tratamientos corporales y faciales en Cochabamba",
    description: defaultSeoDescription,
    images: [
      {
        url: absoluteUrl("/reserva.jpg"),
        width: 1200,
        height: 800,
        alt: "AtrevidaFit tratamientos esteticos en Cochabamba",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AtrevidaFit | Tratamientos corporales y faciales en Cochabamba",
    description: defaultSeoDescription,
    images: [absoluteUrl("/reserva.jpg")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/Logo.PNG",
    apple: "/Logo.PNG",
  },
};

import ToastContainer from "@/components/Shared/Toast";
import WhatsappFab from "@/components/WhatsappFab/WhatsappFab";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex flex-col min-h-full">
        {children}
        <WhatsappFab />
        <ToastContainer />
      </body>
    </html>
  );
}
