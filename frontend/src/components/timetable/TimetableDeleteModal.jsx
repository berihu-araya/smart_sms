"use client";

import { useState } from "react";
import {
  HiTrash,
  HiExclamationTriangle,
  HiExclamationCircle,
  HiArrowPath,
  HiCalendarDays,
  HiArchiveBox,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import timetableService from "@/services/timetableService";
import styles from "./TimetableDeleteModal.module.css";

export default function TimetableDeleteModal({
  isOpen,
  onClose,
  timetable,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");

  if (!timetable) return null;

  const isActivePublished =
    timetable.status === "PUBLISHED" && Boolean(timetable.is_active);

  const handleDelete = async (archiveFirst = false) => {
    setSubmitting(true);
    setError("");

    try {
      if (archiveFirst || isActivePublished) {
        await timetableService.archiveTimetable(timetable.id);
      }
      await timetableService.deleteTimetable(timetable.id);
      onSuccess?.(`Timetable "${timetable.name}" has been deleted.`);
      onClose();
    } catch (err) {
      setError(
        err.message || "Failed to delete timetable. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveOnly = async () => {
    setArchiving(true);
    setError("");

    try {
      await timetableService.archiveTimetable(timetable.id);
      onSuccess?.(`Timetable "${timetable.name}" has been archived.`);
      onClose();
    } catch (err) {
      setError(
        err.message || "Failed to archive timetable. Please try again."
      );
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Master Timetable"
      subtitle="Confirm timetable deletion and review schedule impact"
      icon={HiTrash}
      size="sm"
    >
      <div className={styles.container}>
        {/* Warning Banner */}
        <div className={styles.warningBox}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <div className={styles.warningContent}>
            <h4 className={styles.warningTitle}>Permanent Action</h4>
            <p className={styles.warningDesc}>
              Are you sure you want to delete <strong>{timetable.name}</strong>?
              All scheduled lesson allocations ({timetable.total_entries_count || 0} slots) in this version will be removed.
            </p>
          </div>
        </div>

        {/* Timetable Card */}
        <div className={styles.card}>
          <div className={styles.avatar}>
            <HiCalendarDays />
          </div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.title}>{timetable.name}</span>
              <span
                className={`${styles.statusBadge} ${
                  timetable.status === "PUBLISHED"
                    ? styles.badgePublished
                    : timetable.status === "DRAFT"
                    ? styles.badgeDraft
                    : styles.badgeArchived
                }`}
              >
                {timetable.status}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span>{timetable.academic_year_name || "Academic Year"}</span>
              <span>•</span>
              <span>{timetable.term || "Term 1"}</span>
              <span>•</span>
              <span>Version {timetable.version || 1}</span>
              {timetable.is_active && (
                <>
                  <span>•</span>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>
                    ★ Active Live
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Active Published Callout */}
        {isActivePublished && (
          <div className={styles.activeCallout}>
            <div className={styles.activeCalloutTitle}>
              <HiExclamationTriangle size={18} />
              <span>Active Published Schedule</span>
            </div>
            <p className={styles.activeCalloutDesc}>
              This timetable is currently <strong>Live</strong> for active classes and teachers. You can choose to <strong>Archive</strong> it to remove it from the live schedule, or <strong>Archive & Delete</strong>.
            </p>
          </div>
        )}

        {/* API Error Alert */}
        {error && (
          <div className={styles.alertError}>
            <HiExclamationCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Actions Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={submitting || archiving}
          >
            Cancel
          </button>

          {isActivePublished ? (
            <>
              <button
                type="button"
                className={styles.btnArchive}
                onClick={handleArchiveOnly}
                disabled={submitting || archiving}
                title="Deactivate and move to archive"
              >
                {archiving ? (
                  <>
                    <HiArrowPath className={styles.spinner} size={16} />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <HiArchiveBox size={16} />
                    <span>Archive Only</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className={styles.btnDelete}
                onClick={() => handleDelete(true)}
                disabled={submitting || archiving}
              >
                {submitting ? (
                  <>
                    <HiArrowPath className={styles.spinner} size={16} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Archive & Delete</span>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.btnDelete}
              onClick={() => handleDelete(false)}
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
          )}
        </div>
      </div>
    </Modal>
  );
}
