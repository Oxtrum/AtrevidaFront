import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Panel Administrativo - AtrevidaFit",
  description: "Panel de administración para AtrevidaFit",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-admin="true" className="admin-page">
      {children}
    </div>
  );
}
