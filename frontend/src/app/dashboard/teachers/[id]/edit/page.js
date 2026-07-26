"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import teacherService from "@/services/teacherService";
import styles from "./edit.module.css";

export default function EditTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState({
    employeeNumber: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    address: "",
    qualification: "",
    designation: "",
    department: "",
    joiningDate: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function loadTeacher() {
      try {
        setLoading(true);
        const data = await teacherService.getTeacherById(params.id);
        setForm({
          employeeNumber: data.employee_number || "",
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          gender: data.gender || "",
          dateOfBirth: data.date_of_birth ? data.date_of_birth.split("T")[0] : "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          qualification: data.qualification || "",
          designation: data.designation || "",
          department: data.department || "",
          joiningDate: data.joining_date ? data.joining_date.split("T")[0] : "",
        });
      } catch (err) {
        setApiError(err.message || "Unable to load teacher");
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadTeacher();
    }
  }, [params]);

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
      errs.email = "Invalid email format";
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
      await teacherService.updateTeacher(params.id, form);
      router.push(`/dashboard/teachers/${params.id}`);
    } catch (err) {
      setApiError(err.message || "Unable to update teacher. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.page}>Loading teacher data...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/teachers">Teachers</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>Edit Teacher</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Edit Teacher</h1>
        <p>Update the teacher&apos;s information.</p>
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
                <label className={styles.label}>Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. +1234567890"
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

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Current residential address"
                  rows={2}
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>💼</div>
              <div>
                <h3 className={styles.sectionTitle}>Employment Details</h3>
                <p className={styles.sectionSubtitle}>Professional and employment information</p>
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
            <Link href={`/dashboard/teachers/${params.id}`} className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Update Teacher"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

