"use client";

import {
  HiUser,
  HiEnvelope,
  HiPhone,
  HiShieldCheck,
  HiCalendar,
  HiKey,
  HiPencilSquare,
  HiFingerPrint,
} from "react-icons/hi2";
import { FaUserTie } from "react-icons/fa6";
import Modal from "@/components/common/Modal";
import styles from "./StaffViewModal.module.css";

export default function StaffViewModal({
  isOpen,
  onClose,
  staff,
  onEdit,
  onResetPassword,
  onToggleStatus,
}) {
  if (!staff) return null;

  const initials = `${(staff.first_name || "")[0] || ""}${(staff.last_name || "")[0] || ""}`.toUpperCase() || "S";
  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Staff Member";
  const isAdmin = (staff.role_name || "").toLowerCase().includes("admin");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Profile Overview"
      subtitle="View administrative and contact details"
      icon={FaUserTie}
      size="md"
    >
      <div className={styles.viewContainer}>
        {/* Profile Hero */}
        <div className={styles.profileHero}>
          <div className={styles.avatarLarge}>{initials}</div>
          <div className={styles.heroInfo}>
            <h3 className={styles.heroName}>{fullName}</h3>
            <div className={styles.badgesRow}>
              <span className={`${styles.roleBadge} ${isAdmin ? styles.roleBadgeAdmin : ""}`}>
                <HiShieldCheck size={15} />
                {staff.role_name || "Staff"}
              </span>
              <span
                className={
                  staff.status === "ACTIVE" ? styles.statusActive : styles.statusInactive
                }
              >
                <span
                  className={`${styles.statusDot} ${
                    staff.status === "ACTIVE" ? styles.statusDotActive : ""
                  }`}
                />
                {staff.status === "ACTIVE" ? "Active Account" : "Inactive Account"}
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className={styles.detailsGrid}>
          {/* Email */}
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <HiEnvelope />
            </div>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Official Email</span>
              <span className={styles.infoValue}>{staff.email || "—"}</span>
            </div>
          </div>

          {/* Phone */}
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <HiPhone />
            </div>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Phone Number</span>
              <span className={styles.infoValue}>{staff.phone || "Not provided"}</span>
            </div>
          </div>

          {/* Role */}
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <HiShieldCheck />
            </div>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>System Role</span>
              <span className={styles.infoValue}>{staff.role_name || "Staff"}</span>
            </div>
          </div>

          {/* Account ID / Identifier */}
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <HiFingerPrint />
            </div>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Account Reference ID</span>
              <span className={styles.infoValue} style={{ fontSize: "0.8rem", fontFamily: "monospace" }}>
                {staff.id?.substring(0, 13)}...
              </span>
            </div>
          </div>
        </div>

        {/* Footer Quick Actions */}
        <div className={styles.footerActions}>
          <div className={styles.leftButtons}>
            <button
              type="button"
              className={styles.btnAction}
              onClick={() => {
                onClose();
                onResetPassword?.(staff);
              }}
            >
              <HiKey size={16} />
              <span>Reset Password</span>
            </button>
            <button
              type="button"
              className={styles.btnAction}
              onClick={() => {
                onToggleStatus?.(staff);
              }}
            >
              <span>{staff.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
            </button>
          </div>

          <div className={styles.rightButtons}>
            <button
              type="button"
              className={`${styles.btnAction} ${styles.btnPrimaryAction}`}
              onClick={() => {
                onClose();
                onEdit?.(staff);
              }}
            >
              <HiPencilSquare size={16} />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
