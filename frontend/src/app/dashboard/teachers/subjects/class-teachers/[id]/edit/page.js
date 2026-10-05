"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import classTeacherService from "@/services/classTeacherService";
import teacherService from "@/services/teacherService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "./edit.module.css";

export default function EditClassTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState({
    teacher_id: "",
    grade_id: "",
    section_id: "",
    academic_year_id: "",
    start_date: "",
    end_date: "",
    status: "ACTIVE",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // Dropdown options
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [assignmentData, teachersData, gradesData, yearsData] = await Promise.all([
          classTeacherService.getClassTeacherById(params.id),
          teacherService.listTeachers({ limit: 200 }),
          gradeService.listGrades({ limit: 200 }),
          academicYearService.listAcademicYears({ limit: 200 }),
        ]);

        setTeachers(teachersData.items || []);
        setGrades(gradesData.items || []);
        setAcademicYears(yearsData.items || []);

        let sectionGradeId = "";
        if (assignmentData.section_id) {
          const sectionData = await sectionService.getSectionById(assignmentData.section_id);
          sectionGradeId = sectionData.grade_id || sectionData.gradeId || "";
        }

        const filteredSections = sectionGradeId
          ? (await sectionService.listSections({ gradeId: sectionGradeId, limit: 100 })).items || []
          : [];

        setSections(filteredSections);

        setForm({
          teacher_id: assignmentData.teacher_id || "",
          grade_id: sectionGradeId,
          section_id: assignmentData.section_id || "",
          academic_year_id: assignmentData.academic_year_id || "",
          start_date: assignmentData.start_date ? assignmentData.start_date.split("T")[0] : "",
          end_date: assignmentData.end_date ? assignmentData.end_date.split("T")[0] : "",
          status: assignmentData.status || "ACTIVE",
          notes: assignmentData.notes || "",
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
        setForm((prev) => ({ ...prev, section_id: prev.section_id || "" }));
      } catch (err) {
        console.error("Failed to load sections for grade", err);
        setSections([]);
      }
    }

    if (form.grade_id) {
      loadSectionsForGrade();
    }
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
      await classTeacherService.updateClassTeacher(params.id, {
        teacher_id: form.teacher_id,
        section_id: form.section_id,
        academic_year_id: form.academic_year_id,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        notes: form.notes || null,
      });
      router.push(`/dashboard/teachers/subjects/class-teachers/${params.id}`);
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
        <Link href="/dashboard/teachers/subjects/class-teachers">Class Teachers</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href={`/dashboard/teachers/subjects/class-teachers/${params.id}`}>Details</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>Edit</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Edit Class Teacher Assignment</h1>
        <p>Update the class teacher assignment details.</p>
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
                <p className={styles.sectionSubtitle}>Update the teacher, section, and academic year</p>
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
                <p className={styles.sectionSubtitle}>Update when this assignment starts and ends</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Start Date</label>
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
                <p className={styles.sectionSubtitle}>Update notes about this assignment</p>
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
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link
            href={`/dashboard/teachers/subjects/class-teachers/${params.id}`}
            className={styles.btnSecondary}
          >
            Cancel
          </Link>
          <button type="submit" className={styles.btnPrimary} disabled={saving}>
            {saving && <span className={styles.spinner}></span>}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
