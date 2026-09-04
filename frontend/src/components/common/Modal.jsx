"use client";

import { useEffect, useRef } from "react";
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

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  return (
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
    </div>
  );
}

