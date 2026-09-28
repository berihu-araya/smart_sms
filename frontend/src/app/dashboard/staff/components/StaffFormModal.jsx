"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HiUser,
  HiEnvelope,
  HiPhone,
  HiLockClosed,
  HiShieldCheck,
  HiEye,
  HiEyeSlash,
  HiExclamationCircle,
  HiCheckCircle,
  HiSparkles,
  HiArrowPath,
} from "react-icons/hi2";
import { FaUserPlus, FaUserPen } from "react-icons/fa6";
import Modal from "@/components/common/Modal";
import { createStaff, updateStaff, getStaffById } from "../staff.service";
import styles from "./StaffFormModal.module.css";

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: "None", color: "#e2e8f0" };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak (min 6 chars)", color: "#ef4444" };
  if (score <= 3) return { score: 2, label: "Medium", color: "#f59e0b" };
  if (score <= 4) return { score: 3, label: "Good", color: "#3b82f6" };
  return { score: 4, label: "Strong & Secure", color: "#10b981" };
}

function generateRandomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function StaffFormModal({
  isOpen,
  onClose,
  staffId = null,
  roles = [],
  onSuccess,
}) {
  const isEdit = Boolean(staffId);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roleId: "",
    password: "",
    status: "ACTIVE",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [apiError, setApiError] = useState("");

  // Populate roles default or load user on edit
  useEffect(() => {
    if (!isOpen) return;

    setApiError("");
    setErrors({});
    setShowPassword(false);

    if (isEdit && staffId) {
      async function fetchUserDetails() {
        try {
          setLoadingInitial(true);
          const user = await getStaffById(staffId);
          setFormData({
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            email: user.email || "",
            phone: user.phone || "",
            roleId: user.role_id || (roles[0]?.id || ""),
            password: "",
            status: user.status || "ACTIVE",
          });
        } catch (err) {
          setApiError(err.message || "Failed to load staff details.");
        } finally {
          setLoadingInitial(false);
        }
      }
      fetchUserDetails();
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        roleId: roles[0]?.id || "",
        password: "",
        status: "ACTIVE",
      });
    }
  }, [isOpen, isEdit, staffId, roles]);

  const passwordStrength = useMemo(
    () => calculatePasswordStrength(formData.password),
    [formData.password]
  );

  const handleGeneratePassword = () => {
    const newPass = generateRandomPassword();
    setFormData((prev) => ({ ...prev, password: newPass }));
    setShowPassword(true);
    setErrors((prev) => ({ ...prev, password: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim() || formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters.";
    }
    if (!formData.lastName.trim() || formData.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters.";
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!formData.roleId) {
      newErrors.roleId = "Please select an assigned role.";
    }
    if (!isEdit) {
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = "Initial password must be at least 6 characters.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");

    try {
      if (isEdit) {
        await updateStaff(staffId, formData);
      } else {
        await createStaff(formData);
      }

      onSuccess?.(isEdit ? "Staff member updated successfully!" : "Staff member created successfully!");
      onClose();
    } catch (err) {
      setApiError(err.message || "An error occurred while saving staff details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Staff Member" : "Add New Staff Member"}
      subtitle={
        isEdit
          ? "Update account details, contact info, or assigned role."
          : "Create a staff, coordinator, or administrative officer account."
      }
      icon={isEdit ? FaUserPen : FaUserPlus}
      size="lg"
    >
      {loadingInitial ? (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
          <HiArrowPath className={styles.spinner} style={{ fontSize: "2rem", marginBottom: "0.5rem" }} />
          <p>Loading staff information...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.formContainer} noValidate>
          {apiError && (
            <div className={styles.alertError}>
              <HiExclamationCircle />
              <span>{apiError}</span>
            </div>
          )}

          <div className={styles.formGrid}>
            {/* First Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                First Name <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <HiUser className={styles.inputIcon} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel"
                  className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (errors.firstName) setErrors({ ...errors, firstName: null });
                  }}
                />
              </div>
              {errors.firstName && <span className={styles.fieldError}>{errors.firstName}</span>}
            </div>

            {/* Last Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Last Name <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <HiUser className={styles.inputIcon} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Vance"
                  className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                  value={formData.lastName}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (errors.lastName) setErrors({ ...errors, lastName: null });
                  }}
                />
              </div>
              {errors.lastName && <span className={styles.fieldError}>{errors.lastName}</span>}
            </div>

            {/* Official Email */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Official Email Address <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <HiEnvelope className={styles.inputIcon} />
                <input
                  type="email"
                  required
                  placeholder="staff@school.edu"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                />
              </div>
              {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
            </div>

            {/* Phone Number */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Phone Number</label>
              <div className={styles.inputWrapper}>
                <HiPhone className={styles.inputIcon} />
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className={styles.input}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Role Selection Dropdown */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                Assigned Role <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <HiShieldCheck className={styles.inputIcon} />
                <select
                  required
                  className={`${styles.select} ${errors.roleId ? styles.inputError : ""}`}
                  value={formData.roleId}
                  onChange={(e) => {
                    setFormData({ ...formData, roleId: e.target.value });
                    if (errors.roleId) setErrors({ ...errors, roleId: null });
                  }}
                >
                  <option value="" disabled>
                    -- Select a Role --
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.description ? `(${r.description})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {errors.roleId && <span className={styles.fieldError}>{errors.roleId}</span>}
            </div>

            {/* Password (only on create) */}
            {!isEdit && (
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className={styles.label}>
                    Initial Password <span className={styles.required}>*</span>
                  </label>
                  <button
                    type="button"
                    className={styles.generateBtn}
                    onClick={handleGeneratePassword}
                  >
                    <HiSparkles style={{ verticalAlign: "middle", marginRight: "3px" }} />
                    Generate Strong Password
                  </button>
                </div>
                <div className={styles.inputWrapper}>
                  <HiLockClosed className={styles.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter at least 6 characters"
                    className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
                  </button>
                </div>
                {errors.password && <span className={styles.fieldError}>{errors.password}</span>}

                {/* Password Strength Meter */}
                {formData.password && (
                  <div className={styles.passwordStrengthWrap}>
                    <div className={styles.strengthBarContainer}>
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={styles.strengthSegment}
                          style={{
                            backgroundColor:
                              passwordStrength.score >= step ? passwordStrength.color : "#e2e8f0",
                          }}
                        />
                      ))}
                    </div>
                    <div className={styles.strengthLabel}>
                      <span>Strength: <strong>{passwordStrength.label}</strong></span>
                      {showPassword && <span style={{ color: "#2563eb" }}>Visible</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status (ACTIVE / INACTIVE) */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Account Status</label>
              <div className={styles.statusPillGroup}>
                <div
                  className={`${styles.statusPill} ${
                    formData.status === "ACTIVE" ? styles.statusPillActive : ""
                  }`}
                  onClick={() => setFormData({ ...formData, status: "ACTIVE" })}
                >
                  <HiCheckCircle size={18} />
                  <span>Active (Can sign in)</span>
                </div>
                <div
                  className={`${styles.statusPill} ${
                    formData.status === "INACTIVE" ? styles.statusPillInactive : ""
                  }`}
                  onClick={() => setFormData({ ...formData, status: "INACTIVE" })}
                >
                  <span>Inactive (Suspended)</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <HiArrowPath className={styles.spinner} size={18} />
                  <span>{isEdit ? "Saving..." : "Creating..."}</span>
                </>
              ) : (
                <span>{isEdit ? "Save Changes" : "Create Staff Account"}</span>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
