"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import subjectService from "@/services/subjectService";
import styles from "./edit.module.css";

export default function EditSubjectPage() {
  const params = useParams(); // Get the subject ID from the URL parameters
  const router = useRouter(); // Get the router object for navigation
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
  }); // Form state for subject details
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function loadSubject() {
      try {
        setLoading(true);
        const data = await subjectService.getSubjectById(params.id);
        setForm({
          subjectCode: data.subject_code || "",
          subjectName: data.subject_name || "",
          shortName: data.short_name || "",
          description: data.description || "",
          creditHours: data.credit_hours ?? "",
          passMark: data.pass_mark ?? "",
          maxMark: data.max_mark ?? "",
          isElective: data.is_elective || false,
          isLab: data.is_lab || false,
          displayOrder: data.display_order ?? "",
          status: data.status || "ACTIVE",
        });
      } catch (err) {
        setApiError(err.message || "Unable to load subject");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadSubject();
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
      await subjectService.updateSubject(params.id, {
        subject_code: form.subjectCode,
        subject_name: form.subjectName,
        short_name: form.shortName || null,
        description: form.description || null,
        credit_hours: form.creditHours || null,
        pass_mark: form.passMark || null,
        max_mark: form.maxMark || null,
        is_elective: form.isElective,
        is_lab: form.isLab,
        display_order: form.displayOrder || null,
        status: form.status,
      });
      router.push(`/dashboard/subjects/${params.id}`);
    } catch (err) {
      setApiError(err.message || "Unable to update subject. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.page}>Loading subject data...</div>;
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/subjects">Subjects</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>Edit Subject</span>
      </nav>

      <div className={styles.pageHeader}>
        <h1>Edit Subject</h1>
        <p>Update the subject information.</p>
      </div>

      {apiError ? (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{apiError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className={styles.formCard}>
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

          <div className={styles.actions}>
            <Link href={`/dashboard/subjects/${params.id}`} className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Update Subject"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

