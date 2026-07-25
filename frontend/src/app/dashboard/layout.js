"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar/Sidebar";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 768;
  });

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
      if (window.innerWidth <= 768) {
        setIsSidebarVisible(false);
      } else {
        setIsSidebarVisible(true);
      }
    };

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

  return (
    <>
      {/* Sidebar */}
      <Sidebar isVisible={isSidebarVisible} />

      {/* Main Content */}
      <main
        style={{
          marginLeft: isSidebarVisible ? 280 : 0,
          transition: "margin-left 0.3s ease",
          width: isSidebarVisible ? "calc(100% - 280px)" : "100%",
          boxSizing: "border-box",
          minHeight: "100vh",
        }}
      >
        {children}
      </main>
    </>
  );
}

