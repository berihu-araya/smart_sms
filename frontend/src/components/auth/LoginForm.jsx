"use client";// this directive is necessary for Next.js 13+ to indicate that this component should be rendered on the client side

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";// Importing the Link component from Next.js for client-side navigation
import { FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth"; // Importing a custom hook for authentication
import styles from "@/app/login/Login.module.css";

export default function LoginForm() {
  const { login, loading } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) { // Handle input changes
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) { // Handle form submission
    e.preventDefault();

    setError("");

    try {
      await login(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={styles.wrapper}>

      <div className={styles.card}>

        <div className={styles.loginGrid}>
          <div className={styles.logoPanel}>
            <h4>WEL_COME TO 𝐘𝐎𝐘𝐎  ACADEMY</h4>
            <Image
              src="/school-logo-1.png"
              alt="School Logo"
              width={320}
              height={320}
              className={styles.logoImage}
            />
            <h2>𝐘𝐎𝐘𝐎  ACADEMY</h2>
            <p>
              Empowering Administrators, Teachers, Students, and Parents with a
              Smarter, Faster, and Connected School Management Experience.
            </p>
          </div>

          <div className={styles.formPanel}>
            <h1>Welcome Back</h1>

            <p>
              Sign in to keep your school moving forward.
            </p>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.group}>
                <label htmlFor="email">Email address</label>

                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  placeholder="Enter your email"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.group}>
                <label htmlFor="password">Password</label>

                <div className={styles.passwordField}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    placeholder="Enter your password"
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className={styles.options}>
                <label>
                  <input
                    type="checkbox"
                    name="remember"
                    onChange={handleChange}
                  />
                  Remember me
                </label>

                <Link href="/login/forgot-password">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={styles.loginButton}
              >
                <FiLogIn aria-hidden="true" />
                <span>{loading ? "Signing In..." : "Login"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}