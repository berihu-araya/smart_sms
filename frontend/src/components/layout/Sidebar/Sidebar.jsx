"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

import { useAuth } from "@/hooks/useAuth";
import { getTranslation } from "@/utils/translations";
import styles from "./Sidebar.module.css";
import menuData from "./menuData";

/* -------------------------------------------------
   Role filter helper
--------------------------------------------------*/
function filterMenuByRole(items, role) {
  const currentRole = (role || "School Admin").trim();

  return items
    .map((item) => {
      const itemRoles = item.roles || [];
      const hasRolePermission =
        itemRoles.length === 0 ||
        itemRoles.some(
          (r) =>
            r.toLowerCase() === currentRole.toLowerCase() ||
            (r.toLowerCase() === "admin" && currentRole.toLowerCase() === "school admin") ||
            (r.toLowerCase() === "school admin" && currentRole.toLowerCase() === "admin")
        );

      if (item.children?.length) {
        const filteredChildren = filterMenuByRole(item.children, currentRole);
        if (filteredChildren.length > 0 && hasRolePermission) {
          return {
            ...item,
            children: filteredChildren,
          };
        }
        return null;
      }

      return hasRolePermission ? item : null;
    })
    .filter(Boolean);
}

/* -------------------------------------------------
   Check if item or any descendant is active
--------------------------------------------------*/
function hasActiveChild(item, pathname) {
  if (item.link === pathname) return true;

  if (!item.children) return false;

  return item.children.some((child) =>
    hasActiveChild(child, pathname)
  );
}

/* -------------------------------------------------
   Find active path and open all parents
--------------------------------------------------*/
function findActivePath(items, pathname, level = 0, result = {}) {
  for (const item of items) {
    if (item.link === pathname) {
      return result;
    }

    if (item.children?.length) {
      result[level] = item.title;

      const found = findActivePath(
        item.children,
        pathname,
        level + 1,
        result
      );

      if (found) return found;

      delete result[level];
    }
  }

  return null;
}

/* -------------------------------------------------
   Recursive Menu Item
--------------------------------------------------*/
function MenuItem({
  item,
  pathname,
  level = 0,
  openMenus,
  toggleMenu,
  isMini = false,
  lang = "en",
}) {
  const hasChildren = item.children?.length > 0;
  const Icon = item.icon;
  const isOpen = openMenus[level] === item.title;
  const isActive = pathname === item.link || hasActiveChild(item, pathname);
  const displayTitle = getTranslation(lang, item.title, item.title);

  /* --------------------------
     Normal Link
  ---------------------------*/
  if (!hasChildren) {
    return (
      <Link
        href={item.link}
        title={displayTitle}
        className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
        style={!isMini ? { paddingLeft: `${18 + level * 16}px` } : undefined}
      >
        <Icon className={styles.icon} />
        {!isMini && <span className={styles.menuLabel}>{displayTitle}</span>}
      </Link>
    );
  }

  /* --------------------------
     Expandable Menu in Mini Mode (links to first child or acts as button)
  ---------------------------*/
  if (isMini) {
    const targetLink = item.children?.[0]?.link || "#";
    return (
      <Link
        href={targetLink}
        title={displayTitle}
        className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
      >
        <Icon className={styles.icon} />
      </Link>
    );
  }

  /* --------------------------
     Expandable Menu in Full Mode
  ---------------------------*/
  return (
    <div className={styles.menuGroup}>
      <button
        type="button"
        aria-expanded={isOpen}
        title={displayTitle}
        onClick={() => toggleMenu(level, item.title)}
        className={`${styles.menuButton} ${isActive ? styles.menuButtonActive : ""}`}
        style={{
          paddingLeft: `${18 + level * 16}px`,
        }}
      >
        <div className={styles.menuLeft}>
          <Icon className={styles.icon} />
          <span className={styles.menuLabel}>{displayTitle}</span>
        </div>

        <span className={styles.chevronIcon}>
          {isOpen ? <FaChevronDown /> : <FaChevronRight />}
        </span>
      </button>

      <div className={`${styles.subMenu} ${isOpen ? styles.show : ""}`}>
        {item.children.map((child) => (
          <MenuItem
            key={child.title}
            item={child}
            pathname={pathname}
            level={level + 1}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
            isMini={isMini}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------
   Sidebar Component
--------------------------------------------------*/
export default function Sidebar({
  isVisible = true,
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const filteredMenuData = filterMenuByRole(menuData, user?.role);
  const isMini = !isVisible;

  const [lang, setLang] = useState("en");

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("smart_sms_lang") || "en";
      setLang(savedLang);
    } catch {
      // ignore
    }

    const handleLangChange = (event) => {
      if (event.detail) {
        setLang(event.detail);
      }
    };

    window.addEventListener("smart-sms-lang-change", handleLangChange);
    return () => {
      window.removeEventListener("smart-sms-lang-change", handleLangChange);
    };
  }, []);

  const [openMenus, setOpenMenus] = useState(() => {
    return findActivePath(filteredMenuData, pathname) || {};
  });

  // Track path change to automatically expand active menu
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    const activeMenus = findActivePath(filteredMenuData, pathname);
    if (activeMenus) {
      setOpenMenus(activeMenus);
    }
  }

  /* ----------------------------------------
     Accordion Toggle
  -----------------------------------------*/
  const toggleMenu = (level, title) => {
    setOpenMenus((prev) => {
      const next = { ...prev };

      if (next[level] === title) {
        Object.keys(next).forEach((key) => {
          if (Number(key) >= level) {
            delete next[key];
          }
        });
        return next;
      }

      Object.keys(next).forEach((key) => {
        if (Number(key) >= level) {
          delete next[key];
        }
      });

      next[level] = title;
      return next;
    });
  };

  return (
    <aside
      className={`${styles.sidebar} ${
        isVisible ? styles.sidebarVisible : styles.sidebarMini
      }`}
    >
      {/* Sidebar Header / Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>🎓</div>
        {!isMini && (
          <div className={styles.logoTextWrap}>
            <h2>{getTranslation(lang, "platform_name", "Smart SMS")}</h2>
            <span>{getTranslation(lang, "school_sub", "School System")}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.navMenu}>
        {filteredMenuData.map((menu) => (
          <MenuItem
            key={menu.title}
            item={menu}
            pathname={pathname}
            level={0}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
            isMini={isMini}
            lang={lang}
          />
        ))}
      </nav>
    </aside>
  );
}