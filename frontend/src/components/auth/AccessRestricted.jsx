"use client";

import Link from "next/link";
import { FaLock } from "react-icons/fa";
import styles from "./AccessRestricted.module.css";

export default function AccessRestricted() {
  return (
    <section className={styles.container} role="alert" aria-live="polite">
      <div className={styles.icon} aria-hidden="true">
        <FaLock />
      </div>
      <h1 className={styles.title}>This area is locked</h1>
      <p className={styles.message}>
        Your account does not have permission to view this area.
      </p>
      <Link href="/dashboard" className={styles.button}>
        Return to dashboard
      </Link>
    </section>
  );
}