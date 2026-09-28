"use client";

import { useState } from "react";
import {
  HiTrash,
  HiExclamationTriangle,
  HiExclamationCircle,
  HiArrowPath,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import { deleteUser } from "@/services/userService";
import styles from "./StaffDeleteModal.module.css";

export default function StaffDeleteModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!staff) return null;

  const initials = `${(staff.first_name || "")[0] || ""}${(staff.last_name || "")[0] || ""}`.toUpperCase() || "S";
  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Staff Member";

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");

    try {
      await deleteUser(staff.id);
      onSuccess?.(`Staff member ${fullName} has been deleted.`);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to delete staff account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Staff Account"
      subtitle="Confirm staff member removal"
      icon={HiTrash}
      size="sm"
    >
      <div className={styles.container}>
        <div className={styles.warningBox}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <div className={styles.warningContent}>
            <h4 className={styles.warningTitle}>Are you sure?</h4>
            <p className={styles.warningDesc}>
              This will permanently delete or deactivate the staff member&apos;s account. This action cannot be easily undone.
            </p>
          </div>
        </div>

        <div className={styles.userCard}>
          <div className={styles.userAvatar}>{initials}</div>
          <div>
            <div className={styles.userName}>{fullName}</div>
            <div className={styles.userMeta}>
              {staff.email} • {staff.role_name || "Staff"}
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.alertError}>
            <HiExclamationCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnDelete}
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <HiArrowPath className={styles.spinner} size={16} />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Staff Member</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
