"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import subjectService from "@/services/subjectService";
import styles from "./new.module.css";

export default function NewSubjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    subjectCode: "",
    subjectName: "",
    shortName: "",
    description: "",
    creditHours: "",
    passMark: "",
    maxMark: "",
    isElective: false,
    isLab: false,
    displayOrder: "",
    status: "ACTIVE",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

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

    if (!form.subjectCode.trim()) {
      errs.subjectCode = "Subject code is required";
    } else if (form.subjectCode.trim().length < 2 || form.subjectCode.trim().length > 20) {
      errs.subjectCode = "Subject code must be between 2 and 20 characters";
    }

    if (!form.subjectName.trim()) {
      errs.subjectName = "Subject name is required";
    } else if (form.subjectName.trim().length < 2) {
      errs.subjectName = "Subject name must be at least 2 characters";
    }

    if (form.creditHours && (isNaN(form.creditHours) || Number(form.creditHours) < 0)) {
      errs.creditHours = "Credit hours must be a positive number";
    }

    if (form.passMark && (isNaN(form.passMark) || Number(form.passMark) < 0)) {
      errs.passMark = "Pass mark must be zero or greater";
    }

    if (form.maxMark && (isNaN(form.maxMark) || Number(form.maxMark) <= 0)) {
      errs.maxMark = "Maximum mark must be greater than zero";
    }

    if (form.passMark && form.maxMark && Number(form.passMark) > Number(form.maxMark)) {
      errs.passMark = "Pass mark cannot be greater than maximum mark";
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
      await subjectService.createSubject({
        subjectCode: form.subjectCode,
        subjectName: form.subjectName,
        shortName: form.shortName || null,
        description: form.description || null,
        creditHours: form.creditHours || null,
        passMark: form.passMark || null,
        maxMark: form.maxMark || null,
        isElective: form.isElective,
        isLab: form.isLab,
        displayOrder: form.displayOrder || null,
        status: form.status,
      });
      router.push("/dashboard/subjects");
    } catch (err) {
      setApiError(err.message || "Unable to create subject. Please try again.");
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
        <Link href="/dashboard/subjects">Subjects</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Subject</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Create Subject</h1>
        <p>Add a new subject to the school curriculum.</p>
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
          {/* Basic Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📘</div>
              <div>
                <h3 className={styles.sectionTitle}>Basic Information</h3>
                <p className={styles.sectionSubtitle}>Core identification details for the subject</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Subject Code<span className={styles.required}>*</span>
                </label>
                <input
                  name="subjectCode"
                  value={form.subjectCode}
                  onChange={handleChange}
                  placeholder="e.g. MATH101"
                  className={`${styles.input} ${errors.subjectCode ? styles.inputError : ""}`}
                />
                {errors.subjectCode && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.subjectCode}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Subject Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="subjectName"
                  value={form.subjectName}
                  onChange={handleChange}
                  placeholder="e.g. Mathematics"
                  className={`${styles.input} ${errors.subjectName ? styles.inputError : ""}`}
                />
                {errors.subjectName && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.subjectName}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Short Name</label>
                <input
                  name="shortName"
                  value={form.shortName}
                  onChange={handleChange}
                  placeholder="e.g. Math"
                  className={styles.input}
                />
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

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Optional description of the subject"
                  rows={2}
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📊</div>
              <div>
                <h3 className={styles.sectionTitle}>Academic Details</h3>
                <p className={styles.sectionSubtitle}>Grading and credit information</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Credit Hours</label>
                <input
                  name="creditHours"
                  type="number"
                  value={form.creditHours}
                  onChange={handleChange}
                  placeholder="e.g. 3"
                  className={`${styles.input} ${errors.creditHours ? styles.inputError : ""}`}
                />
                {errors.creditHours && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.creditHours}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Pass Mark</label>
                <input
                  name="passMark"
                  type="number"
                  value={form.passMark}
                  onChange={handleChange}
                  placeholder="e.g. 40"
                  className={`${styles.input} ${errors.passMark ? styles.inputError : ""}`}
                />
                {errors.passMark && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.passMark}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Maximum Mark</label>
                <input
                  name="maxMark"
                  type="number"
                  value={form.maxMark}
                  onChange={handleChange}
                  placeholder="e.g. 100"
                  className={`${styles.input} ${errors.maxMark ? styles.inputError : ""}`}
                />
                {errors.maxMark && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.maxMark}
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
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    name="isElective"
                    type="checkbox"
                    checked={form.isElective}
                    onChange={handleChange}
                    className={styles.checkbox}
                  />
                  <span>Is Elective</span>
                </label>
              </div>

              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    name="isLab"
                    type="checkbox"
                    checked={form.isLab}
                    onChange={handleChange}
                    className={styles.checkbox}
                  />
                  <span>Is Lab Subject</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/subjects" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Create Subject"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

