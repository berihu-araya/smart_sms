import Link from "next/link";
import styles from "./page.module.css";

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span>/</span>
        <span>Settings</span>
      </nav>

      <div className={styles.header}>
        <h1>System Settings</h1>
        <p>Manage the configuration used across the school system.</p>
      </div>

      <section className={styles.section}>
        <div>
          <h2>Academic Years</h2>
          <p>Create, activate, and manage school academic years.</p>
        </div>
        <Link href="/dashboard/settings/academic-years" className={styles.link}>
          Open Academic Years
        </Link>
      </section>
    </div>
  );
}
