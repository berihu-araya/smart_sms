"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar/Sidebar";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 768;
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleSidebarToggle = () => {
      setIsSidebarVisible((prev) => !prev);
    };

    window.addEventListener("smart-sms-sidebar-toggle", handleSidebarToggle);

    return () => {
      window.removeEventListener("smart-sms-sidebar-toggle", handleSidebarToggle);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarVisible(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("smart-sms-sidebar-state", {
          detail: isSidebarVisible,
        })
      );
    }
  }, [isSidebarVisible]);

  const desktopMargin = isSidebarVisible ? 280 : 72;
  const desktopWidth = isSidebarVisible ? "calc(100% - 280px)" : "calc(100% - 72px)";

  return (
    <>
      {/* Sidebar */}
      <Sidebar isVisible={isSidebarVisible} />

      {/* Main Content */}
      <main
        style={{
          marginLeft: isMobile ? 0 : desktopMargin,
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          width: isMobile ? "100%" : desktopWidth,
          boxSizing: "border-box",
          minHeight: "calc(100vh - 68px)",
        }}
      >
        {children}
      </main>
    </>
  );
}

