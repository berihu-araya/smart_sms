"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import sectionService from "@/services/sectionService";
import gradeService from "@/services/gradeService";
import styles from "./new.module.css";

export default function NewSectionPage() {
  const router = useRouter();
  const [grades, setGrades] = useState([]);
  const [form, setForm] = useState({
    name: "",
    gradeId: "",
    roomNumber: "",
    capacity: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function loadGrades() {
      try {
        const data = await gradeService.listGrades({ limit: 100 });
        setGrades(data.items || []);
      } catch (err) {
        console.warn("Could not load grades:", err.message);
      }
    }
    loadGrades();
  }, []);

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
      errs.name = "Section name is required";
    }
    if (form.capacity && (Number(form.capacity) < 1 || Number.isNaN(Number(form.capacity)))) {
      errs.capacity = "Capacity must be a positive number";
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
      await sectionService.createSection({
        ...form,
        capacity: form.capacity ? Number(form.capacity) : null,
      });
      router.push("/dashboard/sections");
    } catch (err) {
      setApiError(err.message || "Unable to create section. Please check the form and try again.");
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
        <Link href="/dashboard/sections">Sections</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Section</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Create Section</h1>
        <p>Add a new class section with grade assignment and capacity.</p>
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
          {/* Section Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>🏫</div>
              <div>
                <h3 className={styles.sectionTitle}>Section Details</h3>
                <p className={styles.sectionSubtitle}>Basic information about the section</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Section Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Section A, Grade 10A"
                  className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                />
                {errors.name && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.name}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Grade</label>
                <select
                  name="gradeId"
                  value={form.gradeId}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Select Grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Room Number</label>
                <input
                  name="roomNumber"
                  value={form.roomNumber}
                  onChange={handleChange}
                  placeholder="e.g. 201, Lab-1"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Capacity</label>
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={handleChange}
                  placeholder="e.g. 40"
                  className={`${styles.input} ${errors.capacity ? styles.inputError : ""}`}
                />
                {errors.capacity && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.capacity}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/sections" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Create Section"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

