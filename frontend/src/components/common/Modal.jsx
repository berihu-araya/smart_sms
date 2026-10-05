"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiXMark } from "react-icons/hi2";
import styles from "./Modal.module.css";

const SIZE_MAP = {
  sm: "480px",
  md: "620px",
  lg: "780px",
  xl: "940px",
  "2xl": "1100px",
  full: "95vw",
};

// Global active modals reference counter to prevent race conditions & permanently stuck overflow:hidden
let openModalsCount = 0;

function lockBodyScroll() {
  openModalsCount++;
  if (openModalsCount === 1) {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open-dimmed");
  }
}

function unlockBodyScroll() {
  openModalsCount = Math.max(0, openModalsCount - 1);
  if (openModalsCount === 0) {
    document.body.style.removeProperty("overflow");
    document.body.classList.remove("modal-open-dimmed");
  }
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  maxWidth,
  size = "md",
  className = "",
  preventBackdropClose = false,
}) {
  const modalRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      // Safety cleanup if unmounted while open
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, []);

  // Lock body scroll safely, listen for Escape key, and dim background
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const resolvedMaxWidth =
    maxWidth !== undefined
      ? typeof maxWidth === "number"
        ? `${maxWidth}px`
        : maxWidth
      : SIZE_MAP[size] || SIZE_MAP.md;

  const handleBackdropClick = (e) => {
    if (preventBackdropClose) return;
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${className}`}
        style={{ maxWidth: resolvedMaxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-dialog-title" : undefined}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {Icon && (
              <div className={styles.iconWrapper}>
                <Icon />
              </div>
            )}
            <div className={styles.titleArea}>
              {title && <h2 id="modal-dialog-title">{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            <HiXMark size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
