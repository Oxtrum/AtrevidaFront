import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AtrevidaFit — Belleza, Cosmética y Cuidado Personal",
  description:
    "AtrevidaFit: Tecnología y salud al servicio de tu belleza. Productos de cosmética y cuidado personal que transforman tu rutina.",
};

import ToastContainer from "@/components/Shared/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex flex-col min-h-full">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
