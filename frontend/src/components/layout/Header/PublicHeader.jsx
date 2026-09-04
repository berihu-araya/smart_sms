"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { HiBars3, HiXMark } from "react-icons/hi2";
import styles from "./PublicHeader.module.css";

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={styles.publicHeader}>
      <div className={styles.container}>
        {/* Left: School Logo & Brand */}
        <div className={styles.leftGroup}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoBadge}>
              <Image
                src="/school-logo-1.png"
                alt="School Logo"
                width={40}
                height={40}
                className={styles.logoImg}
              />
            </div>
            <div className={styles.logoText}>
              <span className={styles.schoolName}>YOYO ACADEMY</span>
              <span className={styles.schoolSub}>Smart SMS Platform</span>
            </div>
          </Link>
        </div>

        {/* Center: Public Navigation Links */}
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

          <div className={styles.dropdown}>
            <span className={styles.dropbtn}>Applications ▾</span>
            <div className={styles.dropdownContent}>
              <Link href="/login" className={styles.appCard} onClick={() => setMobileMenuOpen(false)}>
                <div className={styles.icon}>🖥️</div>
                <div>
                  <h4>Admin & Staff Portal</h4>
                  <p>Complete control center for school administration and operations.</p>
                </div>
              </Link>
              <Link href="/login" className={styles.appCard} onClick={() => setMobileMenuOpen(false)}>
                <div className={styles.icon}>🎓</div>
                <div>
                  <h4>Teacher Workspace</h4>
                  <p>Attendance tracking, marks entry, and timetable coverage.</p>
                </div>
              </Link>
              <Link href="/login" className={styles.appCard} onClick={() => setMobileMenuOpen(false)}>
                <div className={styles.icon}>👨‍👩‍👧</div>
                <div>
                  <h4>Parent & Student Hub</h4>
                  <p>Real-time fee tracking, academic progress, and report cards.</p>
                </div>
              </Link>
            </div>
          </div>

          <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
            Contact
          </Link>

          {/* Mobile Login */}
          <div className={styles.mobileActionGroup}>
            <Link href="/login" className={styles.mobileLoginBtn} onClick={() => setMobileMenuOpen(false)}>
              Sign In
            </Link>
          </div>
        </nav>

        {/* Right: Auth Action */}
        <div className={styles.rightGroup}>
          <Link href="/login" className={styles.loginBtn}>
            Sign In
          </Link>

          <button
            type="button"
            className={styles.mobileToggleBtn}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <HiXMark /> : <HiBars3 />}
          </button>
        </div>
      </div>
    </header>
  );
}
