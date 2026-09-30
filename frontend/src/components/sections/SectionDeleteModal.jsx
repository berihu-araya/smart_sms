"use client";

import { useEffect, useState } from "react";
import {
  HiTrash,
  HiExclamationTriangle,
  HiExclamationCircle,
  HiArrowPath,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import sectionService from "@/services/sectionService";
import styles from "./SectionDeleteModal.module.css";

export default function SectionDeleteModal({
  isOpen,
  onClose,
  section,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [references, setReferences] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !section?.id) return;

    let isMounted = true;
    async function loadRefs() {
      try {
        setLoadingRefs(true);
        setError("");
        const refData = await sectionService.checkSectionReferences(section.id);
        if (isMounted) setReferences(refData);
      } catch (err) {
        console.error("Failed to check section references:", err);
        if (isMounted) setReferences(null);
      } finally {
        if (isMounted) setLoadingRefs(false);
      }
    }

    loadRefs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, section?.id]);

  if (!section) return null;

  const badgeInitials = section.name ? section.name.substring(0, 3).toUpperCase() : "SEC";

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");

    try {
      await sectionService.deleteSection(section.id);
      onSuccess?.(`Section "${section.name}" deactivated successfully.`);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to deactivate class section.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deactivate Section"
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
              Are you sure you want to deactivate this section? This will soft-delete the section and hide it from active class and attendance selectors.
            </p>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionAvatar}>{badgeInitials}</div>
          <div className={styles.sectionInfo}>
            <div className={styles.sectionName}>{section.name}</div>
            <div className={styles.sectionMeta}>
              <span>Grade: {section.grade_name || "—"}</span>
              <span>•</span>
              <span>Room: {section.room_number || "—"}</span>
              <span>•</span>
              <span>Capacity: {section.capacity ? `${section.capacity} seats` : "—"}</span>
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
            Checking linked students and teacher dependencies...
          </div>
        ) : references && references.hasReferences ? (
          <div className={styles.warningCallout}>
            <div className={styles.warningCalloutTitle}>
              <HiExclamationTriangle size={17} />
              <span>Active Dependencies ({references.totalReferences} records)</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#78350f" }}>
              This section is currently referenced by other active academic modules:
            </p>
            <div className={styles.refBadgeList}>
              {references.students > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.students}</strong> Student(s)
                </span>
              )}
              {references.teacherSubjects > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.teacherSubjects}</strong> Teacher Assignment(s)
                </span>
              )}
              {references.attendance > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.attendance}</strong> Attendance Record(s)
                </span>
              )}
              {references.marks > 0 && (
                <span className={styles.refBadgeItem}>
                  <strong>{references.marks}</strong> Mark(s)
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
