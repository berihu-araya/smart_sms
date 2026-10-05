"use client";

import { useEffect, useState } from "react";
import {
  HiTrash,
  HiExclamationTriangle,
  HiExclamationCircle,
  HiArrowPath,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import subjectService from "@/services/subjectService";
import styles from "./SubjectDeleteModal.module.css";

export default function SubjectDeleteModal({
  isOpen,
  onClose,
  subject,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [references, setReferences] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !subject?.id) return;

    let isMounted = true;
    async function loadRefs() {
      try {
        setLoadingRefs(true);
        setError("");
        const refData = await subjectService.checkSubjectReferences(subject.id);
        if (isMounted) setReferences(refData);
      } catch (err) {
        console.error("Failed to check subject references:", err);
        if (isMounted) setReferences(null);
      } finally {
        if (isMounted) setLoadingRefs(false);
      }
    }

    loadRefs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, subject?.id]);

  if (!subject) return null;

  const badgeInitials = (subject.subject_code || subject.subject_name || "SUB")
    .substring(0, 4)
    .toUpperCase();

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");

    try {
      await subjectService.deleteSubject(subject.id);
      onSuccess?.(`Subject "${subject.subject_name}" deactivated successfully.`);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to deactivate academic subject.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deactivate Subject"
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
              Are you sure you want to deactivate this subject? This will soft-delete the subject and hide it from active curriculum and timetable selectors.
            </p>
          </div>
        </div>

        <div className={styles.subjectCard}>
          <div className={styles.subjectAvatar}>{badgeInitials}</div>
          <div className={styles.subjectInfo}>
            <div className={styles.subjectName}>{subject.subject_name}</div>
            <div className={styles.subjectMeta}>
              <span>Code: {subject.subject_code}</span>
              <span>•</span>
              <span>Credits: {subject.credit_hours ? `${subject.credit_hours} hrs` : "—"}</span>
              <span>•</span>
              <span>{subject.is_elective ? "Elective" : "Core"}</span>
            </div>
          </div>
        </div>

        {loadingRefs ? (
          <div
            style={{
              padding: "0.5rem",
              textAlign: "center",
              color: "#64748b",
              fontSize: "0.85rem",
            }}
          >
            <HiArrowPath
              className={styles.spinner}
              style={{ verticalAlign: "middle", marginRight: "6px" }}
            />
            Checking linked curriculum and teacher dependencies...
          </div>
        ) : references && references.hasReferences ? (
          <div className={styles.warningCallout}>
            <div className={styles.warningCalloutTitle}>
              <HiExclamationTriangle size={17} />
              <span>Active Dependencies ({references.totalReferences} records)</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#78350f" }}>
              This subject is currently referenced by other active academic modules:
            </p>
            <div className={styles.refBadgeList}>
              {references.gradeSubjects > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.gradeSubjects}</strong> Grade Allocation(s)
                </span>
              )}
              {references.teacherSubjects > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.teacherSubjects}</strong> Teacher Assignment(s)
                </span>
              )}
              {references.marks > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.marks}</strong> Student Mark(s)
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
