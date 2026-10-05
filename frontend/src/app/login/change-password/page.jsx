"use client";

import { useState } from "react";
import Link from "next/link";
import authService from "@/services/authService";
import styles from "./ChangePassword.module.css";

export default function ChangePasswordPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previousForm) => ({ ...previousForm, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.currentPassword === form.password) {
      setError("Your new password must be different from your current password.");
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.password,
        confirmPassword: form.confirmPassword,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Unable to change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.wrapper}>
      <section className={styles.card} aria-labelledby="change-password-title">
        <div className={styles.header}>
          <div className={styles.icon} aria-hidden="true">⌁</div>
          <div>
            <p className={styles.eyebrow}>Account security</p>
            <h1 id="change-password-title">Change password</h1>
          </div>
        </div>
        <p className={styles.intro}>Keep your account protected with a password only you know.</p>

        {submitted ? (
          <>
            <div className={styles.success} role="status">
              Your password has been changed successfully.
            </div>
            <Link href="/login/profile" className={styles.submitButton}>
              Return to profile
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <div className={styles.group}>
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                name="currentPassword"
                placeholder="Enter your current password"
                value={form.currentPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your new password"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                required
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Confirm your new password"
                value={form.confirmPassword}
                onChange={handleChange}
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? "Changing..." : "Change Password"}
            </button>

            <Link href="/login/profile" className={styles.backLink}>
              Cancel and return to profile
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
