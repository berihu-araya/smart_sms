"use client";

import { useState } from "react";
import {
  HiTrash,
  HiExclamationTriangle,
  HiExclamationCircle,
  HiArrowPath,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import gradeSubjectService from "@/services/gradeSubjectService";
import styles from "./GradeSubjectDeleteModal.module.css";

export default function GradeSubjectDeleteModal({
  isOpen,
  onClose,
  assignment,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!assignment) return null;

  const badgeInitials = (assignment.subject_code || assignment.subject_name || "SUB")
    .substring(0, 4)
    .toUpperCase();

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");

    try {
      await gradeSubjectService.deleteGradeSubject(assignment.id);
      onSuccess?.(
        `Subject "${assignment.subject_name}" removed from ${
          assignment.grade_name || "grade"
        } curriculum successfully.`
      );
      onClose();
    } catch (err) {
      setError(
        err.message || "Failed to remove subject from grade curriculum."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Remove Subject Mapping"
      subtitle="Confirm removing this subject from the grade curriculum"
      icon={HiTrash}
      size="sm"
    >
      <div className={styles.container}>
        <div className={styles.warningBox}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <div className={styles.warningContent}>
            <h4 className={styles.warningTitle}>Curriculum Removal</h4>
            <p className={styles.warningDesc}>
              This will unassign <strong>{assignment.subject_name}</strong> from{" "}
              <strong>{assignment.grade_name}</strong> for the{" "}
              {assignment.academic_year_name || "active academic session"}.
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.avatar}>{badgeInitials}</div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.subjectTitle}>
                {assignment.subject_name} ({assignment.subject_code})
              </span>
              <span className={styles.gradeTag}>{assignment.grade_name}</span>
            </div>
            <div className={styles.metaRow}>
              <span>⏱ {assignment.weekly_periods ?? "4"} periods/wk</span>
              <span>•</span>
              <span>
                🎯 Pass: {assignment.pass_marks ?? "40"} /{" "}
                {assignment.total_marks ?? "100"} pts
              </span>
              <span>•</span>
              <span>{assignment.is_compulsory ? "Compulsory" : "Elective"}</span>
              {assignment.teacher_name && (
                <>
                  <span>•</span>
                  <span>👨‍🏫 {assignment.teacher_name}</span>
                </>
              )}
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
                <span>Removing...</span>
              </>
            ) : (
              <span>Confirm Removal</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
