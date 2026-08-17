"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import teacherService from "@/services/teacherService";
import styles from "./new.module.css";

const getTodayDateString = () => new Date().toISOString().split("T")[0];

export default function NewTeacherPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    employeeNumber: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    address: "",
    qualification: "",
    designation: "",
    department: "",
    joiningDate: getTodayDateString(),
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

    if (!form.employeeNumber.trim()) {
      errs.employeeNumber = "Employee number is required";
    }
    if (!form.firstName.trim()) {
      errs.firstName = "First name is required";
    }
    if (!form.lastName.trim()) {
      errs.lastName = "Last name is required";
    }
    if (!form.gender) {
      errs.gender = "Gender is required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "A valid email address is required";
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
      await teacherService.createTeacher({
        ...form,
        dateOfBirth: form.dateOfBirth || null,
        joiningDate: form.joiningDate || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        qualification: form.qualification || null,
        designation: form.designation || null,
        department: form.department || null,
      });
      router.push("/dashboard/teachers");
    } catch (err) {
      setApiError(err.message || "Unable to create teacher. Please try again.");
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
        <Link href="/dashboard/teachers">Teachers</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Teacher</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Create Teacher</h1>
        <p>Add a new teacher to the school staff.</p>
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
          {/* Personal Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>👤</div>
              <div>
                <h3 className={styles.sectionTitle}>Personal Information</h3>
                <p className={styles.sectionSubtitle}>Basic personal details of the teacher</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Employee Number<span className={styles.required}>*</span>
                </label>
                <input
                  name="employeeNumber"
                  value={form.employeeNumber}
                  onChange={handleChange}
                  placeholder="e.g. TCH001"
                  className={`${styles.input} ${errors.employeeNumber ? styles.inputError : ""}`}
                />
                {errors.employeeNumber && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.employeeNumber}
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
                  placeholder="e.g. John"
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
                  placeholder="e.g. Doe"
                  className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                />
                {errors.lastName && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.lastName}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Gender<span className={styles.required}>*</span>
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={`${styles.select} ${errors.gender ? styles.inputError : ""}`}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.gender && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.gender}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Date of Birth</label>
                <input
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. john.doe@school.com"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                />
                {errors.email && (
                  <span className={styles.fieldError}>
                    <span>✕</span> {errors.email}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. +1234567890"
                  className={styles.input}
                />
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Optional residential address"
                  rows={2}
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>💼</div>
              <div>
                <h3 className={styles.sectionTitle}>Employment Information</h3>
                <p className={styles.sectionSubtitle}>Professional and employment details</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Qualification</label>
                <input
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  placeholder="e.g. M.Sc. Mathematics"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Designation</label>
                <input
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="e.g. Senior Teacher"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Department</label>
                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. Mathematics"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Joining Date</label>
                <input
                  name="joiningDate"
                  type="date"
                  value={form.joiningDate}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/teachers" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Create Teacher"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

