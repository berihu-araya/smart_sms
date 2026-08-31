"use client";

import Modal from "./Modal";
import styles from "./ConfirmDialog.module.css";
import { HiExclamationTriangle } from "react-icons/hi2";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deactivation",
  itemName = "",
  itemType = "item",
  references = null,
  loading = false,
  confirmText = "Deactivate",
}) {
  const hasRefs = references && references.hasReferences;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`Review dependency impact for this ${itemType}`}
      icon={HiExclamationTriangle}
      maxWidth={520}
    >
      <div className={styles.container}>
        <p className={styles.message}>
          Are you sure you want to deactivate{" "}
          <span className={styles.highlight}>&ldquo;{itemName}&rdquo;</span>? This entity will be soft-deleted
          and hidden from active selectors.
        </p>

        {hasRefs && (
          <div className={styles.warningBox}>
            <div className={styles.warningHeader}>
              <HiExclamationTriangle size={18} />
              <span>Active Dependencies Detected ({references.totalReferences} records)</span>
            </div>
            <p className={styles.warningText}>
              This {itemType} is currently referenced across other active academic records:
            </p>
            <div className={styles.refBadgesList}>
              {references.sections > 0 && (
                <span className={styles.refBadge}>
                  <strong>{references.sections}</strong> Section(s)
                </span>
              )}
              {references.students > 0 && (
                <span className={styles.refBadge}>
                  <strong>{references.students}</strong> Student(s)
                </span>
              )}
              {references.gradeSubjects > 0 && (
                <span className={styles.refBadge}>
                  <strong>{references.gradeSubjects}</strong> Subject Mapping(s)
                </span>
              )}
              {references.teacherSubjects > 0 && (
                <span className={styles.refBadge}>
                  <strong>{references.teacherSubjects}</strong> Teacher Assignment(s)
                </span>
              )}
              {references.exams > 0 && (
                <span className={styles.refBadge}>
                  <strong>{references.exams}</strong> Exam(s)
                </span>
              )}
              {references.attendance > 0 && (
                <span className={styles.refBadge}>
                  <strong>{references.attendance}</strong> Attendance Record(s)
                </span>
              )}
              {references.marks > 0 && (
                <span className={styles.refBadge}>
                  <strong>{references.marks}</strong> Mark(s)
                </span>
              )}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnDanger}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span> Deactivating...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
