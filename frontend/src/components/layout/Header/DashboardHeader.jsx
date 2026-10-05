"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  HiBars3,
  HiChevronDown,
  HiUser,
  HiLockClosed,
  HiCog6Tooth,
  HiArrowRightOnRectangle,
  HiGlobeAlt,
  HiCheck,
  HiAcademicCap,
  HiShieldCheck,
} from "react-icons/hi2";
import { SUPPORTED_LANGUAGES, getTranslation } from "@/utils/translations";
import { getActiveAcademicYear } from "@/services/academicYearService";
import styles from "./DashboardHeader.module.css";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Sidebar toggle state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toggleHover, setToggleHover] = useState(false);

  // Active academic year state
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);
  const [loadingYear, setLoadingYear] = useState(true);

  // Dropdown states
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Language state (en, am, ti)
  const [selectedLang, setSelectedLang] = useState("en");

  // Refs for click outside
  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);

  // Initialize language from localStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("smart_sms_lang") || "en";
      const valid = SUPPORTED_LANGUAGES.some((l) => l.code === savedLang);
      const initialLang = valid ? savedLang : "en";
      setSelectedLang(initialLang);
      document.documentElement.lang = initialLang;
    } catch {
      // ignore
    }
  }, []);

  // Fetch active academic year
  useEffect(() => {
    let isMounted = true;

    const fetchActiveYear = async () => {
      try {
        const year = await getActiveAcademicYear();
        if (isMounted) {
          setActiveAcademicYear(year);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) {
          setLoadingYear(false);
        }
      }
    };

    fetchActiveYear();

    const handleYearChange = () => {
      fetchActiveYear();
    };

    window.addEventListener("smart-sms-academic-year-change", handleYearChange);
    return () => {
      isMounted = false;
      window.removeEventListener("smart-sms-academic-year-change", handleYearChange);
    };
  }, []);

  // Listen to sidebar state
  useEffect(() => {
    const handleSidebarState = (event) => {
      setSidebarOpen(Boolean(event.detail));
    };

    window.addEventListener("smart-sms-sidebar-state", handleSidebarState);
    return () => {
      window.removeEventListener("smart-sms-sidebar-state", handleSidebarState);
    };
  }, []);

  // Close menus on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setLangMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setLangMenuOpen(false);
  }, [pathname]);

  const handleSidebarToggle = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("smart-sms-sidebar-toggle"));
    }
  };

  const handleLanguageChange = (langCode) => {
    setSelectedLang(langCode);
    setLangMenuOpen(false);
    try {
      localStorage.setItem("smart_sms_lang", langCode);
      document.documentElement.lang = langCode;
      window.dispatchEvent(
        new CustomEvent("smart-sms-lang-change", { detail: langCode })
      );
    } catch {
      // ignore
    }
  };

  const t = (key, fallback) => getTranslation(selectedLang, key, fallback);

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  const renderToggleIcon = () => {
    if (toggleHover) {
      return (
        <span className={styles.chevronToggleIcon}>
          {sidebarOpen ? "❮" : "❯"}
        </span>
      );
    }
    return <HiBars3 className={styles.toggleIcon} />;
  };

  // User display names & initials
  const userFullName = user
    ? user.name ||
    `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() ||
    user.email ||
    t("active_user", "User")
    : t("active_user", "User");

  const userEmail = user?.email || user?.username || "";
  const userRole = user?.role || user?.role_name || "User";
  const userInitial = userFullName.charAt(0).toUpperCase() || "U";
  const schoolName = user?.school_name || t("school_name", "YOYO ACADEMY");
  const isAdmin = ["admin", "school admin", "staff"].includes(userRole.toLowerCase());

  return (
    <header className={styles.dashboardHeader}>
      {/* ================= LEFT GROUP ================= */}
      <div className={styles.leftSection}>
        {/* Toggle Sidebar Button */}
        <button
          type="button"
          className={`${styles.sidebarToggleBtn} ${sidebarOpen ? styles.toggleOpen : styles.toggleCollapsed}`}
          onClick={handleSidebarToggle}
          onMouseEnter={() => setToggleHover(true)}
          onMouseLeave={() => setToggleHover(false)}
          title={sidebarOpen ? t("collapse_menu", "Hide menu (<)") : t("expand_menu", "Display all menus (>)")}
          aria-label="Toggle navigation sidebar"
        >
          {renderToggleIcon()}
        </button>

        {/* School Logo & Brand */}
        <Link href="/dashboard" className={styles.brandLink}>
          <div className={styles.logoBadge}>
            <Image
              src="/school-logo-1.png"
              alt="School Logo"
              width={30}
              height={30}
              className={styles.logoImage}
            />
          </div>
          <div className={styles.brandText}>
            <div className={styles.schoolNameRow}>
              <span className={styles.schoolName}>{t("school_name", "YOYO ACADEMY")}</span>
              <span className={styles.appPill}>{t("platform_name", "Smart SMS")}</span>
            </div>
            <span className={styles.schoolSub}>{t("school_sub", "School Management Platform")}</span>
          </div>
        </Link>

        {/* Live Active Academic Session Indicator */}
        {activeAcademicYear ? (
          <div className={styles.sessionPill} title={t("active_academic_year", "Active Academic Year")}>
            <span className={styles.pulseDot}></span>
            <span className={styles.sessionText}>
              {activeAcademicYear.name || activeAcademicYear.year_name}{" "}
              {t("academic_year", "Academic Year")}
            </span>
          </div>
        ) : (
          !loadingYear && (
            <div className={styles.sessionPillMuted} title={t("no_active_year", "No Active Academic Year")}>
              <span className={styles.mutedDot}></span>
              <span className={styles.mutedSessionText}>
                {t("no_active_year", "No Active Academic Year")}
              </span>
            </div>
          )
        )}
      </div>

      {/* ================= RIGHT GROUP ================= */}
      <div className={styles.rightSection}>
        {/* Language Selection Dropdown (English, Amharic, Tigrinya) */}
        <div className={styles.dropdownContainer} ref={langMenuRef}>
          <button
            type="button"
            className={`${styles.iconButton} ${langMenuOpen ? styles.btnActive : ""}`}
            onClick={() => {
              setLangMenuOpen((prev) => !prev);
              setUserMenuOpen(false);
            }}
            aria-label="Select Language"
            aria-expanded={langMenuOpen}
          >
            <span className={styles.flagEmoji}>{currentLangObj.flag}</span>
            <span className={styles.langName}>{currentLangObj.native}</span>
            <HiChevronDown
              className={`${styles.chevron} ${langMenuOpen ? styles.chevronRotated : ""}`}
            />
          </button>

          {langMenuOpen && (
            <div className={styles.langMenu}>
              <div className={styles.menuHeader}>
                <HiGlobeAlt className={styles.menuHeaderIcon} />
                <span>{t("select_language", "Select Language")}</span>
              </div>
              <div className={styles.menuList}>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === selectedLang;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      className={`${styles.langMenuItem} ${isSelected ? styles.langItemSelected : ""}`}
                      onClick={() => handleLanguageChange(lang.code)}
                    >
                      <div className={styles.langItemLeft}>
                        <span className={styles.flagEmojiLarge}>{lang.flag}</span>
                        <div>
                          <div className={styles.langItemTitle}>{lang.native}</div>
                          <div className={styles.langItemSub}>{lang.name}</div>
                        </div>
                      </div>
                      {isSelected && <HiCheck className={styles.checkIcon} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Active User Menu */}
        <div className={styles.dropdownContainer} ref={userMenuRef}>
          <button
            type="button"
            className={`${styles.userProfileTrigger} ${userMenuOpen ? styles.userTriggerActive : ""}`}
            onClick={() => {
              setUserMenuOpen((prev) => !prev);
              setLangMenuOpen(false);
            }}
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
          >
            <div className={styles.avatarWrapper}>
              {user?.profileImage || user?.profile_image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.profileImage || user.profile_image}
                  alt={userFullName}
                  className={styles.avatarImg}
                />
              ) : (
                <div className={styles.avatarInitial}>{userInitial}</div>
              )}
              <span className={styles.onlineBadge}></span>
            </div>

            <div className={styles.userInfoText}>
              <span className={styles.userName}>{userFullName}</span>
              <span className={styles.roleTag}>{userRole}</span>
            </div>

            <HiChevronDown
              className={`${styles.chevron} ${userMenuOpen ? styles.chevronRotated : ""}`}
            />
          </button>

          {/* Popover User Menu */}
          {userMenuOpen && (
            <div className={styles.userPopover}>
              {/* User Card Header */}
              <div className={styles.popoverHeader}>
                <div className={styles.popoverAvatarWrapper}>
                  {user?.profileImage || user?.profile_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={user.profileImage || user.profile_image}
                      alt={userFullName}
                      className={styles.popoverAvatarImg}
                    />
                  ) : (
                    <div className={styles.popoverAvatarInitial}>{userInitial}</div>
                  )}
                </div>
                <div className={styles.popoverUserDetails}>
                  <h4 className={styles.popoverName}>{userFullName}</h4>
                  <p className={styles.popoverEmail}>{userEmail || t("signed_in", "Signed In")}</p>
                  <div className={styles.popoverBadges}>
                    <span className={styles.rolePill}>
                      <HiShieldCheck /> {userRole}
                    </span>
                    <span className={styles.schoolPill}>
                      <HiAcademicCap /> {schoolName}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.popoverDivider}></div>

              {/* Menu Links */}
              <div className={styles.popoverMenu}>
                <Link
                  href="/login/profile"
                  className={styles.popoverMenuItem}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className={styles.menuItemIconWrap}>
                    <HiUser />
                  </div>
                  <div className={styles.menuItemContent}>
                    <span className={styles.menuItemTitle}>{t("my_profile", "My Profile")}</span>
                    <span className={styles.menuItemDesc}>
                      {t("profile_desc", "View and update your personal information")}
                    </span>
                  </div>
                </Link>

                <Link
                  href="/login/change-password"
                  className={styles.popoverMenuItem}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className={styles.menuItemIconWrap}>
                    <HiLockClosed />
                  </div>
                  <div className={styles.menuItemContent}>
                    <span className={styles.menuItemTitle}>{t("security_password", "Security & Password")}</span>
                    <span className={styles.menuItemDesc}>
                      {t("security_desc", "Manage your credentials and security")}
                    </span>
                  </div>
                </Link>

                {isAdmin && (
                  <Link
                    href="/dashboard/settings"
                    className={styles.popoverMenuItem}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className={styles.menuItemIconWrap}>
                      <HiCog6Tooth />
                    </div>
                    <div className={styles.menuItemContent}>
                      <span className={styles.menuItemTitle}>{t("school_settings", "School Settings")}</span>
                      <span className={styles.menuItemDesc}>
                        {t("settings_desc", "Configure academic years and system preferences")}
                      </span>
                    </div>
                  </Link>
                )}
              </div>

              <div className={styles.popoverDivider}></div>

              {/* Logout Button */}
              <div className={styles.popoverFooter}>
                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                >
                  <HiArrowRightOnRectangle className={styles.logoutIcon} />
                  <span>{t("sign_out", "Sign Out")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
