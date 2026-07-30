"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import gradeSubjectService from "@/services/gradeSubjectService";
import gradeService from "@/services/gradeService";
import subjectService from "@/services/subjectService";
import academicYearService from "@/services/academicYearService";
import styles from "./new.module.css";

export default function NewGradeSubjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    gradeId: "",
    subjectId: "",
    academicYearId: "",
    isCompulsory: true,
    weeklyPeriods: "",
    totalMarks: "",
    passMarks: "",
    displayOrder: "",
  });
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function loadSelects() {
      try {
        const [gradesData, subjectsData, academicYearsData, activeYear] = await Promise.all([
          gradeService.listGrades({ limit: 100 }),
          subjectService.listSubjects({ limit: 100, offset: 0 }),
          academicYearService.listAcademicYears({ limit: 100 }),
          academicYearService.getActiveAcademicYear().catch(() => null),
        ]);
        setGrades(gradesData.items || []);
        setSubjects(subjectsData.items || []);
        const years = academicYearsData.items || [];
        setAcademicYears(years);
        // Auto-select active academic year if available
        if (activeYear?.data?.id) {
          setForm((prev) => ({ ...prev, academicYearId: activeYear.data.id }));
        }
      } catch (err) {
        console.error("Failed to load form data", err);
      }
    }
    loadSelects();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const val = type === "checkbox" ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));

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

    if (!form.gradeId) {
      errs.gradeId = "Grade is required";
    }
    if (!form.subjectId) {
      errs.subjectId = "Subject is required";
    }
    if (!form.academicYearId) {
      errs.academicYearId = "Academic year is required";
    }
    if (form.weeklyPeriods && (isNaN(form.weeklyPeriods) || Number(form.weeklyPeriods) < 0)) {
      errs.weeklyPeriods = "Weekly periods cannot be negative";
    }
    if (form.totalMarks && (isNaN(form.totalMarks) || Number(form.totalMarks) < 0)) {
      errs.totalMarks = "Total marks cannot be negative";
    }
    if (form.passMarks && (isNaN(form.passMarks) || Number(form.passMarks) < 0)) {
      errs.passMarks = "Pass marks cannot be negative";
    }
    if (form.passMarks && form.totalMarks && Number(form.passMarks) > Number(form.totalMarks)) {
      errs.passMarks = "Pass marks cannot exceed total marks";
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
      await gradeSubjectService.createGradeSubject({
        gradeId: form.gradeId,
        subjectId: form.subjectId,
        academicYearId: form.academicYearId,
        isCompulsory: form.isCompulsory,
        weeklyPeriods: form.weeklyPeriods || null,
        totalMarks: form.totalMarks || null,
        passMarks: form.passMarks || null,
        displayOrder: form.displayOrder || null,
      });
      router.push("/dashboard/grades/subjects");
    } catch (err) {
      setApiError(err.message || "Unable to create assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/grades">Grades</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/grades/subjects">Subject Assignments</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Assignment</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Assign Subject to Grade</h1>
        <p>Link a subject to a grade level for a specific academic year.</p>
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
                <p className={styles.sectionSubtitle}>Select the grade, subject, and academic year</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Grade<span className={styles.required}>*</span>
                </label>
                <select
                  name="gradeId"
                  value={form.gradeId}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.gradeId ? styles.inputError : ""}`}
                >
                  <option value="">Select Grade</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>{grade.name}</option>
                  ))}
                </select>
                {errors.gradeId && (
                  <span className={styles.fieldError}><span>✕</span> {errors.gradeId}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Subject<span className={styles.required}>*</span>
                </label>
                <select
                  name="subjectId"
                  value={form.subjectId}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.subjectId ? styles.inputError : ""}`}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_code} - {subject.subject_name}
                    </option>
                  ))}
                </select>
                {errors.subjectId && (
                  <span className={styles.fieldError}><span>✕</span> {errors.subjectId}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Academic Year<span className={styles.required}>*</span>
                </label>
                <select
                  name="academicYearId"
                  value={form.academicYearId}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.academicYearId ? styles.inputError : ""}`}
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}{year.is_active ? " (Active)" : ""}
                    </option>
                  ))}
                </select>
                {errors.academicYearId && (
                  <span className={styles.fieldError}><span>✕</span> {errors.academicYearId}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Display Order</label>
                <input
                  name="displayOrder"
                  type="number"
                  value={form.displayOrder}
                  onChange={handleChange}
                  placeholder="e.g. 1"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    name="isCompulsory"
                    type="checkbox"
                    checked={form.isCompulsory}
                    onChange={handleChange}
                    className={styles.checkbox}
                  />
                  <span>Is Compulsory</span>
                </label>
              </div>
            </div>
          </div>

          {/* Grading Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📊</div>
              <div>
                <h3 className={styles.sectionTitle}>Grading Information</h3>
                <p className={styles.sectionSubtitle}>Marks and period configuration</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Weekly Periods</label>
                <input
                  name="weeklyPeriods"
                  type="number"
                  value={form.weeklyPeriods}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                  className={`${styles.input} ${errors.weeklyPeriods ? styles.inputError : ""}`}
                />
                {errors.weeklyPeriods && (
                  <span className={styles.fieldError}><span>✕</span> {errors.weeklyPeriods}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Total Marks</label>
                <input
                  name="totalMarks"
                  type="number"
                  value={form.totalMarks}
                  onChange={handleChange}
                  placeholder="e.g. 100"
                  className={`${styles.input} ${errors.totalMarks ? styles.inputError : ""}`}
                />
                {errors.totalMarks && (
                  <span className={styles.fieldError}><span>✕</span> {errors.totalMarks}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Pass Marks</label>
                <input
                  name="passMarks"
                  type="number"
                  value={form.passMarks}
                  onChange={handleChange}
                  placeholder="e.g. 40"
                  className={`${styles.input} ${errors.passMarks ? styles.inputError : ""}`}
                />
                {errors.passMarks && (
                  <span className={styles.fieldError}><span>✕</span> {errors.passMarks}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/grades/subjects" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Create Assignment"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

