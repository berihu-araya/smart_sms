"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import academicYearService from "@/services/academicYearService";
import styles from "./new.module.css";

export default function NewAcademicYearPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

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

    if (!form.name.trim()) {
      errs.name = "Academic year name is required";
    } else if (form.name.trim().length < 4) {
      errs.name = "Academic year name must be at least 4 characters";
    }

    if (!form.startDate) {
      errs.startDate = "Start date is required";
    }

    if (!form.endDate) {
      errs.endDate = "End date is required";
    }

    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      errs.endDate = "End date must be after start date";
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
      await academicYearService.createAcademicYear({
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim() || undefined,
      });
      router.push("/dashboard/settings/academic-years");
    } catch (err) {
      setApiError(err.message || "Unable to create academic year. Please try again.");
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
        <Link href="/dashboard/settings/academic-years">Academic Years</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Academic Year</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Create Academic Year</h1>
        <p>Add a new academic year to the school system.</p>
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
          {/* Year Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📅</div>
              <div>
                <h3 className={styles.sectionTitle}>Year Details</h3>
                <p className={styles.sectionSubtitle}>Enter the academic year information</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Year Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. 2024-2025"
                  className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                />
                {errors.name && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.name}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Start Date<span className={styles.required}>*</span>
                </label>
                <input
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.startDate ? styles.inputError : ""}`}
                />
                {errors.startDate && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.startDate}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  End Date<span className={styles.required}>*</span>
                </label>
                <input
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.endDate ? styles.inputError : ""}`}
                />
                {errors.endDate && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.endDate}
                  </span>
                )}
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Optional description for this academic year"
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/settings/academic-years" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Create Academic Year"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

