"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiSparkles,
  HiCheckCircle,
  HiXMark,
  HiArrowRight,
  HiUserGroup,
  HiChatBubbleBottomCenterText,
  HiDocumentText,
  HiClock,
  HiCreditCard,
  HiCalendarDays,
  HiShieldCheck,
  HiChartBar,
} from "react-icons/hi2";
import styles from "./features.module.css";

const CATEGORIES = [
  { id: "all", label: "All Modules" },
  { id: "sis", label: "Student Records (SIS)" },
  { id: "sms", label: "SMS Automation" },
  { id: "grading", label: "Gradebook & Reports" },
  { id: "attendance", label: "Attendance & Roll Call" },
  { id: "finance", label: "Fee & Financial Billing" },
  { id: "timetable", label: "Timetable Scheduling" },
];

const MODULE_DETAILS = [
  {
    id: "sis",
    category: "sis",
    tag: "Core SIS",
    title: "Student Information System (SIS)",
    description:
      "A single source of truth for all student data, from first enrollment to graduation. Replace messy filing cabinets with encrypted, searchable digital profiles.",
    capabilities: [
      "Instant student registration with photo, guardian contacts, and medical history",
      "Dynamic grade level & section assignments with automatic capacity checks",
      "Family & guardian linking to connect multiple siblings under one parent portal",
      "Bulk CSV/Excel student roster onboarding with validation rules",
      "Comprehensive digital audit logs tracking all student record updates",
    ],
    previewTitle: "SIS Live Record Card",
    previewBadge: "Verified Student",
    previewRows: [
      { label: "Student ID", val: "STU-2026-0842" },
      { label: "Full Name", val: "Liya Bekele", isVal: true },
      { label: "Grade & Section", val: "Grade 10 - Section B" },
      { label: "Primary Guardian", val: "Bekele Haile (+251 91 123 4567)" },
      { label: "Enrollment Status", val: "Active (Term 2)", isSuccess: true },
    ],
  },
  {
    id: "sms",
    category: "sms",
    tag: "Real-Time Dispatch",
    title: "Smart SMS Automation & Alerts",
    description:
      "Enterprise-grade SMS engine that transforms school events into instant parent notifications with zero manual effort from staff.",
    capabilities: [
      "Zero-delay carrier routing across regional and international mobile networks",
      "Event-driven automation triggered by attendance, exam scores, and fee payments",
      "Customizable templates with personalized merge tags ({{student_name}}, {{marks}}, {{balance}})",
      "Emergency mass broadcast tool to notify thousands of guardians in under 10 seconds",
      "Full delivery receipt logging with timestamps and carrier confirmation status",
    ],
    previewTitle: "SMS Dispatch Engine",
    previewBadge: "Carrier Connected",
    previewRows: [
      { label: "Sender Identifier", val: "YOYO-ACADEMY", isGold: true },
      { label: "Average Dispatch Latency", val: "0.42 seconds", isSuccess: true },
      { label: "Carrier Route", val: "Tier-1 Direct Route (100% Uptime)" },
      { label: "Last Mass Broadcast", val: "1,480 / 1,480 SMS Delivered" },
      { label: "Delivery Success Rate", val: "99.98%", isSuccess: true },
    ],
  },
  {
    id: "grading",
    category: "grading",
    tag: "Academic Desk",
    title: "Dynamic Gradebook & Digital Report Cards",
    description:
      "A flexible, modern academic assessment platform supporting continuous assessments, term examinations, auto-calculated GPAs, and official PDF transcripts.",
    capabilities: [
      "Configurable assessment weighting (e.g. 20% Quiz, 30% Midterm, 50% Final)",
      "Automated total mark calculation, letter grade mapping, and class rankings",
      "Instant printable PDF report cards with school crest, remarks, and signatures",
      "Teacher progress tracker to monitor submission deadlines across all departments",
      "Historic academic transcripts stored securely across all academic years",
    ],
    previewTitle: "Academic Performance Matrix",
    previewBadge: "Term 2 Finalized",
    previewRows: [
      { label: "Class Roster", val: "Grade 10B (42 Students)" },
      { label: "Class Average Score", val: "88.4%", isSuccess: true },
      { label: "Passing Rate", val: "100%", isSuccess: true },
      { label: "Highest Subject", val: "Physics (98% - Alex S.)" },
      { label: "Report Cards", val: "Generated & Signed (PDF)", isGold: true },
    ],
  },
  {
    id: "attendance",
    category: "attendance",
    tag: "Instant Check-In",
    title: "Classroom Attendance & Absence Logs",
    description:
      "Take daily roll call in seconds from any smartphone or tablet. Automatically alert guardians if their child is absent or late before 9:00 AM.",
    capabilities: [
      "Ultra-fast roll call UI with one-tap 'Mark All Present' and individual toggles",
      "Automatic trigger sending SMS absence alerts to parents within 60 seconds",
      "Subject-wise and period-wise attendance tracking for senior grade levels",
      "Monthly and termly student attendance percentage calculations",
      "Excused vs. unexcused absence management with guardian reason notes",
    ],
    previewTitle: "Daily Attendance Console",
    previewBadge: "Today: 98.6%",
    previewRows: [
      { label: "Total Roll Call", val: "1,482 Enrolled Students" },
      { label: "Marked Present", val: "1,461 Students", isSuccess: true },
      { label: "Unexcused Absences", val: "21 (Guardian SMS Sent)", isGold: true },
      { label: "Late Arrivals", val: "4 Students Logged" },
      { label: "Attendance Status", val: "Completed (08:30 AM)", isSuccess: true },
    ],
  },
  {
    id: "finance",
    category: "finance",
    tag: "Billing & Cashflow",
    title: "Fee Billing & Financial Ledgers",
    description:
      "Maintain crystal-clear institutional accounting with automated tuition billing, partial payment tracking, digital receipt generation, and SMS alerts.",
    capabilities: [
      "Custom fee structures for tuition, laboratory, transportation, and extracurriculars",
      "Flexible installment plans with automated reminder SMS prior to due dates",
      "Instant SMS payment receipts issued to parent's phone upon cashier entry",
      "Comprehensive cashier reconciliation sheets and daily revenue reports",
      "Role-based financial security allowing only authorized accountants to edit ledger",
    ],
    previewTitle: "Finance & Invoice Ledger",
    previewBadge: "Term 2 Collection",
    previewRows: [
      { label: "Total Invoiced", val: "ETB 4,250,000" },
      { label: "Total Collected", val: "ETB 4,029,000 (94.8%)", isSuccess: true },
      { label: "Pending Installments", val: "ETB 221,000" },
      { label: "Receipts Issued", val: "1,240 Digital Receipts" },
      { label: "Ledger Reconciliation", val: "100% Balanced", isGold: true },
    ],
  },
  {
    id: "timetable",
    category: "timetable",
    tag: "Smart Scheduling",
    title: "Timetable & Resource Scheduling Engine",
    description:
      "Create perfect, clash-free master schedules for classes, teachers, laboratories, and halls in a fraction of the time.",
    capabilities: [
      "Automated conflict detection to prevent double-booking teachers or classrooms",
      "Subject period distribution balancing heavy subjects across morning periods",
      "Dedicated personalized timetable views for teachers and students",
      "Printable weekly schedules in PDF format for classroom notice boards",
      "Room and laboratory capacity management",
    ],
    previewTitle: "Timetable Master Matrix",
    previewBadge: "0 Conflicts",
    previewRows: [
      { label: "Active Classrooms", val: "36 Rooms + 4 Science Labs" },
      { label: "Teacher Schedules", val: "68 Faculty Allocated", isSuccess: true },
      { label: "Periods per Week", val: "35 Periods per Grade" },
      { label: "Conflict Checks", val: "Passed (100% Validated)", isSuccess: true },
      { label: "Schedule Export", val: "Ready (PDF & Web View)", isGold: true },
    ],
  },
];

