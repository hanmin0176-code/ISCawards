'use client';

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isCampaignDetailPath(pathname: string) {
  return /^\/admin\/campaigns\/[^/]+(?:\/.*)?$/.test(pathname);
}

export function SidebarActiveFix() {
  const pathname = usePathname();

  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.nav-link"));

    links.forEach((link) => link.classList.remove("active"));

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      let isActive = false;

      if (href === "/admin") {
        isActive = pathname === "/admin";
      } else if (href === "/admin/campaigns") {
        isActive = pathname === "/admin/campaigns" || isCampaignDetailPath(pathname);
      } else if (href === "/admin/campaigns/new") {
        isActive = pathname === "/admin/campaigns/new";
      }

      if (isActive) {
        link.classList.add("active");
      }
    });
  }, [pathname]);

  return null;
}
