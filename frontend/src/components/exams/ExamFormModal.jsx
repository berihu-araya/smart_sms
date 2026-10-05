"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HiDocumentText,
  HiAcademicCap,
  HiBookOpen,
  HiCalendar,
  HiCheckBadge,
  HiExclamationCircle,
  HiArrowPath,
  HiTag,
  HiScale,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import { createExam, updateExam } from "@/services/examService";
import styles from "./ExamFormModal.module.css";

export default function ExamFormModal({
  isOpen,
  onClose,
  exam = null,
  grades = [],
  subjects = [],
  academicYears = [],
  defaultGradeId = "",
  defaultYearId = "",
  onSuccess,
}) {
  const isEdit = Boolean(exam?.id);

  const [formData, setFormData] = useState({
    title: "",
    termOrSemester: "Semester 1",
    examType: "MIDTERM",
    weightPercentage: 30,
    maxMarks: 100,
    examDate: new Date().toISOString().split("T")[0],
    gradeId: "",
    subjectId: "",
    academicYearId: "",
    isPublished: true,
    description: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    setApiError("");
    setErrors({});

    if (isEdit && exam) {
      const examDateFormatted = exam.exam_date
        ? new Date(exam.exam_date).toISOString().split("T")[0]
        : "";

      setFormData({
        title: exam.title || "",
        termOrSemester: exam.term_or_semester || "Semester 1",
        examType: exam.exam_type || "MIDTERM",
        weightPercentage: Number(exam.weight_percentage ?? 30),
        maxMarks: Number(exam.max_marks ?? 100),
        examDate: examDateFormatted,
        gradeId: exam.grade_id || "",
        subjectId: exam.subject_id || "",
        academicYearId: exam.academic_year_id || "",
        isPublished: exam.is_published !== false,
        description: exam.description || "",
      });
    } else {
      const activeYear =
        academicYears.find((y) => y.is_active)?.id ||
        defaultYearId ||
        academicYears[0]?.id ||
        "";

      setFormData({
        title: "",
        termOrSemester: "Semester 1",
        examType: "MIDTERM",
        weightPercentage: 30,
        maxMarks: 100,
        examDate: new Date().toISOString().split("T")[0],
        gradeId: defaultGradeId || "",
        subjectId: "",
        academicYearId: activeYear,
        isPublished: true,
        description: "",
      });
    }
  }, [isOpen, isEdit, exam, academicYears, defaultGradeId, defaultYearId]);

  // Selected names for live preview
  const selectedGradeObj = useMemo(() => {
    return grades.find((g) => g.id === formData.gradeId) || null;
  }, [grades, formData.gradeId]);

  const selectedSubjectObj = useMemo(() => {
    return subjects.find((s) => s.id === formData.subjectId) || null;
  }, [subjects, formData.subjectId]);

  const getBadgeClass = (type) => {
    switch (type) {
      case "FINAL":
        return styles.badgeFinal;
      case "MIDTERM":
        return styles.badgeMidterm;
      case "QUIZ":
        return styles.badgeQuiz;
      case "ASSIGNMENT":
        return styles.badgeAssignment;
      case "PROJECT":
        return styles.badgeProject;
      case "TEST":
        return styles.badgeTest;
      default:
        return styles.badgeAssignment;
    }
  };

  const validate = () => {
    const errs = {};

    if (!formData.title || formData.title.trim().length < 2) {
      errs.title = "Exam title must be at least 2 characters long.";
    }

    if (!formData.examType) {
      errs.examType = "Please select an assessment type.";
    }

    if (!formData.termOrSemester) {
      errs.termOrSemester = "Term or semester is required.";
    }

    const maxM = Number(formData.maxMarks);
    if (isNaN(maxM) || maxM <= 0 || maxM > 1000) {
      errs.maxMarks = "Maximum marks must be a positive number up to 1000.";
    }

    const weight = Number(formData.weightPercentage);
    if (isNaN(weight) || weight < 0 || weight > 100) {
      errs.weightPercentage = "Weight percentage must be between 0 and 100%.";
    }

    if (formData.examDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.examDate)) {
        errs.examDate = "Exam date must be in YYYY-MM-DD format.";
      }
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
        termOrSemester: formData.termOrSemester.trim(),
        examType: formData.examType,
        maxMarks: Number(formData.maxMarks),
        weightPercentage: Number(formData.weightPercentage),
        examDate: formData.examDate || null,
        gradeId: formData.gradeId || null,
        subjectId: formData.subjectId || null,
        academicYearId: formData.academicYearId || null,
        isPublished: Boolean(formData.isPublished),
        description: formData.description.trim() || null,
      };

      if (isEdit) {
        await updateExam(exam.id, payload);
        onSuccess?.(`Exam "${formData.title}" updated successfully!`);
      } else {
        await createExam(payload);
        onSuccess?.(`Exam "${formData.title}" scheduled successfully!`);
      }
      onClose();
    } catch (err) {
      setApiError(
        err.message || "Failed to save examination schedule. Please review your inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Assessment: ${exam?.title}` : "Schedule Assessment Cycle"}
      subtitle={
        isEdit
          ? "Update assessment details, maximum points, grade weights, or schedule date."
          : "Create examination cycles, configure grade weighting, and target class subjects."
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
              <span className={styles.editTitle}>{exam?.title}</span>
              <div className={styles.editMetaRow}>
                <span>Grade: {exam?.grade_name || "All Grades"}</span>
                <span>•</span>
                <span>Subject: {exam?.subject_name || "All Subjects"}</span>
                <span>•</span>
                <span>Max: {exam?.max_marks || 100} pts</span>
                <span>•</span>
                <span>Weight: {exam?.weight_percentage || 100}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Dynamic Preview Card */}
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <span>Live Assessment Preview</span>
            <span className={`${styles.badge} ${getBadgeClass(formData.examType)}`}>
              {formData.examType}
            </span>
          </div>
          <div className={styles.previewCardContent}>
            <div className={styles.previewAvatar}>
              <HiDocumentText />
            </div>
            <div className={styles.previewInfo}>
              <div className={styles.previewTitleRow}>
                <span className={styles.previewExamTitle}>
                  {formData.title.trim() || "Untitled Assessment"}
                </span>
                <span className={styles.previewGradeTag}>
                  {selectedGradeObj ? selectedGradeObj.name : "All Grade Levels"}
                </span>
                <span className={styles.previewSubjectTag}>
                  {selectedSubjectObj
                    ? `${selectedSubjectObj.subject_name || selectedSubjectObj.name}`
                    : "All Subjects"}
                </span>
              </div>
              <div className={styles.previewMetaRow}>
                <span>
                  🗓️ Date: {formData.examDate || "TBD"}
                </span>
                <span>•</span>
                <span>🏷️ {formData.termOrSemester}</span>
                <span>•</span>
                <span>
                  🎯 Max: <strong>{formData.maxMarks || 100} pts</strong>
                </span>
                <span>•</span>
                <span>
                  ⚖️ Weight: <strong>{formData.weightPercentage || 30}%</strong>
                </span>
                <span>•</span>
                <span>
                  {formData.isPublished ? "✅ Published" : "🔒 Draft"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formGrid}>
          {/* Exam Title */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Exam Title</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiDocumentText className={styles.inputIcon} />
              <input
                type="text"
                required
                placeholder="e.g. Midterm Assessment Examination 2026"
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

          {/* Assessment Type Selection */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Assessment Type</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiTag className={styles.inputIcon} />
              <select
                required
                value={formData.examType}
                onChange={(e) => {
                  setFormData({ ...formData, examType: e.target.value });
                  if (errors.examType) setErrors({ ...errors, examType: null });
                }}
                className={`${styles.select} ${errors.examType ? styles.inputError : ""}`}
              >
                <option value="MIDTERM">Midterm Exam (MIDTERM)</option>
                <option value="FINAL">Final Examination (FINAL)</option>
                <option value="QUIZ">Quiz / Test (QUIZ)</option>
                <option value="ASSIGNMENT">Assignment / Coursework (ASSIGNMENT)</option>
                <option value="PROJECT">Project / Lab Work (PROJECT)</option>
                <option value="TEST">Unit Test (TEST)</option>
              </select>
            </div>
            {errors.examType && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.examType}
              </span>
            )}
          </div>

          {/* Term / Semester */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Term / Semester</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiTag className={styles.inputIcon} />
              <select
                required
                value={formData.termOrSemester}
                onChange={(e) => setFormData({ ...formData, termOrSemester: e.target.value })}
                className={styles.select}
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
                <option value="Quarter 1">Quarter 1</option>
                <option value="Quarter 2">Quarter 2</option>
                <option value="Quarter 3">Quarter 3</option>
                <option value="Quarter 4">Quarter 4</option>
              </select>
            </div>
          </div>

          {/* Exam Date */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Exam Date</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCalendar className={styles.inputIcon} />
              <input
                type="date"
                value={formData.examDate}
                onChange={(e) => {
                  setFormData({ ...formData, examDate: e.target.value });
                  if (errors.examDate) setErrors({ ...errors, examDate: null });
                }}
                className={`${styles.input} ${errors.examDate ? styles.inputError : ""}`}
              />
            </div>
            {errors.examDate && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.examDate}
              </span>
            )}
          </div>

          {/* Maximum Marks */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Maximum Marks (Points)</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCheckBadge className={styles.inputIcon} />
              <input
                type="number"
                min="1"
                max="1000"
                required
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

          {/* Weight Percentage */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Weight Percentage (%)</span>
                <span className={styles.required}>*</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiScale className={styles.inputIcon} />
              <input
                type="number"
                min="0"
                max="100"
                required
                placeholder="30"
                value={formData.weightPercentage}
                onChange={(e) => {
                  setFormData({ ...formData, weightPercentage: e.target.value });
                  if (errors.weightPercentage) setErrors({ ...errors, weightPercentage: null });
                }}
                className={`${styles.input} ${errors.weightPercentage ? styles.inputError : ""}`}
              />
            </div>
            {errors.weightPercentage && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.weightPercentage}
              </span>
            )}
          </div>

          {/* Target Grade Level */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Target Grade Level (Optional)</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiAcademicCap className={styles.inputIcon} />
              <select
                value={formData.gradeId}
                onChange={(e) => setFormData({ ...formData, gradeId: e.target.value })}
                className={styles.select}
              >
                <option value="">All Grade Levels</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Subject */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Target Subject (Optional)</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiBookOpen className={styles.inputIcon} />
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className={styles.select}
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name || s.name} ({s.subject_code || s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Academic Session */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Academic Session</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCalendar className={styles.inputIcon} />
              <select
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                className={styles.select}
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_active ? "★ (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status on Creation */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Publication Status</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCheckBadge className={styles.inputIcon} />
              <select
                value={formData.isPublished ? "true" : "false"}
                onChange={(e) =>
                  setFormData({ ...formData, isPublished: e.target.value === "true" })
                }
                className={styles.select}
              >
                <option value="true">Published (Visible for Marks Entry)</option>
                <option value="false">Draft Mode (Hidden)</option>
              </select>
            </div>
          </div>

          {/* Description & Instructions */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Description & Examination Instructions (Optional)</span>
              </div>
            </label>
            <textarea
              rows={2}
              placeholder="Add exam room guidelines, materials allowed, syllabus coverage, or scoring criteria..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
            />
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
                <span>{isEdit ? "Saving Changes..." : "Scheduling Exam..."}</span>
              </>
            ) : (
              <span>{isEdit ? "Save Changes" : "Schedule Exam"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
