"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import PublicFooter from "@/components/layout/Footer/PublicFooter";

const PUBLIC_ROUTES = ["/", "/about", "/features", "/contact"];

export default function Footer() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) return null;

  // Only render on the designated public pages
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <PublicFooter />;
  }

  return null;
}
