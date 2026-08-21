"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HiBars3 } from "react-icons/hi2";
import { useAuth } from "@/hooks/useAuth";
import styles from "./Header.module.css";

export default function Header() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith("/dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toggleHover, setToggleHover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menus on route change
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMenuOpen(false);
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    const handleSidebarState = (event) => {
      setSidebarOpen(Boolean(event.detail));
    };

    window.addEventListener("smart-sms-sidebar-state", handleSidebarState);

    return () => {
      window.removeEventListener("smart-sms-sidebar-state", handleSidebarState);
    };
  }, []);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreen();

    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const handleSidebarToggle = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("smart-sms-sidebar-toggle"));
    }
  };

  // Prevent hydration mismatch by using mounted guard for client-specific auth and screen states
  const activeUser = mounted ? user : null;
  const activeIsMobile = mounted ? isMobile : false;

  const accountIdentifier = activeUser?.username || activeUser?.email || "";
  const userDisplayName = activeUser
    ? activeUser.name || `${activeUser.firstName || ""} ${activeUser.lastName || ""}`.trim() || "Account"
    : "";
  const userInitial = (accountIdentifier || userDisplayName).charAt(0).toUpperCase();

  const renderToggleIcon = () => {
    if (toggleHover) {
      return sidebarOpen ? "❮" : "❯";
    }

    return <HiBars3 />;
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.leftGroup}>
          {/* Sidebar Toggle */}
          {isDashboardRoute && (
            <button
              type="button"
              className={styles.menuToggle}
              onClick={handleSidebarToggle}
              onMouseEnter={() => setToggleHover(true)}
              onMouseLeave={() => setToggleHover(false)}
              aria-label="Toggle sidebar"
            >
              {renderToggleIcon()}
            </button>
          )}

          {/* Center Logo */}
          <Link href="/" className={styles.logo}>
            <Image
              src="/school-logo-1.png"
              alt="School Logo"
              width={50}
              height={50}
            />
            <span>𝐘𝐎𝐘𝐎 ACADEMY</span>
          </Link>

          {!activeUser && (
            <button
              type="button"
              className={styles.mobileMenuToggle}
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <HiBars3 />
            </button>
          )}
        </div>

        {/* Navigation */}
        {!activeUser && (
          <nav className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ""}`}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)}>
              About Us
            </Link>
            <Link href="/features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </Link>

            {activeIsMobile ? (
              <Link href="/applications" onClick={() => setMobileMenuOpen(false)}>
                Application
              </Link>
            ) : (
              <div className={styles.dropdown}>
                <span className={styles.dropbtn}>Application ▾</span>

                <div className={styles.dropdownContent}>
                  <Link
                    href="/admin"
                    className={styles.appCard}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={styles.icon}>🖥️</div>
                    <div>
                      <h4>Admin Dashboard</h4>
                      <p>Complete control center for school administrators and staff.</p>
                    </div>
                  </Link>

                  <Link
                    href="/teacher"
                    className={styles.appCard}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={styles.icon}>🎓</div>
                    <div>
                      <h4>Teacher App</h4>
                      <p>Attendance, grading and communication.</p>
                    </div>
                  </Link>

                  <Link
                    href="/parent"
                    className={styles.appCard}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={styles.icon}>👨‍👩‍👧</div>
                    <div>
                      <h4>Parent App</h4>
                      <p>Fee tracking and real-time updates.</p>
                    </div>
                  </Link>

                  <Link
                    href="/student"
                    className={styles.appCard}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={styles.icon}>📖</div>
                    <div>
                      <h4>Student App</h4>
                      <p>Timetable, assignments and results.</p>
                    </div>
                  </Link>
                </div>
              </div>
            )}

            <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </Link>

            <Link
              href="/login"
              className={styles.mobileLoginBtn}
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
          </nav>
        )}

        {activeUser ? (
          <div className={styles.authDropdown}>
            <button
              className={styles.authToggle}
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Open account menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              {activeUser.profileImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeUser.profileImage}
                  alt=""
                  className={styles.userAvatarImage}
                />
              ) : (
                <span className={styles.userAvatar} aria-hidden="true">
                  {userInitial}
                </span>
              )}
            </button>
            <div
              className={`${styles.authMenu} ${menuOpen ? styles.open : ""}`}
              role="menu"
            >
              <Link
                href="/login/profile"
                className={styles.authMenuItem}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/login/change-password"
                className={styles.authMenuItem}
                onClick={() => setMenuOpen(false)}
              >
                Change Password
              </Link>
              <button
                type="button"
                className={styles.authMenuItem}
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <Link href="/login" className={styles.loginBtn}>
            Login
          </Link>
        )}
      </div>
    </header>
  );
}