'use client';

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function InternalSidebarActiveFix() {
  const pathname = usePathname();

  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.nav-link"));
    links.forEach((link) => link.classList.remove("active"));

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      const isActive =
        (href === "/admin" && pathname === "/admin") ||
        (href === "/admin/campaigns" && pathname === "/admin/campaigns") ||
        (href === "/admin/campaigns/new" && pathname === "/admin/campaigns/new");

      if (isActive) {
        link.classList.add("active");
      }
    });
  }, [pathname]);

  return null;
}
