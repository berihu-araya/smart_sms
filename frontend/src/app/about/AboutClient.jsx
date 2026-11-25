"use client";

import Link from "next/link";
import {
  HiSparkles,
  HiShieldCheck,
  HiBolt,
  HiLockClosed,
  HiAcademicCap,
  HiUserGroup,
  HiGlobeAlt,
  HiArrowRight,
  HiCheckCircle,
  HiServerStack,
  HiCalendarDays,
  HiBuildingLibrary,
  HiDocumentCheck,
} from "react-icons/hi2";
import { FaGraduationCap } from "react-icons/fa6";
import styles from "./about.module.css";

const CORE_VALUES = [
  {
    icon: <HiBolt className={styles.valueIcon} />,
    title: "Instant Mobile Telephony",
    desc: "Parent communication cannot afford delays. Our multi-carrier SMS gateway routes critical attendance alerts and payment receipts in under 1.2 seconds with 99.99% uptime.",
  },
  {
    icon: <HiShieldCheck className={styles.valueIcon} />,
    title: "Bank-Grade Financial Integrity",
    desc: "We protect student privacy and school fee records with 256-bit TLS encryption, strict role-based access control (RBAC), and immutable financial audit trails.",
  },
  {
    icon: <HiAcademicCap className={styles.valueIcon} />,
    title: "Educator-First Ergonomics",
    desc: "Software must eliminate friction, not create it. We design tactile interfaces so teachers take daily attendance in 30 seconds and publish term marks effortlessly.",
  },
  {
    icon: <HiGlobeAlt className={styles.valueIcon} />,
    title: "Ethiopian Regulatory Compliance",
    desc: "Built-in support for Ethiopian progressive tax brackets (PAYE), 7% employee and 11% employer pension contributions, and localized academic grading conventions.",
  },
];

const TIMELINE_MILESTONES = [
  {
    year: "Phase 1",
    title: "Foundational SIS & Gradebook Engine",
    desc: "Engineered core student records, digital dossiers, custom GPA weighting, and automated broadsheet ranking for leading academies.",
    status: "Completed",
  },
  {
    year: "Phase 2",
    title: "Multi-Carrier SMS Integration & Parent Alerts",
    desc: "Connected Tier-1 Ethio Telecom and Safaricom gateways to automatically trigger morning attendance and exam results via verified sender IDs.",
    status: "Active & Scaling",
  },
  {
    year: "Phase 3",
    title: "Bursar Ledgers & Ethiopian Progressive Payroll",
    desc: "Added bank slip reconciliation, fee invoicing, and automated monthly payroll with Ethiopian tax law and pension deductions.",
    status: "Enterprise Live",
  },
  {
    year: "Phase 4",
    title: "Multi-Campus Federation & Mobile Parent Portals",
    desc: "Expanding to support multi-campus school chains with unified executive dashboards and offline-capable mobile web apps.",
    status: "Current Release",
  },
];

