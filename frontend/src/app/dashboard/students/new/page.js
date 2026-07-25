"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import studentService from "@/services/studentService";
import styles from "./new.module.css";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"];

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    admissionNumber: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    admissionDate: "",
    email: "",
    phone: "",
    parentId: "",
    sectionId: "",
    address: "",
    status: "ACTIVE",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear field-level error on change
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

    if (!form.admissionNumber.trim()) {
      errs.admissionNumber = "Admission number is required";
    }
    if (!form.firstName.trim()) {
      errs.firstName = "First name is required";
    }
    if (!form.lastName.trim()) {
      errs.lastName = "Last name is required";
    }
    if (!form.admissionDate) {
      errs.admissionDate = "Admission date is required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Enter a valid email address (e.g., name@domain.com)";
    }
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone.trim())) {
      errs.phone = "Phone must be 7-20 characters (digits, spaces, dashes, +, or parentheses)";
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
      await studentService.createStudent(form);
      router.push("/dashboard/students");
    } catch (err) {
      setApiError(err.message || "Unable to create student. Please check the form and try again.");
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
        <Link href="/dashboard/students">Students</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Student</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Create Student</h1>
        <p>Register a new student record with personal, contact, and academic details.</p>
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
          {/* Section 1: Personal Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>👤</div>
              <div>
                <h3 className={styles.sectionTitle}>Personal Information</h3>
                <p className={styles.sectionSubtitle}>Basic details about the student</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Admission Number<span className={styles.required}>*</span>
                </label>
                <input
                  name="admissionNumber"
                  value={form.admissionNumber}
                  onChange={handleChange}
                  placeholder="e.g. STU-2024-001"
                  className={`${styles.input} ${errors.admissionNumber ? styles.inputError : ""}`}
                />
                {errors.admissionNumber && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.admissionNumber}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  First Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                />
                {errors.firstName && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.firstName}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Last Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                />
                {errors.lastName && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.lastName}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Admission Date<span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="admissionDate"
                  value={form.admissionDate}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.admissionDate ? styles.inputError : ""}`}
                />
                {errors.admissionDate && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.admissionDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📞</div>
              <div>
                <h3 className={styles.sectionTitle}>Contact Details</h3>
                <p className={styles.sectionSubtitle}>Email and phone information for the student</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="john.doe@school.edu"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                />
                {errors.email && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.email}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                />
                {errors.phone && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.phone}
                  </span>
                )}
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Main Street, City, State, ZIP"
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Academic Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>🏫</div>
              <div>
                <h3 className={styles.sectionTitle}>Academic Information</h3>
                <p className={styles.sectionSubtitle}>Section, parent, and status details</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Section ID</label>
                <input
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                  placeholder="UUID of the section"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Parent ID</label>
                <input
                  name="parentId"
                  value={form.parentId}
                  onChange={handleChange}
                  placeholder="UUID of the parent"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/students" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 5.5V12.5C13.5 12.8978 13.342 13.2794 13.0607 13.5607C12.7794 13.842 12.3978 14 12 14H4C3.60218 14 3.22064 13.842 2.93934 13.5607C2.65804 13.2794 2.5 12.8978 2.5 12.5V3.5C2.5 3.10218 2.65804 2.72064 2.93934 2.43934C3.22064 2.15804 3.60218 2 4 2H10.5L13.5 5.5Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 14V10H11V14M10.5 2V5.5H13.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Save Student
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

