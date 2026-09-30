"use client";

import { useState } from "react";
import {
  HiTrash,
  HiExclamationTriangle,
  HiExclamationCircle,
  HiArrowPath,
  HiDocumentText,
  HiClipboardDocumentList,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import { deleteExam } from "@/services/examService";
import styles from "./ExamDeleteModal.module.css";

export default function ExamDeleteModal({
  isOpen,
  onClose,
  exam,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!exam) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");

    try {
      await deleteExam(exam.id);
      onSuccess?.(`Exam "${exam.title}" deleted successfully.`);
      onClose();
    } catch (err) {
      setError(
        err.message || "Failed to delete exam. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const marksCount = Number(exam.marks_entered_count || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Examination Schedule"
      subtitle="Confirm permanent deletion of examination and grading data"
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
              <strong>&quot;{exam.title}&quot;</strong>? This examination cycle will be permanently removed.
            </p>
          </div>
        </div>

        {/* High-risk warning if marks are already recorded */}
        {marksCount > 0 && (
          <div className={styles.marksDangerAlert}>
            <HiClipboardDocumentList size={20} />
            <span>
              Warning: <strong>{marksCount} student scores</strong> are already recorded for this examination! Deleting this exam will remove all associated marks.
            </span>
          </div>
        )}

        {/* Exam Card Summary */}
        <div className={styles.card}>
          <div className={styles.avatar}>
            <HiDocumentText />
          </div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.title}>{exam.title}</span>
              <span
                className={`${styles.badge} ${
                  exam.is_published ? styles.badgePublished : styles.badgeDraft
                }`}
              >
                {exam.is_published ? "Published" : "Draft"}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span>{exam.grade_name || "All Grades"}</span>
              <span>•</span>
              <span>{exam.subject_name || "All Subjects"}</span>
              <span>•</span>
              <span>{exam.term_or_semester}</span>
              <span>•</span>
              <span>Max: {exam.max_marks || 100} pts</span>
              <span>•</span>
              <span>Weight: {exam.weight_percentage || 100}%</span>
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