export default function FeaturesClient() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredModules =
    activeCategory === "all"
      ? MODULE_DETAILS
      : MODULE_DETAILS.filter((m) => m.category === activeCategory);

  return (
    <div className={styles.featuresPage}>
      {/* 1. HERO HEADER */}
      <section className={styles.featuresHero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrowTag}>
              <HiSparkles /> Enterprise Feature Suite
            </span>
            <h1 className={styles.heroTitle}>
              Engineered to Power Every Aspect of Your <span className={styles.goldText}>Institution</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Explore our modular school management ecosystem. Designed to replace disconnected tools with one robust, automated, and secure system.
            </p>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY FILTER TABS */}
      <section className={styles.filterSection}>
        <div className={styles.container}>
          <div className={styles.filterTabs}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.filterBtn} ${
                  activeCategory === cat.id ? styles.filterActive : ""
                }`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. DETAILED MODULE SHOWCASE */}
      <section className={styles.modulesContainer}>
        <div className={styles.container}>
          <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
            {filteredModules.map((mod) => (
              <div key={mod.id} id={mod.id} className={styles.featureModuleBlock}>
                {/* Left: Info */}
                <div className={styles.moduleInfoCol}>
                  <span className={styles.moduleTag}>{mod.tag}</span>
                  <h2 className={styles.moduleHeading}>{mod.title}</h2>
                  <p className={styles.moduleDescription}>{mod.description}</p>
                  <ul className={styles.capabilitiesList}>
                    {mod.capabilities.map((cap, idx) => (
                      <li key={idx}>
                        <HiCheckCircle className={styles.checkIcon} />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: Realistic Card Visual */}
                <div className={styles.moduleVisualCol}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>
                      <HiShieldCheck /> {mod.previewTitle}
                    </span>
                    <span className={styles.cardBadge}>{mod.previewBadge}</span>
                  </div>
                  <div className={styles.cardBody}>
                    {mod.previewRows.map((row, idx) => (
                      <div key={idx} className={styles.mockRow}>
                        <span className={styles.mockLabel}>{row.label}</span>
                        <span
                          className={
                            row.isSuccess
                              ? styles.mockSuccess
                              : row.isGold
                              ? styles.mockGold
                              : styles.mockValue
                          }
                        >
                          {row.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. COMPARISON TABLE */}
      <section className={styles.comparisonSection}>
        <div className={styles.container}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 className={styles.heroTitle} style={{ fontSize: "2.2rem" }}>
              Traditional Methods vs. <span className={styles.goldText}>Smart SMS</span>
            </h2>
            <p className={styles.heroSubtitle} style={{ marginTop: "8px" }}>
              See why modern educational institutions make the switch.
            </p>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.compTable}>
              <thead>
                <tr>
                  <th>School Workflow</th>
                  <th>Traditional / Spreadsheets</th>
                  <th className={styles.thGold}>Smart SMS Platform</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Parent Absence Notification</strong>
                  </td>
                  <td className={styles.crossText}>
                    <HiXMark /> Manual phone calls or next-day paper notices
                  </td>
                  <td className={styles.checkText}>
                    <HiCheckCircle /> Instant automated SMS within 60 seconds
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Report Card Calculations</strong>
                  </td>
                  <td className={styles.crossText}>
                    <HiXMark /> Days of manual spreadsheet calculation & printing
                  </td>
                  <td className={styles.checkText}>
                    <HiCheckCircle /> Instant GPA calculation with 1-click PDF transcripts
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Tuition Fee Tracking</strong>
                  </td>
                  <td className={styles.crossText}>
                    <HiXMark /> Lost paper receipts & uncoordinated bank slips
                  </td>
                  <td className={styles.checkText}>
                    <HiCheckCircle /> Digital ledger, automated SMS receipts & balance alerts
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Timetable Generation</strong>
                  </td>
                  <td className={styles.crossText}>
                    <HiXMark /> Weeks of manual trial-and-error scheduling
                  </td>
                  <td className={styles.checkText}>
                    <HiCheckCircle /> Clash-free engine with teacher & room validation
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Data Security & Backup</strong>
                  </td>
                  <td className={styles.crossText}>
                    <HiXMark /> Vulnerable to local PC crashes and loss
                  </td>
                  <td className={styles.checkText}>
                    <HiCheckCircle /> 256-bit encrypted cloud storage & daily backups
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className={styles.featuresCta}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Ready to Experience These Features Live?</h2>
            <p className={styles.ctaDesc}>
              Schedule a personalized walkthrough tailored to your school's grade levels and administrative requirements.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className={styles.ctaPrimary}>
                <span>Book a Guided Walkthrough</span>
                <HiArrowRight />
              </Link>
              <Link href="/login" className={styles.ctaSecondary}>
                Access School Portal
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
