"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import parentService from "@/services/parentService";
import styles from "./new.module.css";

const RELATIONSHIPS = ["FATHER", "MOTHER", "GUARDIAN", "BROTHER", "SISTER", "UNCLE", "AUNT", "OTHER"];

export default function NewParentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    relationship: "GUARDIAN",
    phone: "",
    email: "",
    occupation: "",
    address: "",
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
    if (!form.fullName.trim()) {
      errs.fullName = "Full name is required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Enter a valid email address";
    }
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone.trim())) {
      errs.phone = "Phone must be 7-20 characters";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      await parentService.createParent({
        fullName: form.fullName.trim(),
        relationship: form.relationship,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        occupation: form.occupation.trim() || null,
        address: form.address.trim() || null,
      });
      router.replace("/dashboard/parents");
      router.refresh();
    } catch (err) {
      setApiError(err.message || "Failed to register parent. Please try again.");
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
        <Link href="/dashboard/parents">Parents</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#111827", fontWeight: 500 }}>New Guardian</span>
      </nav>

      <div className={styles.pageHeader}>
        <h1>Register Guardian</h1>
        <p>Add a new parent/guardian contact record to the system.</p>
      </div>

      {apiError ? <div className={styles.errorBanner}>{apiError}</div> : null}

      <form onSubmit={handleSubmit}>
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>
                Full Name<span className={styles.required}>*</span>
              </label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g. Abebe Kebede"
                className={`${styles.input} ${errors.fullName ? styles.inputError : ""}`}
              />
              {errors.fullName && <span className={styles.fieldError}>{errors.fullName}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Relationship</label>
              <select
                name="relationship"
                value={form.relationship}
                onChange={handleChange}
                className={styles.select}
              >
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel.charAt(0) + rel.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Phone Number</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+251 91 234 5678"
                className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
              />
              {errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="guardian@example.com"
                className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              />
              {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Occupation / Profession</label>
              <input
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                placeholder="e.g. Civil Engineer / Accountant"
                className={styles.input}
              />
            </div>

            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.label}>Home Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="e.g. Sub-city, Woreda, House No..."
                rows={3}
                className={styles.textarea}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/dashboard/parents" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? "Saving..." : "Save Guardian"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
