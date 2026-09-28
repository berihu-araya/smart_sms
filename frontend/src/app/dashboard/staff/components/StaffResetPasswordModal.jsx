"use client";

import { useState, useMemo } from "react";
import {
  HiKey,
  HiLockClosed,
  HiEye,
  HiEyeSlash,
  HiSparkles,
  HiExclamationCircle,
  HiArrowPath,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import { resetStaffPassword } from "../staff.service";
import styles from "./StaffResetPasswordModal.module.css";

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

export default function StaffResetPasswordModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => calculatePasswordStrength(newPassword), [newPassword]);

  if (!staff) return null;

  const initials = `${(staff.first_name || "")[0] || ""}${(staff.last_name || "")[0] || ""}`.toUpperCase() || "S";
  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Staff Member";

  const handleGenerate = () => {
    const p = generateRandomPassword();
    setNewPassword(p);
    setShowPassword(true);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await resetStaffPassword(staff.id, newPassword);
      onSuccess?.(`Password for ${fullName} reset successfully!`);
      setNewPassword("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Staff Password"
      subtitle="Issue a new login password for this staff account"
      icon={HiKey}
      size="sm"
    >
      <form onSubmit={handleSubmit} className={styles.container}>
        {/* User preview banner */}
        <div className={styles.userBanner}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{fullName}</span>
            <span className={styles.userEmail}>{staff.email}</span>
          </div>
        </div>

        {error && (
          <div className={styles.alertError}>
            <HiExclamationCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.formGroup}>
          <div className={styles.labelRow}>
            <label className={styles.label}>New Password *</label>
            <button
              type="button"
              className={styles.generateBtn}
              onClick={handleGenerate}
            >
              <HiSparkles />
              <span>Generate</span>
            </button>
          </div>

          <div className={styles.inputWrapper}>
            <HiLockClosed className={styles.inputIcon} />
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter at least 6 characters"
              className={styles.input}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError("");
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

          {newPassword && (
            <div className={styles.passwordStrengthWrap}>
              <div className={styles.strengthBarContainer}>
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={styles.strengthSegment}
                    style={{
                      backgroundColor:
                        strength.score >= step ? strength.color : "#e2e8f0",
                    }}
                  />
                ))}
              </div>
              <div className={styles.strengthLabel}>
                <span>Strength: <strong>{strength.label}</strong></span>
                {showPassword && <span style={{ color: "#2563eb" }}>Visible</span>}
              </div>
            </div>
          )}
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
                <HiArrowPath className={styles.spinner} size={16} />
                <span>Resetting...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
