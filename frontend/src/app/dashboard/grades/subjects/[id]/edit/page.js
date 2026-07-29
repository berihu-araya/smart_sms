"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import gradeSubjectService from "@/services/gradeSubjectService";
import styles from "./edit.module.css";

export default function EditGradeSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState({
    isCompulsory: true,
    weeklyPeriods: "",
    totalMarks: "",
    passMarks: "",
    displayOrder: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function loadAssignment() {
      try {
        setLoading(true);
        const data = await gradeSubjectService.getGradeSubjectById(params.id);
        setForm({
          isCompulsory: data.is_compulsory ?? true,
          weeklyPeriods: data.weekly_periods ?? "",
          totalMarks: data.total_marks ?? "",
          passMarks: data.pass_marks ?? "",
          displayOrder: data.display_order ?? "",
        });
      } catch (err) {
        setApiError(err.message || "Unable to load assignment");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadAssignment();
    }
  }, [params]);

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
      await gradeSubjectService.updateGradeSubject(params.id, {
        isCompulsory: form.isCompulsory,
        weeklyPeriods: form.weeklyPeriods || null,
        totalMarks: form.totalMarks || null,
        passMarks: form.passMarks || null,
        displayOrder: form.displayOrder || null,
      });
      router.push(`/dashboard/grades/subjects/${params.id}`);
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
        <Link href="/dashboard/grades">Grades</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/grades/subjects">Subject Assignments</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>Edit Assignment</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Edit Grade-Subject Assignment</h1>
        <p>Update the assignment configuration.</p>
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
          {/* Grading Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📊</div>
              <div>
                <h3 className={styles.sectionTitle}>Grading Information</h3>
                <p className={styles.sectionSubtitle}>Update marks and period configuration</p>
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

          {/* Actions */}
          <div className={styles.actions}>
            <Link href={`/dashboard/grades/subjects/${params.id}`} className={styles.btnSecondary}>
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

