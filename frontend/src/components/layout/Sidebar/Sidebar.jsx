"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

import styles from "./Sidebar.module.css";
import menuData from "./menuData";

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
}) {
  const hasChildren = item.children?.length > 0;

  const Icon = item.icon;

  const isOpen = openMenus[level] === item.title;

  const isActive =
    pathname === item.link || hasActiveChild(item, pathname);

  /* --------------------------
     Normal Link
  ---------------------------*/

  if (!hasChildren) {
    return (
      <Link
        href={item.link}
        className={`${styles.menuItem} ${
          pathname === item.link ? styles.active : ""
        }`}
        style={{
          paddingLeft: `${18 + level * 20}px`,
        }}
      >
        <Icon className={styles.icon} />

        <span>{item.title}</span>
      </Link>
    );
  }

  /* --------------------------
     Expandable Menu
  ---------------------------*/

  return (
    <div className={styles.menuGroup}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() =>
          toggleMenu(level, item.title)
        }
        className={`${styles.menuButton} ${
          isActive ? styles.menuButtonActive : ""
        }`}
        style={{
          paddingLeft: `${18 + level * 20}px`,
        }}
      >
        <div className={styles.menuLeft}>
          <Icon className={styles.icon} />

          <span>{item.title}</span>
        </div>

        <span className={styles.chevronIcon}>
          {isOpen ? (
            <FaChevronDown />
          ) : (
            <FaChevronRight />
          )}
        </span>
      </button>

      <div
        className={`${styles.subMenu} ${
          isOpen ? styles.show : ""
        }`}
      >
        {item.children.map((child) => (
          <MenuItem
            key={child.title}
            item={child}
            pathname={pathname}
            level={level + 1}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
          />
        ))}
      </div>
    </div>
  );
}


/* -------------------------------------------------
   Sidebar
--------------------------------------------------*/

export default function Sidebar({
  isVisible = true,
}) {
  const pathname = usePathname();

  const [openMenus, setOpenMenus] = useState(() => {
    return findActivePath(menuData, pathname) || {};
  });

  // Track path change to automatically expand active menu
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    const activeMenus = findActivePath(menuData, pathname);
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
        isVisible
          ? styles.sidebarVisible
          : styles.sidebarCollapsed
      }`}
    >
      {/* Logo */}

      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          🎓
        </div>

        <div>
          <h2>Smart SMS</h2>
          <span>School System</span>
        </div>
      </div>

      {/* Navigation */}

      <nav className={styles.navMenu}>
        {menuData.map((menu) => (
          <MenuItem
            key={menu.title}
            item={menu}
            pathname={pathname}
            level={0}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
          />
        ))}
      </nav>
    </aside>
  );
}