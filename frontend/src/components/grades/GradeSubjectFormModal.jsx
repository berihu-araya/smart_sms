"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HiAcademicCap,
  HiBookOpen,
  HiClock,
  HiCheckBadge,
  HiExclamationCircle,
  HiArrowPath,
  HiBuildingOffice2,
  HiUserGroup,
  HiHashtag,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import gradeSubjectService from "@/services/gradeSubjectService";
import sectionService from "@/services/sectionService";
import styles from "./GradeSubjectFormModal.module.css";

export default function GradeSubjectFormModal({
  isOpen,
  onClose,
  assignment = null,
  defaultGradeId = "",
  defaultAcademicYearId = "",
  grades = [],
  subjects = [],
  academicYears = [],
  teachers = [],
  onSuccess,
}) {
  const isEdit = Boolean(assignment?.id);

  const [formData, setFormData] = useState({
    grade_id: "",
    subject_id: "",
    academic_year_id: "",
    teacher_id: "",
    section_id: "",
    is_compulsory: true,
    weekly_periods: "4",
    total_marks: "100",
    pass_marks: "40",
    display_order: 1,
    status: "ACTIVE",
  });

  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Populate or reset form on open
  useEffect(() => {
    if (!isOpen) return;

    setApiError("");
    setErrors({});

    if (isEdit && assignment) {
      setFormData({
        grade_id: assignment.grade_id || "",
        subject_id: assignment.subject_id || "",
        academic_year_id: assignment.academic_year_id || "",
        teacher_id: assignment.teacher_id || "",
        section_id: assignment.section_id || "",
        is_compulsory: assignment.is_compulsory !== false,
        weekly_periods:
          assignment.weekly_periods !== null && assignment.weekly_periods !== undefined
            ? String(assignment.weekly_periods)
            : "4",
        total_marks:
          assignment.total_marks !== null && assignment.total_marks !== undefined
            ? String(assignment.total_marks)
            : "100",
        pass_marks:
          assignment.pass_marks !== null && assignment.pass_marks !== undefined
            ? String(assignment.pass_marks)
            : "40",
        display_order: assignment.display_order || 1,
        status: assignment.status || "ACTIVE",
      });
    } else {
      const activeYear =
        academicYears.find((y) => y.is_active)?.id ||
        defaultAcademicYearId ||
        academicYears[0]?.id ||
        "";
      const initialGrade = defaultGradeId || grades[0]?.id || "";
      const initialSubject = subjects[0]?.id || "";

      setFormData({
        grade_id: initialGrade,
        subject_id: initialSubject,
        academic_year_id: activeYear,
        teacher_id: "",
        section_id: "",
        is_compulsory: true,
        weekly_periods: "4",
        total_marks: "100",
        pass_marks: "40",
        display_order: 1,
        status: "ACTIVE",
      });
    }
  }, [
    isOpen,
    isEdit,
    assignment,
    defaultGradeId,
    defaultAcademicYearId,
    grades,
    subjects,
    academicYears,
  ]);

  // Load sections when grade changes
  useEffect(() => {
    if (!formData.grade_id) {
      setSections([]);
      return;
    }

    let isMounted = true;
    async function fetchSections() {
      try {
        setLoadingSections(true);
        const res = await sectionService.listSections({
          gradeId: formData.grade_id,
          limit: 100,
        });
        if (isMounted) {
          setSections(res.items || []);
        }
      } catch (err) {
        if (isMounted) setSections([]);
      } finally {
        if (isMounted) setLoadingSections(false);
      }
    }

    fetchSections();
    return () => {
      isMounted = false;
    };
  }, [formData.grade_id]);

  const selectedGradeObj = useMemo(() => {
    return grades.find((g) => g.id === formData.grade_id) || null;
  }, [grades, formData.grade_id]);

  const selectedSubjectObj = useMemo(() => {
    return subjects.find((s) => s.id === formData.subject_id) || null;
  }, [subjects, formData.subject_id]);

  const selectedYearObj = useMemo(() => {
    return academicYears.find((y) => y.id === formData.academic_year_id) || null;
  }, [academicYears, formData.academic_year_id]);

  const selectedTeacherObj = useMemo(() => {
    return (
      teachers.find(
        (t) =>
          t.id === formData.teacher_id ||
          t.teacher_id === formData.teacher_id ||
          t.user_id === formData.teacher_id
      ) || null
    );
  }, [teachers, formData.teacher_id]);

  const validate = () => {
    const errs = {};

    if (!formData.grade_id) {
      errs.grade_id = "Please select a grade level.";
    }

    if (!formData.subject_id) {
      errs.subject_id = "Please select a subject to map.";
    }

    if (!formData.academic_year_id) {
      errs.academic_year_id = "Academic session year is required.";
    }

    if (
      formData.weekly_periods &&
      (isNaN(Number(formData.weekly_periods)) || Number(formData.weekly_periods) < 0)
    ) {
      errs.weekly_periods = "Weekly periods must be zero or a positive number.";
    }

    if (
      formData.total_marks &&
      (isNaN(Number(formData.total_marks)) || Number(formData.total_marks) <= 0)
    ) {
      errs.total_marks = "Total marks must be greater than zero.";
    }

    if (
      formData.pass_marks &&
      (isNaN(Number(formData.pass_marks)) || Number(formData.pass_marks) < 0)
    ) {
      errs.pass_marks = "Pass marks must be zero or a positive number.";
    }

    if (
      formData.pass_marks &&
      formData.total_marks &&
      Number(formData.pass_marks) > Number(formData.total_marks)
    ) {
      errs.pass_marks = "Pass mark cannot exceed total marks.";
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
      if (isEdit) {
        await gradeSubjectService.updateGradeSubject(assignment.id, {
          isCompulsory: formData.is_compulsory,
          weeklyPeriods: formData.weekly_periods
            ? Number(formData.weekly_periods)
            : null,
          totalMarks: formData.total_marks ? Number(formData.total_marks) : null,
          passMarks: formData.pass_marks ? Number(formData.pass_marks) : null,
          displayOrder: Number(formData.display_order) || 1,
          status: formData.status || "ACTIVE",
        });
        onSuccess?.(
          `Subject mapping for "${selectedSubjectObj?.subject_name || "Subject"}" updated successfully!`
        );
      } else {
        await gradeSubjectService.createGradeSubject({
          gradeId: formData.grade_id,
          subjectId: formData.subject_id,
          academicYearId: formData.academic_year_id,
          teacherId: formData.teacher_id || null,
          sectionId: formData.section_id || null,
          isCompulsory: formData.is_compulsory,
          weeklyPeriods: formData.weekly_periods
            ? Number(formData.weekly_periods)
            : null,
          totalMarks: formData.total_marks ? Number(formData.total_marks) : null,
          passMarks: formData.pass_marks ? Number(formData.pass_marks) : null,
          displayOrder: Number(formData.display_order) || 1,
        });
        onSuccess?.(
          `Subject "${selectedSubjectObj?.subject_name || "Subject"}" mapped to ${
            selectedGradeObj?.name || "Grade"
          } successfully!`
        );
      }
      onClose();
    } catch (err) {
      setApiError(
        err.message || "Failed to save subject assignment. Please check your inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? `Edit Mapping: ${assignment?.subject_name || "Subject"}`
          : "Allocate Subject to Grade"
      }
      subtitle={
        isEdit
          ? "Update instructional periods, pass benchmarks, and classification."
          : "Assign an academic subject to a grade curriculum for the target academic year."
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

        {/* Edit Mode Summary Header */}
        {isEdit && (
          <div className={styles.editHeaderCard}>
            <div className={styles.editAvatar}>
              {(assignment?.subject_code || "SUB").substring(0, 4)}
            </div>
            <div className={styles.editInfo}>
              <span className={styles.editSubjectTitle}>
                {assignment?.subject_name} ({assignment?.subject_code})
              </span>
              <div className={styles.editMetaRow}>
                <span>Grade: {assignment?.grade_name}</span>
                <span>•</span>
                <span>Session: {assignment?.academic_year_name}</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.formGrid}>
          {/* Target Grade (only selectable when creating) */}
          {!isEdit && (
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
                  value={formData.grade_id}
                  onChange={(e) => {
                    setFormData({ ...formData, grade_id: e.target.value });
                    if (errors.grade_id) setErrors({ ...errors, grade_id: null });
                  }}
                  className={`${styles.select} ${
                    errors.grade_id ? styles.inputError : ""
                  }`}
                >
                  <option value="">Select Grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.grade_id && (
                <span className={styles.fieldError}>
                  <HiExclamationCircle size={14} /> {errors.grade_id}
                </span>
              )}
            </div>
          )}

          {/* Target Subject (only selectable when creating) */}
          {!isEdit && (
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
                  value={formData.subject_id}
                  onChange={(e) => {
                    setFormData({ ...formData, subject_id: e.target.value });
                    if (errors.subject_id)
                      setErrors({ ...errors, subject_id: null });
                  }}
                  className={`${styles.select} ${
                    errors.subject_id ? styles.inputError : ""
                  }`}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_code} - {s.subject_name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.subject_id && (
                <span className={styles.fieldError}>
                  <HiExclamationCircle size={14} /> {errors.subject_id}
                </span>
              )}
            </div>
          )}

          {/* Academic Session Year (only selectable when creating) */}
          {!isEdit && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <div className={styles.labelLeft}>
                  <span>Academic Session</span>
                  <span className={styles.required}>*</span>
                </div>
              </label>
              <div className={styles.inputWrapper}>
                <HiAcademicCap className={styles.inputIcon} />
                <select
                  required
                  value={formData.academic_year_id}
                  onChange={(e) => {
                    setFormData({ ...formData, academic_year_id: e.target.value });
                    if (errors.academic_year_id)
                      setErrors({ ...errors, academic_year_id: null });
                  }}
                  className={`${styles.select} ${
                    errors.academic_year_id ? styles.inputError : ""
                  }`}
                >
                  <option value="">Select Session Year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_active ? "★ (Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {errors.academic_year_id && (
                <span className={styles.fieldError}>
                  <HiExclamationCircle size={14} /> {errors.academic_year_id}
                </span>
              )}
            </div>
          )}

          {/* Assigned Teacher (Optional) */}
          {!isEdit && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <div className={styles.labelLeft}>
                  <span>Subject Teacher</span>
                </div>
              </label>
              <div className={styles.inputWrapper}>
                <HiUserGroup className={styles.inputIcon} />
                <select
                  value={formData.teacher_id}
                  onChange={(e) =>
                    setFormData({ ...formData, teacher_id: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="">Assign Later / None</option>
                  {teachers.map((t) => {
                    const tId = t.id || t.teacher_id || t.user_id;
                    const tName =
                      t.full_name ||
                      `${t.first_name || ""} ${t.last_name || ""}`.trim() ||
                      t.email;
                    return (
                      <option key={tId} value={tId}>
                        👨‍🏫 {tName} {t.employee_number ? `(${t.employee_number})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Optional Section Specific Assignment */}
          {!isEdit && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <div className={styles.labelLeft}>
                  <span>Section Specific (Optional)</span>
                </div>
                {loadingSections && (
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Loading...
                  </span>
                )}
              </label>
              <div className={styles.inputWrapper}>
                <HiBuildingOffice2 className={styles.inputIcon} />
                <select
                  value={formData.section_id}
                  onChange={(e) =>
                    setFormData({ ...formData, section_id: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="">All Sections in this Grade</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} {sec.room_number ? `(Room ${sec.room_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Display Order Sequence */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Report Card Order</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiHashtag className={styles.inputIcon} />
              <input
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 1"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: e.target.value })
                }
                className={styles.input}
              />
            </div>
          </div>

          {/* Weekly Periods */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Weekly Periods</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiClock className={styles.inputIcon} />
              <input
                type="number"
                min="0"
                max="30"
                placeholder="e.g. 4"
                value={formData.weekly_periods}
                onChange={(e) => {
                  setFormData({ ...formData, weekly_periods: e.target.value });
                  if (errors.weekly_periods)
                    setErrors({ ...errors, weekly_periods: null });
                }}
                className={`${styles.input} ${
                  errors.weekly_periods ? styles.inputError : ""
                }`}
              />
            </div>
            {errors.weekly_periods && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.weekly_periods}
              </span>
            )}
          </div>

          {/* Total Marks */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Total Marks</span>
              </div>
            </label>
            <div className={styles.inputWrapper}>
              <HiCheckBadge className={styles.inputIcon} />
              <input
                type="number"
                min="1"
                max="1000"
                placeholder="e.g. 100"
                value={formData.total_marks}
                onChange={(e) => {
                  setFormData({ ...formData, total_marks: e.target.value });
                  if (errors.total_marks)
                    setErrors({ ...errors, total_marks: null });
                }}
                className={`${styles.input} ${
                  errors.total_marks ? styles.inputError : ""
                }`}
              />
            </div>
            {errors.total_marks && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.total_marks}
              </span>
            )}
          </div>

          {/* Pass Marks */}
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
                placeholder="e.g. 40"
                value={formData.pass_marks}
                onChange={(e) => {
                  setFormData({ ...formData, pass_marks: e.target.value });
                  if (errors.pass_marks)
                    setErrors({ ...errors, pass_marks: null });
                }}
                className={`${styles.input} ${
                  errors.pass_marks ? styles.inputError : ""
                }`}
              />
            </div>
            {errors.pass_marks && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.pass_marks}
              </span>
            )}
          </div>

          {/* Curriculum Classification (Compulsory vs Elective) */}
          <div className={`${styles.formGroup} ${styles.formGridFull}`}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Curriculum Requirement Type</span>
              </div>
            </label>
            <div className={styles.typeSelector}>
              <div
                className={`${styles.typeCard} ${
                  formData.is_compulsory ? styles.typeCardActive : ""
                }`}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, is_compulsory: true }))
                }
              >
                <input
                  type="radio"
                  name="compulsory_type"
                  checked={formData.is_compulsory}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, is_compulsory: true }))
                  }
                  className={styles.typeRadio}
                />
                <div className={styles.typeLabel}>
                  <span className={styles.typeTitle}>✓ Compulsory (Core)</span>
                  <span className={styles.typeDesc}>
                    Mandatory for all students in this grade
                  </span>
                </div>
              </div>

              <div
                className={`${styles.typeCard} ${
                  !formData.is_compulsory ? styles.typeCardActive : ""
                }`}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, is_compulsory: false }))
                }
              >
                <input
                  type="radio"
                  name="compulsory_type"
                  checked={!formData.is_compulsory}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, is_compulsory: false }))
                  }
                  className={styles.typeRadio}
                />
                <div className={styles.typeLabel}>
                  <span className={styles.typeTitle}>○ Elective (Optional)</span>
                  <span className={styles.typeDesc}>
                    Optional choice based on student selection
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Allocation Preview Card */}
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <span>Live Allocation Preview</span>
            <span className={styles.previewBadge}>Curriculum Snapshot</span>
          </div>
          <div className={styles.previewCardContent}>
            <div className={styles.previewAvatar}>
              {(selectedSubjectObj?.subject_code || "SUB").substring(0, 4)}
            </div>
            <div className={styles.previewInfo}>
              <div className={styles.previewNameRow}>
                <span className={styles.previewSubjectName}>
                  {selectedSubjectObj
                    ? `${selectedSubjectObj.subject_name} (${selectedSubjectObj.subject_code})`
                    : isEdit
                    ? assignment?.subject_name
                    : "Select a Subject"}
                </span>
                <span className={styles.previewGradeTag}>
                  {selectedGradeObj?.name || assignment?.grade_name || "Grade"}
                </span>
                <span
                  className={`${styles.previewTypeTag} ${
                    formData.is_compulsory
                      ? styles.previewCompulsory
                      : styles.previewElective
                  }`}
                >
                  {formData.is_compulsory ? "Core (Compulsory)" : "Elective"}
                </span>
              </div>
              <div className={styles.previewMetaRow}>
                <span className={styles.previewMetaItem}>
                  ⏱ {formData.weekly_periods || 0} periods/wk
                </span>
                <span>•</span>
                <span className={styles.previewMetaItem}>
                  🎯 Pass: {formData.pass_marks || 40} / {formData.total_marks || 100} pts
                </span>
                {selectedTeacherObj && (
                  <>
                    <span>•</span>
                    <span className={styles.previewMetaItem}>
                      👨‍🏫 {selectedTeacherObj.full_name || selectedTeacherObj.first_name}
                    </span>
                  </>
                )}
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
                <span>{isEdit ? "Saving Changes..." : "Creating Assignment..."}</span>
              </>
            ) : (
              <span>{isEdit ? "Save Settings" : "Allocate Subject"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
