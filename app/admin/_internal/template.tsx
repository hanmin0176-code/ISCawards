import { InternalSidebarActiveFix } from "@/components/admin/internal-sidebar-active-fix";

export default function AdminInternalTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <InternalSidebarActiveFix />
      {children}
    </>
  );
}
