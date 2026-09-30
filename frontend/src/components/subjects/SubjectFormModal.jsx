"use client";

import { useEffect, useState } from "react";
import {
  HiBookOpen,
  HiCodeBracket,
  HiClock,
  HiCheckBadge,
  HiExclamationCircle,
  HiArrowPath,
  HiAcademicCap,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import subjectService from "@/services/subjectService";
import styles from "./SubjectFormModal.module.css";

function computeSubjectBadge(code = "", name = "") {
  const cTrim = (code || "").trim();
  const nTrim = (name || "").trim();

  if (cTrim) {
    const letters = cTrim.split(/[^a-zA-Z]/)[0];
    if (letters && letters.length >= 2) return letters.substring(0, 4).toUpperCase();
    return cTrim.substring(0, 4).toUpperCase();
  }
  if (nTrim) {
    return nTrim.substring(0, 3).toUpperCase();
  }
  return "SUB";
}

export default function SubjectFormModal({
  isOpen,
  onClose,
  subject = null,
  onSuccess,
}) {
  const isEdit = Boolean(subject?.id);

  const [formData, setFormData] = useState({
    subject_code: "",
    subject_name: "",
    short_name: "",
    description: "",
    credit_hours: "3.0",
    pass_mark: "50",
    max_mark: "100",
    is_elective: false,
    is_lab: false,
    display_order: 0,
    status: "ACTIVE",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Populate or reset on open
  useEffect(() => {
    if (!isOpen) return;

    setApiError("");
    setErrors({});

    if (isEdit && subject) {
      setFormData({
        subject_code: subject.subject_code || "",
        subject_name: subject.subject_name || "",
        short_name: subject.short_name || "",
        description: subject.description || "",
        credit_hours:
          subject.credit_hours !== null && subject.credit_hours !== undefined
            ? String(subject.credit_hours)
            : "",
        pass_mark:
          subject.pass_mark !== null && subject.pass_mark !== undefined
            ? String(subject.pass_mark)
            : "",
        max_mark:
          subject.max_mark !== null && subject.max_mark !== undefined
            ? String(subject.max_mark)
            : "100",
        is_elective: Boolean(subject.is_elective),
        is_lab: Boolean(subject.is_lab),
        display_order: subject.display_order || 0,
        status: subject.status || "ACTIVE",
      });
    } else {
      setFormData({
        subject_code: "",
        subject_name: "",
        short_name: "",
        description: "",
        credit_hours: "3.0",
        pass_mark: "50",
        max_mark: "100",
        is_elective: false,
        is_lab: false,
        display_order: 0,
        status: "ACTIVE",
      });
    }
  }, [isOpen, isEdit, subject]);

  const previewBadge = computeSubjectBadge(formData.subject_code, formData.subject_name);

  const validate = () => {
    const errs = {};
    const code = (formData.subject_code || "").trim();
    const name = (formData.subject_name || "").trim();

    if (!code) {
      errs.subject_code = "Subject code is required (e.g. MATH-101).";
    } else if (code.length < 2 || code.length > 20) {
      errs.subject_code = "Subject code must be between 2 and 20 characters.";
    }

    if (!name) {
      errs.subject_name = "Subject name is required.";
    } else if (name.length < 2) {
      errs.subject_name = "Subject name must be at least 2 characters.";
    }

    if (
      formData.credit_hours &&
      (isNaN(Number(formData.credit_hours)) || Number(formData.credit_hours) < 0)
    ) {
      errs.credit_hours = "Credit hours must be zero or a positive number.";
    }

    if (
      formData.pass_mark &&
      (isNaN(Number(formData.pass_mark)) || Number(formData.pass_mark) < 0)
    ) {
      errs.pass_mark = "Pass mark must be a valid positive score.";
    }

    if (
      formData.max_mark &&
      (isNaN(Number(formData.max_mark)) || Number(formData.max_mark) <= 0)
    ) {
      errs.max_mark = "Max mark must be greater than zero.";
    }

    if (
      formData.pass_mark &&
      formData.max_mark &&
      Number(formData.pass_mark) > Number(formData.max_mark)
    ) {
      errs.pass_mark = "Pass mark cannot exceed maximum mark.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");

    const payload = {
      subject_code: formData.subject_code.trim().toUpperCase(),
      subject_name: formData.subject_name.trim(),
      short_name: formData.short_name?.trim() || null,
      description: formData.description?.trim() || null,
      credit_hours:
        formData.credit_hours !== "" ? Number(formData.credit_hours) : null,
      pass_mark: formData.pass_mark !== "" ? Number(formData.pass_mark) : null,
      max_mark: formData.max_mark !== "" ? Number(formData.max_mark) : null,
      is_elective: Boolean(formData.is_elective),
      is_lab: Boolean(formData.is_lab),
      display_order: Number(formData.display_order) || 0,
      status: formData.status || "ACTIVE",
    };

    try {
      if (isEdit) {
        await subjectService.updateSubject(subject.id, payload);
        onSuccess?.(`Subject "${payload.subject_name}" updated successfully!`);
      } else {
        await subjectService.createSubject(payload);
        onSuccess?.(`Subject "${payload.subject_name}" created successfully!`);
      }
      onClose();
    } catch (err) {
      setApiError(
        err.message || "Failed to save academic subject. Please check your inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Subject: ${subject?.subject_name || ""}` : "Create New Subject"}
      subtitle={
        isEdit
          ? "Update subject code, name, credits, pass criteria, and syllabus notes."
          : "Define a curriculum subject, credit weighting, pass mark, and classification."
      }
      icon={HiBookOpen}
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.formContainer} noValidate>
        {apiError && (
          <div className={styles.alertError}>
            <HiExclamationCircle />
            <span>{apiError}</span>
          </div>
        )}

        <div className={styles.formGrid}>
          {/* Subject Code */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Subject Code</span>
                <span className={styles.required}>*</span>
              </div>
              <span className={styles.charCount}>
                {formData.subject_code.length} / 20
              </span>
            </label>
            <div className={styles.inputWrapper}>
              <HiCodeBracket className={styles.inputIcon} />
              <input
                type="text"
                required
                maxLength={20}
                placeholder="e.g. MATH-101, ENG-200"
                className={`${styles.input} ${
                  errors.subject_code ? styles.inputError : ""
                }`}
                value={formData.subject_code}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    subject_code: e.target.value.toUpperCase(),
                  });
                  if (errors.subject_code)
                    setErrors({ ...errors, subject_code: null });
                }}
                autoFocus
              />
            </div>
            {errors.subject_code && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.subject_code}
              </span>
            )}
          </div>

          {/* Subject Name */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Subject Name</span>
                <span className={styles.required}>*</span>
              </div>
              <span className={styles.charCount}>
                {formData.subject_name.length} / 100
              </span>
            </label>
            <div className={styles.inputWrapper}>
              <HiBookOpen className={styles.inputIcon} />
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Advanced Mathematics"
                className={`${styles.input} ${
                  errors.subject_name ? styles.inputError : ""
                }`}
                value={formData.subject_name}
                onChange={(e) => {
                  setFormData({ ...formData, subject_name: e.target.value });
                  if (errors.subject_name)
                    setErrors({ ...errors, subject_name: null });
                }}
              />
            </div>
            {errors.subject_name && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.subject_name}
              </span>
            )}
          </div>

          {/* Short Name / Abbreviation */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Short Name / Abbreviation</span>
              </div>
              <span className={styles.charCount}>
                {formData.short_name?.length || 0} / 30
              </span>
            </label>
            <div className={styles.inputWrapper}>
              <HiAcademicCap className={styles.inputIcon} />
              <input
                type="text"
                maxLength={30}
                placeholder="e.g. Adv Math, Bio"
                className={styles.input}
                value={formData.short_name}
                onChange={(e) =>
                  setFormData({ ...formData, short_name: e.target.value })
                }
              />
            </div>
          </div>

          {/* Credit Hours */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Credit Hours</span>
              </div>
              <span className={styles.charCount}>Hours</span>
            </label>
            <div className={styles.inputWrapper}>
              <HiClock className={styles.inputIcon} />
              <input
                type="number"
                step="0.5"
                min="0"
                max="20"
                placeholder="e.g. 3.0"
                className={`${styles.input} ${
                  errors.credit_hours ? styles.inputError : ""
                }`}
                value={formData.credit_hours}
                onChange={(e) => {
                  setFormData({ ...formData, credit_hours: e.target.value });
                  if (errors.credit_hours)
                    setErrors({ ...errors, credit_hours: null });
                }}
              />
            </div>
            {errors.credit_hours && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.credit_hours}
              </span>
            )}
          </div>

          {/* Pass Mark */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Passing Benchmark</span>
              </div>
              <span className={styles.charCount}>Pass Score</span>
            </label>
            <div className={styles.inputWrapper}>
              <HiCheckBadge className={styles.inputIcon} />
              <input
                type="number"
                min="0"
                max="1000"
                placeholder="e.g. 50"
                className={`${styles.input} ${
                  errors.pass_mark ? styles.inputError : ""
                }`}
                value={formData.pass_mark}
                onChange={(e) => {
                  setFormData({ ...formData, pass_mark: e.target.value });
                  if (errors.pass_mark)
                    setErrors({ ...errors, pass_mark: null });
                }}
              />
            </div>
            {errors.pass_mark && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.pass_mark}
              </span>
            )}
          </div>

          {/* Max Mark */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Maximum Total Score</span>
              </div>
              <span className={styles.charCount}>Max Score</span>
            </label>
            <div className={styles.inputWrapper}>
              <HiCheckBadge className={styles.inputIcon} />
              <input
                type="number"
                min="1"
                max="1000"
                placeholder="e.g. 100"
                className={`${styles.input} ${
                  errors.max_mark ? styles.inputError : ""
                }`}
                value={formData.max_mark}
                onChange={(e) => {
                  setFormData({ ...formData, max_mark: e.target.value });
                  if (errors.max_mark)
                    setErrors({ ...errors, max_mark: null });
                }}
              />
            </div>
            {errors.max_mark && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.max_mark}
              </span>
            )}
          </div>

          {/* Description / Syllabus Notes */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Description & Curriculum Overview</span>
              </div>
              <span className={styles.charCount}>
                {formData.description?.length || 0} / 250
              </span>
            </label>
            <textarea
              maxLength={250}
              placeholder="Optional summary of topics, syllabus objectives, and core concepts."
              className={styles.textarea}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
            />
          </div>

          {/* Checkboxes: Elective & Practical Lab */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_elective}
                  onChange={(e) =>
                    setFormData({ ...formData, is_elective: e.target.checked })
                  }
                  className={styles.checkbox}
                />
                <span>Elective Subject</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_lab}
                  onChange={(e) =>
                    setFormData({ ...formData, is_lab: e.target.checked })
                  }
                  className={styles.checkbox}
                />
                <span>Includes Practical / Lab Work</span>
              </label>
            </div>
          </div>
        </div>

        {/* Live Subject Preview Card */}
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <span>Live Subject Badge & Curriculum Preview</span>
            <span className={styles.previewBadge}>Interactive Preview</span>
          </div>
          <div className={styles.previewCardContent}>
            <div className={styles.previewAvatar}>{previewBadge}</div>
            <div className={styles.previewInfo}>
              <div className={styles.previewNameRow}>
                <span className={styles.previewSubjectName}>
                  {formData.subject_name || "Untitled Subject"}
                </span>
                <span className={styles.previewCodeTag}>
                  {formData.subject_code || "CODE-000"}
                </span>
                <span
                  className={`${styles.tagPill} ${
                    formData.is_elective ? styles.tagElective : styles.tagCore
                  }`}
                >
                  {formData.is_elective ? "Elective" : "Core"}
                </span>
                {formData.is_lab && (
                  <span className={`${styles.tagPill} ${styles.tagLab}`}>
                    🧪 Lab
                  </span>
                )}
              </div>
              <div className={styles.previewMetaRow}>
                <span className={styles.previewMetaItem}>
                  ⏱ Credits: {formData.credit_hours ? `${formData.credit_hours} hrs` : "None"}
                </span>
                <span>•</span>
                <span className={styles.previewMetaItem}>
                  🎯 Pass / Max: {formData.pass_mark || 50} / {formData.max_mark || 100}
                </span>
              </div>
            </div>
          </div>
        </div>

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
            type="submit"
            className={styles.btnSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <HiArrowPath className={styles.spinner} size={16} />
                <span>{isEdit ? "Updating Subject..." : "Creating Subject..."}</span>
              </>
            ) : (
              <span>{isEdit ? "Save Changes" : "Create Subject"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
