import { SidebarActiveFix } from "@/components/admin/sidebar-active-fix";

export default function AdminTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SidebarActiveFix />
      {children}
    </>
  );
}
