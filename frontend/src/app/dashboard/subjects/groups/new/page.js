"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import subjectGroupService from "@/services/subjectGroupService";
import styles from "./new.module.css";

export default function NewSubjectGroupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    groupName: "",
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

    if (!form.groupName.trim()) {
      errs.groupName = "Group name is required";
    } else if (form.groupName.trim().length < 2) {
      errs.groupName = "Group name must be at least 2 characters";
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
      await subjectGroupService.createGroup({
        group_name: form.groupName,
        description: form.description || null,
      });
      router.push("/dashboard/subjects/groups");
    } catch (err) {
      setApiError(err.message || "Unable to create group. Please try again.");
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
        <Link href="/dashboard/subjects/groups">Groups</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Group</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Create Subject Group</h1>
        <p>Add a new group to organise subjects.</p>
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
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📁</div>
              <div>
                <h3 className={styles.sectionTitle}>Group Details</h3>
                <p className={styles.sectionSubtitle}>Enter the subject group information</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>
                  Group Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="groupName"
                  value={form.groupName}
                  onChange={handleChange}
                  placeholder="e.g. Science Subjects, Languages"
                  className={`${styles.input} ${errors.groupName ? styles.inputError : ""}`}
                />
                {errors.groupName && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.groupName}
                  </span>
                )}
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Optional description for this group"
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/subjects/groups" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

