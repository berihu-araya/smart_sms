"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

import styles from "./Sidebar.module.css";
import menuData from "./menuData";

/* ---------------------------------------------
   Check whether this item or any child is active
----------------------------------------------*/
function hasActiveChild(item, pathname) {
  if (item.link === pathname) return true;

  if (!item.children) return false;

  return item.children.some((child) => hasActiveChild(child, pathname));
}

/* ---------------------------------------------
   Recursive Menu Item
----------------------------------------------*/
function MenuItem({ item, pathname, level = 0, openMenu, setOpenMenu, }) {
  const hasChildren = item.children?.length > 0;

  const [localOpen, setLocalOpen] = useState(false);

const open =
  level === 0
    ? openMenu === item.title
    : localOpen;

useEffect(() => {
  if (level > 0 && hasActiveChild(item, pathname)) {
    setLocalOpen(true);
  }
}, [pathname, item, level]);

  const Icon = item.icon;

  // ------------------------
  // Normal Link
  // ------------------------
  if (!hasChildren) {
    return (
      <Link
        href={item.link}
        className={`${styles.menuItem} ${
          pathname === item.link ? styles.active : ""
        }`}
        style={{
          paddingLeft: `${18 + level * 18}px`,
        }}
      >
        <Icon className={styles.icon} />
        <span>{item.title}</span>
      </Link>
    );
  }

  // ------------------------
  // Expandable Menu
  // ------------------------
  return (
    <div className={styles.menuGroup}>
      <button
        type="button"
        onClick={() => {  if (level === 0) {
          setOpenMenu(      openMenu === item.title ? null: item.title);
          } else {
            setLocalOpen(!localOpen);
          }
        }}
        aria-expanded={open}
        className={`${styles.menuButton} ${
          hasActiveChild(item, pathname)
            ? styles.menuButtonActive
            : ""
        }`}
        style={{
          paddingLeft: `${18 + level * 18}px`,
        }}
      >
        <div className={styles.menuLeft}>
          <Icon className={styles.icon} />
          <span>{item.title}</span>
        </div>

        <span className={styles.chevronIcon}>
          {open ? <FaChevronDown /> : <FaChevronRight />}
        </span>
      </button>

      <div
        className={`${styles.subMenu} ${
          open ? styles.show : ""
        }`}
      >
        {item.children.map((child) => (
          <MenuItem
          key={child.title}
          item={child}
          pathname={pathname}
          level={level + 1}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
/>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------
   Sidebar
----------------------------------------------*/

export default function Sidebar({
  isVisible = true,
}) {
  const pathname = usePathname();

  // Only one top-level menu can be open
  const [openMenu, setOpenMenu] = useState(null);

  // Automatically open the parent menu of the active page
  useEffect(() => {
    const activeMenu = menuData.find((menu) =>
      hasActiveChild(menu, pathname)
    );

    setOpenMenu(activeMenu?.title ?? null);
  }, [pathname]);

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
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
          />
        ))}
      </nav>
    </aside>
  );
}