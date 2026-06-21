import type { Metadata } from "next";
import AdminSessionGuard from "@/components/AdminSessionGuard/AdminSessionGuard";
import "./atrevida-gestion.css";

export const metadata: Metadata = {
  title: "Panel Administrativo - AtrevidaFit",
  description: "Panel de administración para AtrevidaFit",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-admin="true" className="admin-page">
      <AdminSessionGuard />
      {children}
    </div>
  );
}
