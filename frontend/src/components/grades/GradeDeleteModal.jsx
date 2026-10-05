"use client";

import { useEffect, useState } from "react";
import {
  HiTrash,
  HiExclamationTriangle,
  HiExclamationCircle,
  HiArrowPath,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import { deleteGrade, checkGradeReferences } from "@/services/gradeService";
import styles from "./GradeDeleteModal.module.css";

export default function GradeDeleteModal({
  isOpen,
  onClose,
  grade,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [references, setReferences] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !grade?.id) return;

    let isMounted = true;
    async function loadRefs() {
      try {
        setLoadingRefs(true);
        setError("");
        const refData = await checkGradeReferences(grade.id);
        if (isMounted) setReferences(refData);
      } catch (err) {
        console.error("Failed to check references:", err);
        if (isMounted) setReferences(null);
      } finally {
        if (isMounted) setLoadingRefs(false);
      }
    }

    loadRefs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, grade?.id]);

  if (!grade) return null;

  const badgeInitials = grade.name ? grade.name.substring(0, 3).toUpperCase() : "G";

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");

    try {
      await deleteGrade(grade.id);
      onSuccess?.(`Grade "${grade.name}" deactivated successfully.`);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to deactivate grade level.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deactivate Grade Level"
      subtitle="Review dependency impact before deactivating"
      icon={HiTrash}
      size="sm"
    >
      <div className={styles.container}>
        <div className={styles.warningBox}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <div className={styles.warningContent}>
            <h4 className={styles.warningTitle}>Deactivation Confirmation</h4>
            <p className={styles.warningDesc}>
              This will soft-delete the grade level and hide it from active curriculum and class selectors.
            </p>
          </div>
        </div>

        <div className={styles.gradeCard}>
          <div className={styles.gradeAvatar}>{badgeInitials}</div>
          <div>
            <div className={styles.gradeName}>{grade.name}</div>
            <div className={styles.gradeMeta}>
              {grade.description || "No curriculum description"}
            </div>
          </div>
        </div>

        {loadingRefs ? (
          <div style={{ padding: "0.5rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
            <HiArrowPath className={styles.spinner} style={{ verticalAlign: "middle", marginRight: "6px" }} />
            Checking linked student and class dependencies...
          </div>
        ) : references && references.hasReferences ? (
          <div className={styles.warningCallout}>
            <div className={styles.warningCalloutTitle}>
              <HiExclamationTriangle size={17} />
              <span>Active Dependencies ({references.totalReferences} records)</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#78350f" }}>
              This grade is currently referenced by other active academic modules:
            </p>
            <div className={styles.refBadgeList}>
              {references.sections > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.sections}</strong> Section(s)
                </span>
              )}
              {references.students > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.students}</strong> Student(s)
                </span>
              )}
              {references.gradeSubjects > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.gradeSubjects}</strong> Subject Mapping(s)
                </span>
              )}
              {references.exams > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.exams}</strong> Exam(s)
                </span>
              )}
            </div>
          </div>
        ) : null}

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
                <span>Deactivating...</span>
              </>
            ) : (
              <span>Confirm Deactivation</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
