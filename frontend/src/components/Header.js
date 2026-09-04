"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from "@/components/layout/Header/DashboardHeader";
import PublicHeader from "@/components/layout/Header/PublicHeader";

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDashboardRoute = pathname?.startsWith("/dashboard");

  if (!mounted) {
    return isDashboardRoute ? <DashboardHeader /> : <PublicHeader />;
  }

  // If on dashboard or logged in on dashboard
  if (isDashboardRoute || (user && pathname !== "/" && pathname !== "/about" && pathname !== "/features" && pathname !== "/contact" && pathname !== "/login" && pathname !== "/signup" && pathname !== "/register")) {
    return <DashboardHeader />;
  }

  return <PublicHeader />;
}