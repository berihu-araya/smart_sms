"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import unitService from "@/services/unitService";
import styles from "../page.module.css";

export default function NewUnitPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "ACTIVE",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
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
    if (!form.name || form.name.trim() === "") errs.name = "Unit name is required";
    if (form.name && form.name.length < 3) errs.name = "Unit name must be at least 3 characters";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      await unitService.createUnit(form);
      router.push("/dashboard/units");
    } catch (err) {
      setApiError(err.message || "Unable to create unit. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div>
        <h1>Create New Unit</h1>
        <p style={{ color: "#667085" }}>Create a new organizational unit to group classes</p>
      </div>

      <div className={styles.formCard}>
        {apiError && (
          <div className={styles.errorBox} style={{ background: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px" }}>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Unit Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Primary Unit, Secondary Unit"
              className={`${styles.select} ${errors.name ? styles.inputError : ""}`}
            />
            {errors.name && <div className={styles.errorText}>{errors.name}</div>}
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe this unit's purpose (e.g., covers Grades 1-5)"
              className={styles.textarea}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Status</label>
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

          <div className={styles.formActions}>
            <Link href="/dashboard/units" className={`${styles.btnSecondary} ${styles.btnCancel}`}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className={styles.btnPrimary}
            >
              {saving ? "Creating..." : "Create Unit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
