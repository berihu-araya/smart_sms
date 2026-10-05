"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  HiBars3,
  HiXMark,
  HiChevronDown,
  HiAcademicCap,
  HiShieldCheck,
  HiUserGroup,
  HiChatBubbleBottomCenterText,
  HiSparkles,
  HiArrowRight,
} from "react-icons/hi2";
import styles from "./PublicHeader.module.css";

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

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
                priority
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
          <Link
            href="/"
            className={`${styles.navLink} ${isActive("/") ? styles.activeLink : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </Link>

          <Link
            href="/features"
            className={`${styles.navLink} ${isActive("/features") ? styles.activeLink : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Features & Modules
          </Link>

          <div className={styles.dropdown}>
            <button type="button" className={styles.dropbtn}>
              Solutions & Portals <HiChevronDown className={styles.chevronIcon} />
            </button>
            <div className={styles.dropdownContent}>
              <Link
                href="/login"
                className={styles.appCard}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className={`${styles.iconWrap} ${styles.adminIconBg}`}>
                  <HiShieldCheck />
                </div>
                <div>
                  <h4>Admin & Operations</h4>
                  <p>Admissions, SIS records, staff management, and system-wide audits.</p>
                </div>
              </Link>

              <Link
                href="/login"
                className={styles.appCard}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className={`${styles.iconWrap} ${styles.teacherIconBg}`}>
                  <HiAcademicCap />
                </div>
                <div>
                  <h4>Teacher Workspace</h4>
                  <p>Daily registers, marks & gradebook entries, timetable schedules.</p>
                </div>
              </Link>

              <Link
                href="/login"
                className={styles.appCard}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className={`${styles.iconWrap} ${styles.parentIconBg}`}>
                  <HiUserGroup />
                </div>
                <div>
                  <h4>Parent & Student Hub</h4>
                  <p>Fee statements, report cards, exam schedules, and attendance logs.</p>
                </div>
              </Link>

              <Link
                href="/features#sms"
                className={styles.appCard}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className={`${styles.iconWrap} ${styles.smsIconBg}`}>
                  <HiChatBubbleBottomCenterText />
                </div>
                <div>
                  <h4>Smart SMS Dispatch</h4>
                  <p>Automated multi-carrier SMS triggers for grades, fees & emergencies.</p>
                </div>
              </Link>
            </div>
          </div>

          <Link
            href="/about"
            className={`${styles.navLink} ${isActive("/about") ? styles.activeLink : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            About Us
          </Link>

          <Link
            href="/contact"
            className={`${styles.navLink} ${isActive("/contact") ? styles.activeLink : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact & Demo
          </Link>

          {/* Mobile Action Buttons */}
          <div className={styles.mobileActionGroup}>
            <Link
              href="/login"
              className={styles.mobileLoginBtn}
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In to Portal
            </Link>
            <Link
              href="/contact"
              className={styles.mobileDemoBtn}
              onClick={() => setMobileMenuOpen(false)}
            >
              Request Live Demo
            </Link>
          </div>
        </nav>

        {/* Right: Auth Action & Demo Button */}
        <div className={styles.rightGroup}>
          <Link href="/contact" className={styles.demoBtn}>
            <HiSparkles className={styles.demoIcon} />
            <span>Book Demo</span>
          </Link>

          <Link href="/login" className={styles.loginBtn}>
            <span>Sign In</span>
            <HiArrowRight className={styles.loginArrow} />
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

