"use client";

import styles from "./StatusBadge.module.css";

export default function StatusBadge({ status = "ACTIVE" }) {
  const norm = String(status).toUpperCase();

  let styleClass = styles.active;
  let label = "Active";

  if (norm === "INACTIVE" || norm === "DELETED" || norm === "DISABLED") {
    styleClass = styles.inactive;
    label = "Inactive";
  } else if (norm === "ARCHIVED") {
    styleClass = styles.archived;
    label = "Archived";
  }

  return (
    <span className={`${styles.badge} ${styleClass}`}>
      <span className={styles.dot}></span>
      {label}
    </span>
  );
}
