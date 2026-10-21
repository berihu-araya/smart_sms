"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  HiBars3,
  HiUser,
  HiLockClosed,
  HiCog6Tooth,
  HiArrowRightOnRectangle,
  HiGlobeAlt,
  HiCheck,
  HiAcademicCap,
  HiShieldCheck,
  HiChevronDown,
  HiCalendarDays,
  HiArchiveBox,
  HiSparkles,
  HiArrowPath,
} from "react-icons/hi2";
import { SUPPORTED_LANGUAGES, getTranslation } from "@/utils/translations";
import { getActiveAcademicYear, listAcademicYears } from "@/services/academicYearService";
import NotificationBell from "./NotificationBell";
import MessageBadge from "./MessageBadge";
import styles from "./DashboardHeader.module.css";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Sidebar toggle state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toggleHover, setToggleHover] = useState(false);

  // Active and selected academic year state
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);
  const [allAcademicYears, setAllAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [loadingYear, setLoadingYear] = useState(true);

  // Dropdown states
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Language state (en, am, ti)
  const [selectedLang, setSelectedLang] = useState("en");

  // Refs for click outside
  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);
  const yearMenuRef = useRef(null);

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

  // Fetch active and all academic years
  useEffect(() => {
    let isMounted = true;

    const fetchYears = async () => {
      try {
        const [activeYear, yearsRes] = await Promise.all([
          getActiveAcademicYear().catch(() => null),
          listAcademicYears({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        if (!isMounted) return;

        setActiveAcademicYear(activeYear);
        const list = Array.isArray(yearsRes) ? yearsRes : yearsRes?.items || [];
        setAllAcademicYears(list);

        // Retrieve stored selection or fallback to active year
        let initialSelected = activeYear;
        try {
          const savedStr = localStorage.getItem("smart_sms_selected_academic_year");
          if (savedStr) {
            const parsed = JSON.parse(savedStr);
            const found = list.find((y) => y.id === parsed.id);
            if (found) initialSelected = found;
          }
        } catch {
          // ignore
        }

        setSelectedAcademicYear(initialSelected);
      } catch (err) {
        console.error("Failed to load academic years:", err);
      } finally {
        if (isMounted) {
          setLoadingYear(false);
        }
      }
    };

    fetchYears();

    const handleYearChange = () => {
      fetchYears();
    };

    window.addEventListener("smart-sms-academic-year-change", handleYearChange);
    return () => {
      isMounted = false;
      window.removeEventListener("smart-sms-academic-year-change", handleYearChange);
    };
  }, []);

  const handleSelectYear = (year) => {
    setSelectedAcademicYear(year);
    setYearDropdownOpen(false);
    try {
      localStorage.setItem("smart_sms_selected_academic_year", JSON.stringify(year));
      window.dispatchEvent(new CustomEvent("smart-sms-selected-year-changed", { detail: year }));
    } catch {
      // ignore
    }
  };

  const handleResetToActiveYear = () => {
    if (activeAcademicYear) {
      handleSelectYear(activeAcademicYear);
    }
  };

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
      if (yearMenuRef.current && !yearMenuRef.current.contains(e.target)) {
        setYearDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setLangMenuOpen(false);
        setYearDropdownOpen(false);
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
  const userFirstName = user?.firstName || user?.first_name || (user?.name ? user.name.trim().split(" ")[0] : "");
  const userFullName = user
    ? user.name ||
    `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() ||
    user.email ||
    t("active_user", "User")
    : t("active_user", "User");

  const userEmail = user?.email || user?.username || "";
  const userRole = user?.role || user?.role_name || "User";
  const userInitial = (userFirstName ? userFirstName.charAt(0) : userFullName.charAt(0)).toUpperCase() || "U";
  const schoolName = user?.school_name || t("school_name", "YOYO ACADEMY");
  const isAdmin = ["admin", "school admin", "staff"].includes(userRole.toLowerCase());

  const getRoleIcon = (role = "") => {
    const r = (role || "").toLowerCase();
    if (r.includes("admin")) return <HiShieldCheck className={styles.roleMicroIcon} />;
    if (r.includes("teacher")) return <HiAcademicCap className={styles.roleMicroIcon} />;
    return <HiUser className={styles.roleMicroIcon} />;
  };

  const getRoleClass = (role = "") => {
    const r = (role || "").toLowerCase();
    if (r.includes("admin")) return styles.roleAdmin;
    if (r.includes("teacher")) return styles.roleTeacher;
    if (r.includes("student")) return styles.roleStudent;
    if (r.includes("parent")) return styles.roleParent;
    return styles.roleStaff;
  };

  const isSelectedActive = selectedAcademicYear
    ? Boolean(selectedAcademicYear.is_active || (activeAcademicYear && selectedAcademicYear.id === activeAcademicYear.id))
    : true;

  return (
    <>
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

          {/* Interactive Academic Year Context Switcher */}
          <div className={styles.yearDropdownContainer} ref={yearMenuRef}>
            <button
              type="button"
              className={`${styles.yearSwitcherBtn} ${!isSelectedActive ? styles.yearSwitcherArchive : ""}`}
              onClick={() => {
                setYearDropdownOpen((prev) => !prev);
                setUserMenuOpen(false);
                setLangMenuOpen(false);
              }}
              title="Switch Academic Session / Historical Archives"
              aria-expanded={yearDropdownOpen}
            >
              <span className={isSelectedActive ? styles.pulseDot : styles.archiveDot}></span>
              <div className={styles.yearBtnLabel}>
                <span className={styles.yearBtnTitle}>
                  {selectedAcademicYear?.name || activeAcademicYear?.name || "Session"}
                </span>
                <span className={`${styles.yearBtnBadge} ${isSelectedActive ? styles.badgeActive : styles.badgeArchive}`}>
                  {isSelectedActive ? "Active Session" : "Archived (Read-Only)"}
                </span>
              </div>
              <HiChevronDown className={`${styles.yearChevron} ${yearDropdownOpen ? styles.chevronRotated : ""}`} />
            </button>

            {/* Academic Year Popover */}
            {yearDropdownOpen && (
              <div className={styles.yearPopover}>
                <div className={styles.yearPopoverHeader}>
                  <div className={styles.yearPopoverIconWrap}>
                    <HiCalendarDays />
                  </div>
                  <div>
                    <h4 className={styles.yearPopoverTitle}>Academic Sessions & Archives</h4>
                    <p className={styles.yearPopoverSub}>Select a session to filter dashboard records</p>
                  </div>
                </div>

                <div className={styles.yearPopoverList}>
                  {allAcademicYears.map((ay) => {
                    const isCurrentActive = Boolean(ay.is_active || (activeAcademicYear && ay.id === activeAcademicYear.id));
                    const isSelected = selectedAcademicYear?.id === ay.id;

                    return (
                      <button
                        key={ay.id}
                        type="button"
                        className={`${styles.yearPopoverItem} ${isSelected ? styles.yearItemSelected : ""}`}
                        onClick={() => handleSelectYear(ay)}
                      >
                        <div className={styles.yearItemLeft}>
                          <div className={`${styles.yearItemIcon} ${isCurrentActive ? styles.iconActiveYear : styles.iconArchiveYear}`}>
                            {isCurrentActive ? <HiSparkles /> : <HiArchiveBox />}
                          </div>
                          <div className={styles.yearItemText}>
                            <div className={styles.yearItemNameRow}>
                              <span className={styles.yearItemName}>{ay.name}</span>
                              <span className={`${styles.yearItemTag} ${isCurrentActive ? styles.tagActive : styles.tagArchive}`}>
                                {isCurrentActive ? "Active Session" : "Archived"}
                              </span>
                            </div>
                            <div className={styles.yearItemDates}>
                              {ay.start_date && ay.end_date
                                ? `${new Date(ay.start_date).toLocaleDateString()} — ${new Date(ay.end_date).toLocaleDateString()}`
                                : "Standard Academic Cycle"}
                            </div>
                          </div>
                        </div>
                        {isSelected && <HiCheck className={styles.checkIcon} />}
                      </button>
                    );
                  })}
                </div>

                {(userRole?.toLowerCase().includes("admin") || userRole?.toLowerCase().includes("staff")) && (
                  <div className={styles.yearPopoverFooter}>
                    <Link
                      href="/dashboard/settings/academic-years/transition"
                      className={styles.transitionWizardLink}
                      onClick={() => setYearDropdownOpen(false)}
                    >
                      <HiArrowPath className={styles.wizardIcon} />
                      <span>Year-End Rollover & Transition Wizard</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT GROUP ================= */}
        <div className={styles.rightSection}>
        {/* Direct Messages Quick Access with Live Badge */}
        <MessageBadge />

        {/* Notification Bell Dropdown with Live Badge */}
        <NotificationBell />

        {/* Language Selection Dropdown (English, Amharic, Tigrinya) */}
        <div className={styles.dropdownContainer} ref={langMenuRef}>
          <button
            type="button"
            className={`${styles.langIconButton} ${langMenuOpen ? styles.langIconActive : ""}`}
            onClick={() => {
              setLangMenuOpen((prev) => !prev);
              setUserMenuOpen(false);
            }}
            aria-label="Select Language"
            aria-expanded={langMenuOpen}
            title={`Language: ${currentLangObj.name} (${currentLangObj.native})`}
          >
            <HiGlobeAlt className={styles.langGlobeIcon} />
            <span className={styles.langCodeBadge}>
              {currentLangObj.code.toUpperCase()}
            </span>
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
            className={`${styles.userAvatarButton} ${userMenuOpen ? styles.userAvatarActive : ""}`}
            onClick={() => {
              setUserMenuOpen((prev) => !prev);
              setLangMenuOpen(false);
            }}
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
            title={`Signed in as ${userFullName} (${userRole})`}
          >
            {user?.profileImage || user?.profile_image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.profileImage || user.profile_image}
                alt={userFullName}
                className={styles.avatarImg}
              />
            ) : (
              <span className={styles.avatarInitial}>{userInitial}</span>
            )}
            <span className={styles.onlineStatusRing} title="Active Session">
              <span className={styles.onlinePulseAnimation}></span>
              <span className={styles.onlineSolidDot}></span>
            </span>
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
                  <span className={styles.popoverOnlineBadge} title="Active Session">
                    <span className={styles.popoverOnlinePulse}></span>
                    <span className={styles.popoverOnlineDot}></span>
                  </span>
                </div>
                <div className={styles.popoverUserDetails}>
                  <h4 className={styles.popoverName}>{userFullName}</h4>
                  <p className={styles.popoverEmail}>{userEmail || t("signed_in", "Signed In")}</p>
                  <div className={styles.popoverBadges}>
                    <span className={`${styles.rolePill} ${getRoleClass(userRole)}`}>
                      {getRoleIcon(userRole)} {userRole}
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

    {/* Read-Only Archive Alert Banner */}
    {!isSelectedActive && selectedAcademicYear && (
      <div className={styles.archiveAlertBar}>
        <div className={styles.archiveAlertLeft}>
          <span className={styles.archiveAlertIcon}>⚠️</span>
          <span className={styles.archiveAlertText}>
            <strong>READ-ONLY ARCHIVE:</strong> You are browsing historical records for <strong>Academic Year {selectedAcademicYear.name}</strong>. Real-time marks entry and operational edits are restricted.
          </span>
        </div>
        <button
          type="button"
          className={styles.archiveAlertBtn}
          onClick={handleResetToActiveYear}
        >
          Return to Active Session ({activeAcademicYear?.name || "Current"})
        </button>
      </div>
    )}
  </>
  );
}
