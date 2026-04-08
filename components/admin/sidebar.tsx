'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    label: "운영",
    items: [
      { href: "/admin", title: "대시보드" },
      { href: "/admin/campaigns", title: "시상안 목록" },
      { href: "/admin/campaigns/new", title: "시상안 등록" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">ISCawards</div>
      <div className="sidebar-subtitle">보험사 시상 관리자 콘솔</div>

      {navigation.map((section) => (
        <div key={section.label}>
          <div className="nav-section-label">{section.label}</div>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
