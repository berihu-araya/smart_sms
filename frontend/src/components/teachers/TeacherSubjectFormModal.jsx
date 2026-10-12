"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HiBookOpen,
  HiAcademicCap,
  HiClock,
  HiUser,
  HiCalendarDays,
  HiArrowPath,
  HiExclamationCircle,
  HiCheckCircle,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import teacherSubjectService from "@/services/teacherSubjectService";
import teacherService from "@/services/teacherService";
import subjectService from "@/services/subjectService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "./TeacherSubjectFormModal.module.css";

const getTodayDateString = () => new Date().toISOString().split("T")[0];

export default function TeacherSubjectFormModal({
  isOpen,
  onClose,
  onSuccess,
  prefilledTeacherId = "",
  prefilledGradeId = "",
  prefilledSectionId = "",
}) {
  const [form, setForm] = useState({
    teacher_id: prefilledTeacherId || "",
    subject_id: "",
    grade_id: prefilledGradeId || "",
    section_id: prefilledSectionId || "",
    academic_year_id: "",
    start_date: getTodayDateString(),
    end_date: "",
    status: "ACTIVE",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Dropdown datasets
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Load static dropdown options when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setApiError("");
        setErrors({});

        const [teachersData, subjectsData, gradesData, yearsData, activeYear] = await Promise.all([
          teacherService.listTeachers({ limit: 300 }).catch(() => ({ items: [] })),
          subjectService.listSubjects({ limit: 300 }).catch(() => ({ items: [] })),
          gradeService.listGrades({ limit: 300 }).catch(() => ({ items: [] })),
          academicYearService.listAcademicYears({ limit: 100 }).catch(() => ({ items: [] })),
          academicYearService.getActiveAcademicYear().catch(() => null),
        ]);

        if (!isMounted) return;

        setTeachers(teachersData.items || []);
        setSubjects(subjectsData.items || []);
        setGrades(gradesData.items || []);
        setAcademicYears(yearsData.items || []);

        setForm((prev) => ({
          ...prev,
          teacher_id: prefilledTeacherId || prev.teacher_id,
          grade_id: prefilledGradeId || prev.grade_id,
          section_id: prefilledSectionId || prev.section_id,
          academic_year_id: prev.academic_year_id || activeYear?.id || yearsData.items?.[0]?.id || "",
          start_date: prev.start_date || getTodayDateString(),
        }));
      } catch (err) {
        if (isMounted) {
          setApiError(err.message || "Failed to load assignment form options.");
        }
      } finally {
        if (isMounted) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, prefilledTeacherId, prefilledGradeId, prefilledSectionId]);

  // Dynamically load sections when grade changes
  useEffect(() => {
    if (!form.grade_id) {
      setSections([]);
      return;
    }

    let isMounted = true;
    async function loadSections() {
      try {
        setLoadingSections(true);
        const data = await sectionService.listSections({ gradeId: form.grade_id, limit: 100 });
        if (isMounted) {
          setSections(data.items || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load sections for grade", err);
          setSections([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSections(false);
        }
      }
    }

    loadSections();

    return () => {
      isMounted = false;
    };
  }, [form.grade_id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "grade_id") {
      setForm((prev) => ({ ...prev, grade_id: value, section_id: "" }));
    }

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  }

  function validate() {
    const errs = {};

    if (!form.teacher_id) errs.teacher_id = "Teacher is required";
    if (!form.subject_id) errs.subject_id = "Subject is required";
    if (!form.grade_id) errs.grade_id = "Grade is required";
    if (!form.section_id) errs.section_id = "Section is required";
    if (!form.academic_year_id) errs.academic_year_id = "Academic year is required";

    if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
      errs.end_date = "End date must be after start date";
    }

    return errs;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      const created = await teacherSubjectService.createTeacherSubject({
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        grade_id: form.grade_id,
        section_id: form.section_id,
        academic_year_id: form.academic_year_id,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
      });

      onSuccess?.(created);
      onClose?.();
    } catch (err) {
      setApiError(err.message || "Unable to create assignment. Please check for conflicting assignments.");
    } finally {
      setSaving(false);
    }
  }

  // Selected object helpers for real-time preview
  const selectedTeacher = useMemo(
    () => teachers.find((t) => String(t.id) === String(form.teacher_id)),
    [teachers, form.teacher_id]
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => String(s.id) === String(form.subject_id)),
    [subjects, form.subject_id]
  );
  const selectedGrade = useMemo(
    () => grades.find((g) => String(g.id) === String(form.grade_id)),
    [grades, form.grade_id]
  );
  const selectedSection = useMemo(
    () => sections.find((s) => String(s.id) === String(form.section_id)),
    [sections, form.section_id]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Teacher to Subject"
      subtitle="Link a teacher to deliver a specific curriculum course for an assigned grade and section."
      icon={HiBookOpen}
      size="lg"
      preventBackdropClose={saving}
    >
      {loadingOptions ? (
        <div className={styles.loadingContainer}>
          <HiArrowPath className={styles.spinner} />
          <span>Loading faculty, subjects, and grade rosters...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {apiError && (
            <div className={styles.apiErrorBanner}>
              <HiExclamationCircle size={20} />
              <span>{apiError}</span>
            </div>
          )}

          {/* Section 1: Teacher & Course */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <HiUser className={styles.sectionIcon} />
              <h3>Teacher & Subject Course</h3>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Teacher <span className={styles.required}>*</span>
                </label>
                <select
                  name="teacher_id"
                  value={form.teacher_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.teacher_id ? styles.inputError : ""}`}
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} {t.employee_number ? `(${t.employee_number})` : ""} {t.specialization ? `• ${t.specialization}` : ""}
                    </option>
                  ))}
                </select>
                {errors.teacher_id && <span className={styles.errorMessage}>{errors.teacher_id}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Subject Course <span className={styles.required}>*</span>
                </label>
                <select
                  name="subject_id"
                  value={form.subject_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.subject_id ? styles.inputError : ""}`}
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || "Course"}) {s.category ? `[${s.category}]` : ""}
                    </option>
                  ))}
                </select>
                {errors.subject_id && <span className={styles.errorMessage}>{errors.subject_id}</span>}
              </div>
            </div>
          </div>

          {/* Section 2: Class & Academic Year */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <HiAcademicCap className={styles.sectionIcon} />
              <h3>Grade, Section & Academic Year</h3>
            </div>

            <div className={styles.formGrid3}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Grade / Year Level <span className={styles.required}>*</span>
                </label>
                <select
                  name="grade_id"
                  value={form.grade_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.grade_id ? styles.inputError : ""}`}
                >
                  <option value="">-- Select Grade --</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {errors.grade_id && <span className={styles.errorMessage}>{errors.grade_id}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Class Section <span className={styles.required}>*</span>
                </label>
                <select
                  name="section_id"
                  value={form.section_id}
                  onChange={handleChange}
                  disabled={!form.grade_id || loadingSections}
                  className={`${styles.select} ${errors.section_id ? styles.inputError : ""}`}
                >
                  <option value="">
                    {loadingSections
                      ? "Loading sections..."
                      : !form.grade_id
                        ? "Select Grade First"
                        : "-- Select Section --"}
                  </option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} {sec.room_number ? `(Room ${sec.room_number})` : ""}
                    </option>
                  ))}
                </select>
                {errors.section_id && <span className={styles.errorMessage}>{errors.section_id}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Academic Year <span className={styles.required}>*</span>
                </label>
                <select
                  name="academic_year_id"
                  value={form.academic_year_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.academic_year_id ? styles.inputError : ""}`}
                >
                  <option value="">-- Select Academic Year --</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_active ? "(Active)" : ""}
                    </option>
                  ))}
                </select>
                {errors.academic_year_id && <span className={styles.errorMessage}>{errors.academic_year_id}</span>}
              </div>
            </div>
          </div>

          {/* Section 3: Timeline & Status */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <HiCalendarDays className={styles.sectionIcon} />
              <h3>Assignment Timeline & Status</h3>
            </div>

            <div className={styles.formGrid3}>
              <div className={styles.field}>
                <label className={styles.label}>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>End Date (Optional)</label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.end_date ? styles.inputError : ""}`}
                />
                {errors.end_date && <span className={styles.errorMessage}>{errors.end_date}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Operational Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="ACTIVE">ACTIVE (Active Term)</option>
                  <option value="INACTIVE">INACTIVE (Archived)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Dynamic Preview Card */}
          {selectedTeacher && selectedSubject && selectedGrade && selectedSection && (
            <div className={styles.assignmentPreviewCard}>
              <HiCheckCircle />
              <div>
                <strong>Assigning: </strong>
                <span>
                  {selectedTeacher.first_name} {selectedTeacher.last_name} → {selectedSubject.name} ({selectedGrade.name} - {selectedSection.name})
                </span>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={saving}
            >
              {saving ? (
                <>
                  <HiArrowPath className={styles.spinner} style={{ fontSize: "1rem" }} />
                  <span>Assigning Teacher...</span>
                </>
              ) : (
                <>
                  <HiCheckCircle size={18} />
                  <span>Create Assignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
