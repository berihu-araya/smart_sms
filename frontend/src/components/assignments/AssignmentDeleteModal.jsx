"use client";

import { useState } from "react";
import {
  HiTrash,
  HiExclamationTriangle,
  HiExclamationCircle,
  HiArrowPath,
  HiDocumentText,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import { deleteAssignment } from "@/services/assignmentService";
import styles from "./AssignmentDeleteModal.module.css";

export default function AssignmentDeleteModal({
  isOpen,
  onClose,
  assignment,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!assignment) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");

    try {
      await deleteAssignment(assignment.id);
      onSuccess?.(`Assignment "${assignment.title}" deleted successfully.`);
      onClose();
    } catch (err) {
      setError(
        err.message || "Failed to delete assignment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const dueDateFormatted = assignment.due_date
    ? new Date(assignment.due_date).toLocaleDateString()
    : "No deadline";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Assignment"
      subtitle="Confirm permanent deletion of assignment and student submissions"
      icon={HiTrash}
      size="sm"
    >
      <div className={styles.container}>
        {/* Warning Box */}
        <div className={styles.warningBox}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <div className={styles.warningContent}>
            <h4 className={styles.warningTitle}>Permanent Deletion</h4>
            <p className={styles.warningDesc}>
              Are you sure you want to delete{" "}
              <strong>&quot;{assignment.title}&quot;</strong>? This will permanently remove the assignment, all student submissions, and graded feedback.
            </p>
          </div>
        </div>

        {/* Assignment Card Summary */}
        <div className={styles.card}>
          <div className={styles.avatar}>
            <HiDocumentText />
          </div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.title}>{assignment.title}</span>
              <span
                className={`${styles.badge} ${
                  assignment.status === "PUBLISHED"
                    ? styles.badgePublished
                    : styles.badgeClosed
                }`}
              >
                {assignment.status || "PUBLISHED"}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span>{assignment.grade_name || "Grade"}</span>
              {assignment.section_name && (
                <>
                  <span>•</span>
                  <span>Section {assignment.section_name}</span>
                </>
              )}
              {assignment.subject_name && (
                <>
                  <span>•</span>
                  <span>{assignment.subject_name}</span>
                </>
              )}
              <span>•</span>
              <span>Due: {dueDateFormatted}</span>
              <span>•</span>
              <span>Max: {assignment.max_marks || 100} pts</span>
            </div>
          </div>
        </div>

        {/* API Error Alert */}
        {error && (
          <div className={styles.alertError}>
            <HiExclamationCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
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
              <span>Confirm Delete</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
