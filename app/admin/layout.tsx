import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-shell">{children}</main>
    </div>
  );
}
