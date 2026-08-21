"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import authService from "@/services/authService";
import styles from "@/app/signup/Signup.module.css";

const ROLE_OPTIONS = [
  { value: "Teacher", label: "👨‍🏫 Teacher (Classrooms, Grading & Attendance)" },
  { value: "Student", label: "🎓 Student (Timetable, Lessons & Results)" },
  { value: "Parent", label: "👨‍👩‍👧 Parent (Child Monitoring & Fees)" },
  { value: "School Admin", label: "👑 School Admin (Complete System Control)" },
  { value: "Staff", label: "👔 Staff (Administrative & Support Staff)" },
];

export default function SignupForm() {
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "Teacher",
    password: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isAdmin =
    user?.role?.toLowerCase() === "school admin" ||
    user?.role?.toLowerCase() === "admin";

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError("");
    setSuccessMessage("");
    setFieldErrors({});

    if (!form.fullName || form.fullName.trim().length < 2) {
      setFieldErrors((prev) => ({
        ...prev,
        fullName: "Full name must be at least 2 characters",
      }));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }));
      return;
    }

    setSubmitting(true);

    try {
      const response = await authService.register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      setSuccessMessage(
        `User "${response.user.name || form.fullName}" with role "${response.user.role || form.role}" created successfully!`
      );

      // Reset form fields
      setForm({
        fullName: "",
        email: "",
        phone: "",
        role: "Teacher",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      setGeneralError(err.message || "Failed to create user account.");
    } finally {
      setSubmitting(false);
    }
  }

  // Guard: If not logged in as Admin, show access requirement
  if (!authLoading && !isAdmin) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card} style={{ maxWidth: "600px" }}>
          <div className={styles.formPanel}>
            <div className={styles.guardContainer}>
              <div className={styles.guardIcon}>🛡️</div>
              <h2 className={styles.guardTitle}>Admin Authorization Required</h2>
              <p className={styles.guardMessage}>
                User registration is restricted to system administrators. Please log in with a School Admin account to create new users.
              </p>
              <Link href="/login" className={styles.guardButton}>
                Log In as Administrator
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.signupGrid}>
          {/* Left Branding & Info Panel */}
          <div className={styles.logoPanel}>
            <div className={styles.logoPanelTop}>
              <h4>ADMIN USER MANAGEMENT</h4>
              <Image
                src="/school-logo-1.png"
                alt="School Logo"
                width={160}
                height={160}
                className={styles.logoImage}
                priority
              />
              <h2>Create User Account</h2>
              <p>
                Provision system accounts for teachers, students, parents, and administrative staff.
              </p>
            </div>

            <ul className={styles.featureList}>
              <li>
                <span className={styles.featureIcon}>👑</span>
                <span>Role-based permissions & security</span>
              </li>
              <li>
                <span className={styles.featureIcon}>🔗</span>
                <span>Automatic profile & data linking</span>
              </li>
              <li>
                <span className={styles.featureIcon}>⚡</span>
                <span>Instant credentials activation</span>
              </li>
            </ul>
          </div>

          {/* Right Form Panel */}
          <div className={styles.formPanel}>
            <div className={styles.formHeader}>
              <span className={styles.adminBadge}>
                <span>🔒</span>
                <span>Administrator Controlled</span>
              </span>
              <h1>Register New User</h1>
              <p>Fill in user details and assign an appropriate system role</p>
            </div>

            {generalError && (
              <div className={styles.errorAlert}>
                <span>⚠️</span>
                <span>{generalError}</span>
              </div>
            )}

            {successMessage && (
              <div className={styles.successAlert}>
                <span>✅</span>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className={styles.group}>
                <label htmlFor="fullName">
                  Full Name <span className={styles.required}>*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  placeholder="e.g. Sarah Jenkins"
                  onChange={handleChange}
                  className={fieldErrors.fullName ? styles.inputError : ""}
                  required
                />
                {fieldErrors.fullName && (
                  <span className={styles.fieldError}>{fieldErrors.fullName}</span>
                )}
              </div>

              {/* Role Selection Dropdown */}
              <div className={styles.group}>
                <label htmlFor="role">
                  User Role <span className={styles.required}>*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={styles.selectInput}
                  required
                >
                  {ROLE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.role && (
                  <span className={styles.fieldError}>{fieldErrors.role}</span>
                )}
              </div>

              {/* Email & Phone */}
              <div className={styles.row}>
                <div className={styles.group}>
                  <label htmlFor="email">
                    Email Address <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    placeholder="user@school.com"
                    onChange={handleChange}
                    className={fieldErrors.email ? styles.inputError : ""}
                    required
                  />
                  {fieldErrors.email && (
                    <span className={styles.fieldError}>{fieldErrors.email}</span>
                  )}
                </div>

                <div className={styles.group}>
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    placeholder="+251 91 234 5678"
                    onChange={handleChange}
                    className={fieldErrors.phone ? styles.inputError : ""}
                  />
                  {fieldErrors.phone && (
                    <span className={styles.fieldError}>{fieldErrors.phone}</span>
                  )}
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className={styles.row}>
                <div className={styles.group}>
                  <label htmlFor="password">
                    Password <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={form.password}
                    placeholder="Minimum 8 characters"
                    onChange={handleChange}
                    className={fieldErrors.password ? styles.inputError : ""}
                    required
                    minLength={8}
                  />
                  {fieldErrors.password && (
                    <span className={styles.fieldError}>{fieldErrors.password}</span>
                  )}
                </div>

                <div className={styles.group}>
                  <label htmlFor="confirmPassword">
                    Confirm Password <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    placeholder="Confirm password"
                    onChange={handleChange}
                    className={fieldErrors.confirmPassword ? styles.inputError : ""}
                    required
                  />
                  {fieldErrors.confirmPassword && (
                    <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={styles.signupButton}
              >
                {submitting ? "Creating User..." : `Create ${form.role} Account`}
              </button>

              <div className={styles.footerLinks}>
                <Link href="/dashboard" className={styles.dashboardLink}>
                  ← Back to Dashboard
                </Link>
                <Link href="/dashboard/settings/roles" className={styles.dashboardLink}>
                  Manage Roles & Permissions →
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
