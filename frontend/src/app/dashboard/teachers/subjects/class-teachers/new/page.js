"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import classTeacherService from "@/services/classTeacherService";
import teacherService from "@/services/teacherService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "./new.module.css";

const getTodayDateString = () => new Date().toISOString().split("T")[0];

export default function NewClassTeacherPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    teacher_id: "",
    grade_id: "",
    section_id: "",
    academic_year_id: "",
    start_date: getTodayDateString(),
    end_date: "",
    status: "ACTIVE",
    notes: "",
    addToTeacherSubjects: false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  // Dropdown options
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [teachersData, gradesData, yearsData] = await Promise.all([
          teacherService.listTeachers({ limit: 200 }),
          gradeService.listGrades({ limit: 200 }),
          academicYearService.listAcademicYears({ limit: 200 }),
        ]);
        setTeachers(teachersData.items || []);
        setGrades(gradesData.items || []);
        setAcademicYears(yearsData.items || []);
      } catch (err) {
        console.error("Failed to load options", err);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    async function loadSectionsForGrade() {
      if (!form.grade_id) {
        setSections([]);
        setForm((prev) => ({ ...prev, section_id: "" }));
        return;
      }

      try {
        const data = await sectionService.listSections({ gradeId: form.grade_id, limit: 100 });
        setSections(data.items || []);
        setForm((prev) => ({ ...prev, section_id: "" }));
      } catch (err) {
        console.error("Failed to load sections for grade", err);
        setSections([]);
        setForm((prev) => ({ ...prev, section_id: "" }));
      }
    }

    loadSectionsForGrade();
  }, [form.grade_id]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setForm((prev) => ({ ...prev, [name]: fieldValue }));

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
    if (!form.grade_id) errs.grade_id = "Grade is required";
    if (!form.section_id) errs.section_id = "Section is required";
    if (!form.academic_year_id) errs.academic_year_id = "Academic year is required";
    if (!form.start_date) errs.start_date = "Start date is required";

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
      await classTeacherService.createClassTeacher({
        teacher_id: form.teacher_id,
        section_id: form.section_id,
        academic_year_id: form.academic_year_id,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        notes: form.notes || null,
        addToTeacherSubjects: form.addToTeacherSubjects,
      });
      router.push("/dashboard/teachers/subjects/class-teachers");
    } catch (err) {
      setApiError(err.message || "Unable to create assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingOptions) {
    return <div className={styles.page}>Loading form data...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/teachers/subjects/class-teachers">Class Teachers</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Assignment</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Assign Class Teacher</h1>
        <p>Designate a teacher as the homeroom/class teacher for a section.</p>
      </div>

      {/* API Error Banner */}
      {apiError ? (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{apiError}</span>
        </div>
      ) : null}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className={styles.formCard}>
          {/* Assignment Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>👨‍🏫</div>
              <div>
                <h3 className={styles.sectionTitle}>Assignment Details</h3>
                <p className={styles.sectionSubtitle}>Select the teacher, section, and academic year</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Teacher<span className={styles.required}>*</span>
                </label>
                <select
                  name="teacher_id"
                  value={form.teacher_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.teacher_id ? styles.inputError : ""}`}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.employee_number})
                    </option>
                  ))}
                </select>
                {errors.teacher_id && <span className={styles.fieldError}>ℹ️ {errors.teacher_id}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Grade<span className={styles.required}>*</span>
                </label>
                <select
                  name="grade_id"
                  value={form.grade_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.grade_id ? styles.inputError : ""}`}
                >
                  <option value="">Select Grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {errors.grade_id && <span className={styles.fieldError}>ℹ️ {errors.grade_id}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Section<span className={styles.required}>*</span>
                </label>
                <select
                  name="section_id"
                  value={form.section_id}
                  onChange={handleChange}
                  disabled={!form.grade_id}
                  className={`${styles.select} ${errors.section_id ? styles.inputError : ""}`}
                >
                  <option value="">{form.grade_id ? "Select Section" : "Select Grade First"}</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.section_id && <span className={styles.fieldError}>ℹ️ {errors.section_id}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Academic Year<span className={styles.required}>*</span>
                </label>
                <select
                  name="academic_year_id"
                  value={form.academic_year_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.academic_year_id ? styles.inputError : ""}`}
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
                {errors.academic_year_id && (
                  <span className={styles.fieldError}>ℹ️ {errors.academic_year_id}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Status<span className={styles.required}>*</span>
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dates Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📅</div>
              <div>
                <h3 className={styles.sectionTitle}>Assignment Dates</h3>
                <p className={styles.sectionSubtitle}>Set when this assignment starts and ends</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Start Date<span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.start_date ? styles.inputError : ""}`}
                />
                {errors.start_date && <span className={styles.fieldError}>ℹ️ {errors.start_date}</span>}
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
                {errors.end_date && <span className={styles.fieldError}>ℹ️ {errors.end_date}</span>}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📝</div>
              <div>
                <h3 className={styles.sectionTitle}>Additional Information</h3>
                <p className={styles.sectionSubtitle}>Add notes and configure subject assignment</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Add any notes about this assignment..."
                  className={styles.textarea}
                ></textarea>
              </div>

              <div className={`${styles.checkbox} ${styles.formGridFull}`}>
                <input
                  type="checkbox"
                  id="addToTeacherSubjects"
                  name="addToTeacherSubjects"
                  checked={form.addToTeacherSubjects}
                  onChange={handleChange}
                  className={styles.checkboxInput}
                />
                <label htmlFor="addToTeacherSubjects" className={styles.checkboxLabel}>
                  Automatically add this teacher to all subject assignments for this section
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link href="/dashboard/teachers/subjects/class-teachers" className={styles.btnSecondary}>
            Cancel
          </Link>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={saving}
          >
            {saving && <span className={styles.spinner}></span>}
            {saving ? "Creating..." : "Create Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}
