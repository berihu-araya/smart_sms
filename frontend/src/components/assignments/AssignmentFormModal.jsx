"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HiDocumentText,
  HiAcademicCap,
  HiBookOpen,
  HiCalendar,
  HiCheckBadge,
  HiFolderArrowDown,
  HiBuildingOffice,
  HiExclamationCircle,
  HiArrowPath,
  HiPlus,
  HiTrash,
  HiClock,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import { createAssignment, updateAssignment } from "@/services/assignmentService";
import styles from "./AssignmentFormModal.module.css";

export default function AssignmentFormModal({
  isOpen,
  onClose,
  assignment = null,
  grades = [],
  sections = [],
  subjects = [],
  academicYears = [],
  defaultGradeId = "",
  defaultSubjectId = "",
  defaultAcademicYearId = "",
  onSuccess,
}) {
  const isEdit = Boolean(assignment?.id);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    gradeId: "",
    sectionId: "",
    subjectId: "",
    academicYearId: "",
    dueDate: "",
    maxMarks: 100,
    passMarks: 50,
    allowLateSubmissions: true,
    submissionType: "ONLINE_TEXT_AND_FILE",
    status: "PUBLISHED",
    attachmentUrls: [],
  });

  const [newAttachmentTitle, setNewAttachmentTitle] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Populate or reset form on open
  useEffect(() => {
    if (!isOpen) return;

    setApiError("");
    setErrors({});
    setNewAttachmentTitle("");
    setNewAttachmentUrl("");

    if (isEdit && assignment) {
      const dueDateFormatted = assignment.due_date
        ? new Date(assignment.due_date).toISOString().slice(0, 16)
        : "";

      let attachments = assignment.attachment_urls || [];
      if (typeof attachments === "string") {
        try {
          attachments = JSON.parse(attachments);
        } catch {
          attachments = [];
        }
      }

      setFormData({
        title: assignment.title || "",
        description: assignment.description || "",
        gradeId: assignment.grade_id || "",
        sectionId: assignment.section_id || "",
        subjectId: assignment.subject_id || "",
        academicYearId: assignment.academic_year_id || "",
        dueDate: dueDateFormatted,
        maxMarks: Number(assignment.max_marks || 100),
        passMarks: Number(assignment.pass_marks || 50),
        allowLateSubmissions: assignment.allow_late_submissions !== false,
        submissionType: assignment.submission_type || "ONLINE_TEXT_AND_FILE",
        status: assignment.status || "PUBLISHED",
        attachmentUrls: Array.isArray(attachments) ? attachments : [],
      });
    } else {
      const activeYear =
        academicYears.find((y) => y.is_active)?.id ||
        defaultAcademicYearId ||
        academicYears[0]?.id ||
        "";
      const initialGrade = defaultGradeId || grades[0]?.id || "";
      const initialSubject = defaultSubjectId || subjects[0]?.id || "";

      // Default due date: 7 days in future at 23:59
      const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      d.setHours(23, 59, 0, 0);
      const defaultDueStr = d.toISOString().slice(0, 16);

      setFormData({
        title: "",
        description: "",
        gradeId: initialGrade,
        sectionId: "",
        subjectId: initialSubject,
        academicYearId: activeYear,
        dueDate: defaultDueStr,
        maxMarks: 100,
        passMarks: 50,
        allowLateSubmissions: true,
        submissionType: "ONLINE_TEXT_AND_FILE",
        status: "PUBLISHED",
        attachmentUrls: [],
      });
    }
  }, [
    isOpen,
    isEdit,
    assignment,
    grades,
    subjects,
    academicYears,
    defaultGradeId,
    defaultSubjectId,
    defaultAcademicYearId,
  ]);

  // Filter sections by currently selected grade
  const availableSections = useMemo(() => {
    if (!formData.gradeId) return sections;
    return sections.filter((s) => s.grade_id === formData.gradeId);
  }, [sections, formData.gradeId]);

  const selectedGradeObj = useMemo(() => {
    return grades.find((g) => g.id === formData.gradeId) || null;
  }, [grades, formData.gradeId]);

  const selectedSubjectObj = useMemo(() => {
    return subjects.find((s) => s.id === formData.subjectId) || null;
  }, [subjects, formData.subjectId]);

  const selectedSectionObj = useMemo(() => {
    return sections.find((s) => s.id === formData.sectionId) || null;
  }, [sections, formData.sectionId]);

  // Attachment managers
  const handleAddAttachment = () => {
    if (!newAttachmentUrl.trim()) return;
    const newItem = {
      title: newAttachmentTitle.trim() || "Reference Document",
      url: newAttachmentUrl.trim(),
    };
    setFormData((prev) => ({
      ...prev,
      attachmentUrls: [...prev.attachmentUrls, newItem],
    }));
    setNewAttachmentTitle("");
    setNewAttachmentUrl("");
  };

  const handleRemoveAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachmentUrls: prev.attachmentUrls.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const errs = {};

    if (!formData.title.trim()) {
      errs.title = "Assignment title is required.";
    }

    if (!formData.gradeId) {
      errs.gradeId = "Please select a target grade.";
    }

    if (!formData.subjectId) {
      errs.subjectId = "Please select a subject.";
    }

    if (!formData.academicYearId) {
      errs.academicYearId = "Academic session year is required.";
    }

    if (!formData.dueDate) {
      errs.dueDate = "Submission deadline date & time is required.";
    }

    if (!formData.maxMarks || Number(formData.maxMarks) <= 0) {
      errs.maxMarks = "Maximum marks must be greater than zero.";
    }

    if (
      formData.passMarks !== "" &&
      (isNaN(Number(formData.passMarks)) || Number(formData.passMarks) < 0)
    ) {
      errs.passMarks = "Pass marks must be zero or a positive number.";
    }

    if (
      formData.passMarks &&
      formData.maxMarks &&
      Number(formData.passMarks) > Number(formData.maxMarks)
    ) {
      errs.passMarks = "Pass mark cannot exceed maximum marks.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        gradeId: formData.gradeId,
        sectionId: formData.sectionId || null,
        subjectId: formData.subjectId,
        academicYearId: formData.academicYearId,
        dueDate: formData.dueDate,
        maxMarks: Number(formData.maxMarks) || 100,
        passMarks: Number(formData.passMarks) || 50,
        allowLateSubmissions: formData.allowLateSubmissions,
        submissionType: formData.submissionType,
        status: formData.status,
        attachmentUrls: formData.attachmentUrls,
      };

      if (isEdit) {
        await updateAssignment(assignment.id, payload);
        onSuccess?.(
          `Assignment "${formData.title}" updated successfully!`
        );
      } else {
        await createAssignment(payload);
        onSuccess?.(
          `Assignment "${formData.title}" created and published successfully!`
        );
      }
      onClose();
    } catch (err) {
      setApiError(
        err.message || "Failed to save assignment. Please review your inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Assignment: ${assignment?.title}` : "Create Homework Assignment"}
      subtitle={
        isEdit
          ? "Update assignment guidelines, deadline, passing marks, or reference files."
          : "Assign coursework and digital submissions to a grade class with deadlines and instructions."
      }
      icon={HiDocumentText}
      size="lg"
    >
      <form onSubmit={handleSubmit} className={styles.formContainer} noValidate>
        {apiError && (
          <div className={styles.alertError}>
            <HiExclamationCircle />
            <span>{apiError}</span>
          </div>
        )}

        {/* Edit mode header summary card */}
        {isEdit && (
          <div className={styles.editHeaderCard}>
            <div className={styles.editAvatar}>
              <HiDocumentText />
            </div>
            <div className={styles.editInfo}>
              <span className={styles.editTitle}>{assignment?.title}</span>
              <div className={styles.editMetaRow}>
                <span>Grade: {assignment?.grade_name}</span>
                <span>•</span>
                <span>Subject: {assignment?.subject_name}</span>
                <span>•</span>
                <span>Max: {assignment?.max_marks || 100} pts</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.formGrid}>
          {/* Assignment Title */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Assignment Title</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiDocumentText className={styles.inputIcon} />
              <input
                type="text"
                required
                placeholder="e.g. Chapter 4 Trigonometry Problem Set"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (errors.title) setErrors({ ...errors, title: null });
                }}
                className={`${styles.input} ${errors.title ? styles.inputError : ""}`}
              />
            </div>
            {errors.title && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.title}
              </span>
            )}
          </div>

          {/* Target Grade */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Target Grade</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiAcademicCap className={styles.inputIcon} />
              <select
                required
                value={formData.gradeId}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    gradeId: e.target.value,
                    sectionId: "",
                  });
                  if (errors.gradeId) setErrors({ ...errors, gradeId: null });
                }}
                className={`${styles.select} ${errors.gradeId ? styles.inputError : ""}`}
              >
                <option value="">Select Grade</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.gradeId && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.gradeId}
              </span>
            )}
          </div>

          {/* Section (Optional / All Sections) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Section Specific (Optional)</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiBuildingOffice className={styles.inputIcon} />
              <select
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className={styles.select}
              >
                <option value="">All Sections in Grade</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} {sec.room_number ? `(Room ${sec.room_number})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Course */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Subject Course</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiBookOpen className={styles.inputIcon} />
              <select
                required
                value={formData.subjectId}
                onChange={(e) => {
                  setFormData({ ...formData, subjectId: e.target.value });
                  if (errors.subjectId) setErrors({ ...errors, subjectId: null });
                }}
                className={`${styles.select} ${errors.subjectId ? styles.inputError : ""}`}
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_code} - {s.subject_name}
                  </option>
                ))}
              </select>
            </div>
            {errors.subjectId && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.subjectId}
              </span>
            )}
          </div>

          {/* Academic Session */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Academic Session</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCalendar className={styles.inputIcon} />
              <select
                required
                value={formData.academicYearId}
                onChange={(e) => {
                  setFormData({ ...formData, academicYearId: e.target.value });
                  if (errors.academicYearId) setErrors({ ...errors, academicYearId: null });
                }}
                className={`${styles.select} ${errors.academicYearId ? styles.inputError : ""}`}
              >
                <option value="">Select Session Year</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_active ? "★ (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {errors.academicYearId && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.academicYearId}
              </span>
            )}
          </div>

          {/* Submission Deadline (Due Date & Time) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Submission Due Date & Time</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiClock className={styles.inputIcon} />
              <input
                type="datetime-local"
                required
                value={formData.dueDate}
                onChange={(e) => {
                  setFormData({ ...formData, dueDate: e.target.value });
                  if (errors.dueDate) setErrors({ ...errors, dueDate: null });
                }}
                className={`${styles.input} ${errors.dueDate ? styles.inputError : ""}`}
              />
            </div>
            {errors.dueDate && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.dueDate}
              </span>
            )}
          </div>

          {/* Status */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Publication Status</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCheckBadge className={styles.inputIcon} />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={styles.select}
              >
                <option value="PUBLISHED">Published (Visible to Students)</option>
                <option value="CLOSED">Closed (Archived / Submissions Ended)</option>
              </select>
            </div>
          </div>

          {/* Maximum Marks */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Maximum Marks</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCheckBadge className={styles.inputIcon} />
              <input
                type="number"
                min="1"
                max="1000"
                placeholder="100"
                value={formData.maxMarks}
                onChange={(e) => {
                  setFormData({ ...formData, maxMarks: e.target.value });
                  if (errors.maxMarks) setErrors({ ...errors, maxMarks: null });
                }}
                className={`${styles.input} ${errors.maxMarks ? styles.inputError : ""}`}
              />
            </div>
            {errors.maxMarks && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.maxMarks}
              </span>
            )}
          </div>

          {/* Pass Benchmark */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Pass Benchmark</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCheckBadge className={styles.inputIcon} />
              <input
                type="number"
                min="0"
                max="1000"
                placeholder="50"
                value={formData.passMarks}
                onChange={(e) => {
                  setFormData({ ...formData, passMarks: e.target.value });
                  if (errors.passMarks) setErrors({ ...errors, passMarks: null });
                }}
                className={`${styles.input} ${errors.passMarks ? styles.inputError : ""}`}
              />
            </div>
            {errors.passMarks && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.passMarks}
              </span>
            )}
          </div>

          {/* Submission Format Mode */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Accepted Submission Mode</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiDocumentText className={styles.inputIcon} />
              <select
                value={formData.submissionType}
                onChange={(e) => setFormData({ ...formData, submissionType: e.target.value })}
                className={styles.select}
              >
                <option value="ONLINE_TEXT_AND_FILE">Online Typed Text & File Uploads</option>
                <option value="ONLINE_TEXT_ONLY">Online Typed Text Only</option>
                <option value="ONLINE_FILE_ONLY">Online File / Link Attachment Only</option>
                <option value="OFFLINE">Offline Physical Submission (In-Class)</option>
              </select>
            </div>
          </div>

          {/* Assignment Guidelines / Instructions */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Instructions & Description</span>
              </div>
            </label>
            <textarea
              rows={3}
              placeholder="Outline homework questions, problem numbers, formatting rules, or rubric criteria..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
            />
          </div>

          {/* Late Submission Checkbox */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <label className={styles.checkboxGroup}>
              <input
                type="checkbox"
                checked={formData.allowLateSubmissions}
                onChange={(e) =>
                  setFormData({ ...formData, allowLateSubmissions: e.target.checked })
                }
                className={styles.checkbox}
              />
              <span className={styles.checkboxLabel}>
                Allow late submissions after due date (will be automatically tagged as LATE)
              </span>
            </label>
          </div>

          {/* Reference Material / Attachment Links */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <div className={styles.attachmentManager}>
              <div className={styles.attachmentManagerTitle}>
                <span>Reference Files & External Resource Links</span>
                <span>({formData.attachmentUrls.length} attached)</span>
              </div>

              {formData.attachmentUrls.length > 0 && (
                <div className={styles.attachmentList}>
                  {formData.attachmentUrls.map((att, idx) => (
                    <div key={idx} className={styles.attachmentItem}>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.attachmentLink}
                      >
                        <HiFolderArrowDown /> {att.title} ({att.url})
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className={styles.btnRemoveAtt}
                        title="Remove link"
                      >
                        <HiTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.addAttachmentRow}>
                <input
                  type="text"
                  placeholder="Material title (e.g. Worksheet PDF, Lab Guide)"
                  value={newAttachmentTitle}
                  onChange={(e) => setNewAttachmentTitle(e.target.value)}
                  className={styles.attInput}
                />
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or file URL"
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  className={styles.attInput}
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className={styles.btnAddAtt}
                >
                  <HiPlus size={14} /> Add Link
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Assignment Summary Preview */}
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <span>Live Assignment Preview</span>
            <span className={styles.previewBadge}>Student View Preview</span>
          </div>
          <div className={styles.previewCardContent}>
            <div className={styles.previewAvatar}>
              <HiDocumentText />
            </div>
            <div className={styles.previewInfo}>
              <div className={styles.previewTitleRow}>
                <span className={styles.previewAssignmentTitle}>
                  {formData.title.trim() || "Untitled Assignment"}
                </span>
                <span className={styles.previewGradeTag}>
                  {selectedGradeObj?.name || "Grade"}
                  {selectedSectionObj ? ` • Section ${selectedSectionObj.name}` : ""}
                </span>
                <span className={styles.previewSubjectTag}>
                  {selectedSubjectObj
                    ? `${selectedSubjectObj.subject_name} (${selectedSubjectObj.subject_code})`
                    : "Subject"}
                </span>
              </div>
              <div className={styles.previewMetaRow}>
                <span>
                  ⏰ Due:{" "}
                  {formData.dueDate
                    ? new Date(formData.dueDate).toLocaleDateString()
                    : "Not set"}
                </span>
                <span>•</span>
                <span>
                  🎯 Max: {formData.maxMarks || 100} pts (Pass: {formData.passMarks || 50} pts)
                </span>
                <span>•</span>
                <span>
                  {formData.allowLateSubmissions ? "Late Allowed" : "No Late Submissions"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
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
                <span>{isEdit ? "Saving Changes..." : "Publishing Assignment..."}</span>
              </>
            ) : (
              <span>{isEdit ? "Save Changes" : "Publish Assignment"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
