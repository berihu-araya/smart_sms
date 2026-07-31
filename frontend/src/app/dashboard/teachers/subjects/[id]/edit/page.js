"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import teacherSubjectService from "@/services/teacherSubjectService";
import teacherService from "@/services/teacherService";
import subjectService from "@/services/subjectService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "./edit.module.css";

export default function EditTeacherSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState({
    teacher_id: "",
    subject_id: "",
    grade_id: "",
    section_id: "",
    academic_year_id: "",
    start_date: "",
    end_date: "",
    status: "ACTIVE",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // Dropdown options
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [assignmentData, teachersData, subjectsData, gradesData, yearsData] = await Promise.all([
          teacherSubjectService.getTeacherSubjectById(params.id),
          teacherService.listTeachers({ limit: 200 }),
          subjectService.listSubjects({ limit: 200 }),
          gradeService.listGrades({ limit: 200 }),
          academicYearService.listAcademicYears({ limit: 200 }),
        ]);

        setTeachers(teachersData.items || []);
        setSubjects(subjectsData.items || []);
        setGrades(gradesData.items || []);
        setAcademicYears(yearsData.items || []);

        // Load sections for the assigned grade
        if (assignmentData.grade_id) {
          const sectionsData = await sectionService.listSections({
            gradeId: assignmentData.grade_id,
            limit: 100,
          });
          setSections(sectionsData.items || []);
        }

        setForm({
          teacher_id: assignmentData.teacher_id || "",
          subject_id: assignmentData.subject_id || "",
          grade_id: assignmentData.grade_id || "",
          section_id: assignmentData.section_id || "",
          academic_year_id: assignmentData.academic_year_id || "",
          start_date: assignmentData.start_date ? assignmentData.start_date.split("T")[0] : "",
          end_date: assignmentData.end_date ? assignmentData.end_date.split("T")[0] : "",
          status: assignmentData.status || "ACTIVE",
        });
      } catch (err) {
        setApiError(err.message || "Unable to load assignment data");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadData();
    }
  }, [params]);

  // Load sections when grade changes
  useEffect(() => {
    async function loadSections() {
      if (!form.grade_id) {
        setSections([]);
        return;
      }
      try {
        const data = await sectionService.listSections({ gradeId: form.grade_id, limit: 100 });
        setSections(data.items || []);
      } catch (err) {
        console.error("Failed to load sections", err);
        setSections([]);
      }
    }
    loadSections();
  }, [form.grade_id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear section when grade changes
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
      await teacherSubjectService.updateTeacherSubject(params.id, {
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        grade_id: form.grade_id,
        section_id: form.section_id,
        academic_year_id: form.academic_year_id,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
      });
      router.push(`/dashboard/teachers/subjects/${params.id}`);
    } catch (err) {
      setApiError(err.message || "Unable to update assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.page}>Loading assignment data...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/teachers/subjects">Teacher Subjects</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>Edit Assignment</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Edit Assignment</h1>
        <p>Update the teacher-subject assignment details.</p>
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
              <div className={styles.sectionIcon}>📋</div>
              <div>
                <h3 className={styles.sectionTitle}>Assignment Details</h3>
                <p className={styles.sectionSubtitle}>Modify the teacher, subject, and class details</p>
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
                {errors.teacher_id && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.teacher_id}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Subject<span className={styles.required}>*</span>
                </label>
                <select
                  name="subject_id"
                  value={form.subject_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.subject_id ? styles.inputError : ""}`}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name} ({s.subject_code})
                    </option>
                  ))}
                </select>
                {errors.subject_id && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.subject_id}
                  </span>
                )}
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
                {errors.grade_id && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.grade_id}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Section<span className={styles.required}>*</span>
                </label>
                <select
                  name="section_id"
                  value={form.section_id}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.section_id ? styles.inputError : ""}`}
                  disabled={!form.grade_id}
                >
                  <option value="">
                    {form.grade_id ? "Select Section" : "Select Grade First"}
                  </option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.section_id && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.section_id}
                  </span>
                )}
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
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.academic_year_id}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Status</label>
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

              <div className={styles.field}>
                <label className={styles.label}>Start Date</label>
                <input
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>End Date</label>
                <input
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.end_date ? styles.inputError : ""}`}
                />
                {errors.end_date && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.end_date}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href={`/dashboard/teachers/subjects/${params.id}`} className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Update Assignment"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