export default function AboutClient() {
  return (
    <div className={styles.aboutPage}>
      {/* 1. HERO HEADER */}
      <section className={styles.aboutHero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrowTag}>
              <HiSparkles /> Our Story & Institutional Purpose
            </span>
            <h1 className={styles.heroTitle}>
              Pioneering the Future of <span className={styles.goldText}>Intelligent School Operations</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Smart SMS was built to solve a pressing educational challenge: bridging the communication gap between schools, teachers, and parents while replacing chaotic paper ledgers with an enterprise cloud ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* 2. MISSION & VISION */}
      <section className={styles.missionSection}>
        <div className={styles.container}>
          <div className={styles.missionGrid}>
            <div className={styles.missionCard}>
              <div className={styles.cardIconWrap}>
                <FaGraduationCap />
              </div>
              <h2 className={styles.cardTitle}>Our Mission</h2>
              <p className={styles.cardText}>
                To empower school principals, teachers, and administrative bursars with instantaneous, automated tools that ensure complete operational clarity, zero data loss, and uninterrupted family engagement across every stage of a student's academic journey.
              </p>
            </div>

            <div className={styles.missionCard}>
              <div className={`${styles.cardIconWrap} ${styles.cardIconGold}`}>
                <HiGlobeAlt />
              </div>
              <h2 className={styles.cardTitle}>Our Vision</h2>
              <p className={styles.cardText}>
                To become the most dependable and widely adopted school operating ecosystem across East Africa, providing every academy—from neighborhood primary schools to sprawling multi-campus networks—with modern, world-class educational technology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE VALUES */}
      <section className={styles.valuesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiSparkles /> Guiding Principles
            </span>
            <h2 className={styles.sectionTitle}>What Drives Our Engineering</h2>
            <p className={styles.sectionDesc}>
              Every line of code and feature in Smart SMS is guided by these foundational commitments to educational excellence.
            </p>
          </div>

          <div className={styles.valuesGrid}>
            {CORE_VALUES.map((val, i) => (
              <div key={i} className={styles.valueCard}>
                {val.icon}
                <h3 className={styles.valueTitle}>{val.title}</h3>
                <p className={styles.valueDesc}>{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. INSTITUTIONAL ROADMAP & MILESTONES */}
      <section className={styles.milestonesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiCalendarDays /> Engineering Roadmap
            </span>
            <h2 className={styles.sectionTitle}>Continuous Evolution & Institutional Trust</h2>
            <p className={styles.sectionDesc}>
              Smart SMS has developed from a targeted attendance notification tool into a full-scale educational ERP platform.
            </p>
          </div>

          <div className={styles.timelineGrid}>
            {TIMELINE_MILESTONES.map((item, idx) => (
              <div key={idx} className={styles.timelineCard}>
                <div className={styles.timelineHeader}>
                  <span className={styles.timelineYear}>{item.year}</span>
                  <span className={styles.timelineBadge}>{item.status}</span>
                </div>
                <h3 className={styles.timelineTitle}>{item.title}</h3>
                <p className={styles.timelineDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ARCHITECTURE & TECHNOLOGY */}
      <section className={styles.architectureSection}>
        <div className={styles.container}>
          <div className={styles.archGrid}>
            <div className={styles.archText}>
              <span className={styles.eyebrowTag}>
                <HiLockClosed /> System Architecture
              </span>
              <h2 className={styles.heroTitle} style={{ fontSize: "2.2rem" }}>
                Built on Modern, Resilient <span className={styles.goldText}>Cloud Infrastructure</span>
              </h2>
              <p className={styles.heroSubtitle}>
                We engineered Smart SMS for speed, security, and zero downtime. Your school's sensitive data is guarded with enterprise best practices.
              </p>

              <ul className={styles.archFeatureList}>
                <li>
                  <HiCheckCircle className={styles.archCheck} />
                  <span>
                    <strong>Next.js App Router & React 19:</strong> Server-side rendered, lightning-fast interactive interfaces optimized for both mobile and desktop.
                  </span>
                </li>
                <li>
                  <HiCheckCircle className={styles.archCheck} />
                  <span>
                    <strong>Multi-Carrier SMS Integration:</strong> Automated fallback routing across Ethio Telecom & Safaricom to guarantee prompt parent delivery.
                  </span>
                </li>
                <li>
                  <HiCheckCircle className={styles.archCheck} />
                  <span>
                    <strong>Relational PostgreSQL 17 Persistence:</strong> ACID-compliant database architecture with automated daily backups and replication.
                  </span>
                </li>
                <li>
                  <HiCheckCircle className={styles.archCheck} />
                  <span>
                    <strong>Granular RBAC Security:</strong> Strict token-based authentication protecting student records from unauthorized access.
                  </span>
                </li>
              </ul>
            </div>

            {/* Architecture Terminal Card */}
            <div className={styles.archTerminalCard}>
              <div className={styles.terminalTop}>
                <span className={`${styles.terminalDot} ${styles.termRed}`}></span>
                <span className={`${styles.terminalDot} ${styles.termYellow}`}></span>
                <span className={`${styles.terminalDot} ${styles.termGreen}`}></span>
                <span className={styles.terminalTitle}>smart-sms-engine // health-check</span>
              </div>
              <div className={styles.terminalCode}>
                <span className={styles.codeGreen}>$ smart-sms cluster --status</span>
                <span>▶ API Gateway: <strong className={styles.codeGreen}>HEALTHY (18ms)</strong></span>
                <span>▶ SMS Carrier Engine: <strong className={styles.codeGreen}>ACTIVE (Tier-1 TeleSMS Online)</strong></span>
                <span>▶ Database Pool: <strong className={styles.codeGreen}>OPTIMAL (PostgreSQL 17.0)</strong></span>
                <span>▶ RBAC Auth Middleware: <strong className={styles.codeCyan}>ENABLED (JWT + RSA-256)</strong></span>
                <span>▶ Active Enrolled Learners: <strong className={styles.codeGold}>1,482 (YOYO Academy)</strong></span>
                <span className={styles.codeGreen}>✔ System readiness: 100% Production Certified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA */}
      <section className={styles.aboutCtaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Experience the Smart SMS Advantage</h2>
            <p className={styles.ctaDesc}>
              Learn how YOYO Academy and over 150 campuses have transformed their administrative efficiency.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className={styles.ctaPrimary}>
                <span>Book a School Consultation</span>
                <HiArrowRight />
              </Link>
              <Link href="/login" className={styles.ctaSecondary}>
                Open School Portal
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
