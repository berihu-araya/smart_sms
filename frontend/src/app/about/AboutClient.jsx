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
} from "react-icons/hi2";
import { FaGraduationCap } from "react-icons/fa6";
import styles from "./about.module.css";

const CORE_VALUES = [
  {
    icon: <HiBolt className={styles.valueIcon} />,
    title: "Instant Reliability",
    desc: "Parent communication cannot afford delays. Our multi-carrier SMS gateway delivers emergency and academic alerts with 99.99% uptime.",
  },
  {
    icon: <HiShieldCheck className={styles.valueIcon} />,
    title: "Bank-Grade Security",
    desc: "We protect student privacy and school financials with 256-bit TLS encryption, role-based access control, and full audit trails.",
  },
  {
    icon: <HiAcademicCap className={styles.valueIcon} />,
    title: "Educator-First Design",
    desc: "Software should reduce workload, not add to it. We design fast interfaces so teachers spend less time entering data and more time teaching.",
  },
  {
    icon: <HiGlobeAlt className={styles.valueIcon} />,
    title: "Scalable Multi-Campus",
    desc: "From standalone academies to nationwide school networks, Smart SMS handles high volumes without slowdowns or hiccups.",
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
              <HiSparkles /> Our Story & Mission
            </span>
            <h1 className={styles.heroTitle}>
              Pioneering the Future of <span className={styles.goldText}>Intelligent School Operations</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Smart SMS was built with a clear purpose: to eliminate paperwork, automate school-to-parent communication, and give educators the modern digital tools they deserve.
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
              <h2 className={styles.cardTitle}>Our Core Mission</h2>
              <p className={styles.cardText}>
                To bridge the critical communication gap between schools and families through automated, instant mobile messaging while unifying student records, grading, attendance, and finance into an effortless cloud platform.
              </p>
            </div>

            <div className={styles.missionCard}>
              <div className={`${styles.cardIconWrap} ${styles.cardIconGold}`}>
                <HiGlobeAlt />
              </div>
              <h2 className={styles.cardTitle}>Our Long-Term Vision</h2>
              <p className={styles.cardText}>
                To become the most dependable and widely adopted school operating ecosystem in the region, helping every academy operate with complete operational clarity and zero administrative waste.
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
              Every line of code and feature in Smart SMS is guided by these foundational values.
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

      {/* 4. ARCHITECTURE & TECHNOLOGY */}
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
                    <strong>Next.js App Router:</strong> Server-side rendered, lightning-fast interactive interfaces optimized for both mobile and desktop.
                  </span>
                </li>
                <li>
                  <HiCheckCircle className={styles.archCheck} />
                  <span>
                    <strong>Multi-Carrier SMS Integration:</strong> Automated fallback routing across multiple telecom operators to guarantee delivery.
                  </span>
                </li>
                <li>
                  <HiCheckCircle className={styles.archCheck} />
                  <span>
                    <strong>Relational PostgreSQL Persistence:</strong> ACID-compliant database architecture with automated daily backups.
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
                <span>▶ SMS Carrier Engine: <strong className={styles.codeGreen}>ACTIVE (12 Providers Online)</strong></span>
                <span>▶ Database Pool: <strong className={styles.codeGreen}>OPTIMAL (PostgreSQL 16)</strong></span>
                <span>▶ RBAC Auth Middleware: <strong className={styles.codeCyan}>ENABLED (JWT + RSA-256)</strong></span>
                <span>▶ Active Enrolled Learners: <strong className={styles.codeGold}>1,482 (YOYO Academy)</strong></span>
                <span className={styles.codeGreen}>✔ System readiness: 100% Production Certified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className={styles.aboutCtaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Experience the Smart SMS Advantage</h2>
            <p className={styles.ctaDesc}>
              Learn how YOYO Academy and dozens of other schools have transformed their administrative efficiency.
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
