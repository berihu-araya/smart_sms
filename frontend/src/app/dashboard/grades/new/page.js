"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import gradeService from "@/services/gradeService";
import styles from "./new.module.css";

export default function NewGradePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
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
      errs.name = "Grade name is required";
    } else if (form.name.trim().length < 2) {
      errs.name = "Grade name must be at least 2 characters";
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
      await gradeService.createGrade(form);
      router.push("/dashboard/grades");
    } catch (err) {
      setApiError(err.message || "Unable to create grade. Please try again.");
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
        <span style={{ color: "#101828", fontWeight: 500 }}>New Grade</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Create Grade</h1>
        <p>Add a new grade level to the school system.</p>
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
          {/* Grade Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>🎓</div>
              <div>
                <h3 className={styles.sectionTitle}>Grade Details</h3>
                <p className={styles.sectionSubtitle}>Enter the grade level information</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>
                  Grade Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Grade 1, Grade 2, Grade 9"
                  className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                />
                {errors.name && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.name}
                  </span>
                )}
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Optional description for this grade level"
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/grades" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Create Grade"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

