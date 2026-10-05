"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HiEnvelope,
  HiPhone,
  HiMapPin,
  HiShieldCheck,
  HiCheckCircle,
  HiSparkles,
  HiArrowRight,
} from "react-icons/hi2";
import { FaGraduationCap } from "react-icons/fa6";
import styles from "./PublicFooter.module.css";

export default function PublicFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className={styles.footer}>
      {/* Top Pre-Footer Bar / System Status */}
      <div className={styles.statusTicker}>
        <div className={styles.statusContainer}>
          <div className={styles.statusLeft}>
            <span className={styles.statusDot}></span>
            <span className={styles.statusText}>
              <strong>System Operational:</strong> All 12 SMS Gateways, Biometrics & Database APIs Running with 99.99% Uptime
            </span>
          </div>
          <div className={styles.statusRight}>
            <span className={styles.securityTag}>
              <HiShieldCheck className={styles.shieldIcon} />
              256-Bit TLS & Role-Based RBAC Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Footer */}
      <div className={styles.mainFooter}>
        <div className={styles.container}>
          <div className={styles.grid}>
            {/* Column 1: Brand & Slogan */}
            <div className={styles.brandCol}>
              <Link href="/" className={styles.logoLink}>
                <div className={styles.logoBadge}>
                  <Image
                    src="/school-logo-1.png"
                    alt="School Logo"
                    width={42}
                    height={42}
                    className={styles.logoImg}
                  />
                </div>
                <div className={styles.logoInfo}>
                  <span className={styles.brandName}>YOYO ACADEMY</span>
                  <span className={styles.brandSubtitle}>Smart SMS Platform</span>
                </div>
              </Link>
              <p className={styles.brandDesc}>
                Empowering modern educational institutions with unified student administration,
                automated SMS parent alerts, intelligent grading, and real-time operational analytics.
              </p>

              {/* Newsletter / Updates Subscription */}
              <div className={styles.subscribeBox}>
                <span className={styles.subscribeLabel}>
                  <HiSparkles className={styles.sparkleIcon} /> Stay updated with school technology:
                </span>
                {subscribed ? (
                  <div className={styles.subscribeSuccess}>
                    <HiCheckCircle /> Thank you for subscribing!
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className={styles.subscribeForm}>
                    <input
                      type="email"
                      placeholder="Enter school or admin email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={styles.subscribeInput}
                    />
                    <button type="submit" className={styles.subscribeBtn} aria-label="Subscribe">
                      <HiArrowRight />
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Column 2: Platform Modules */}
            <div className={styles.navCol}>
              <h4 className={styles.colTitle}>Platform Modules</h4>
              <ul className={styles.linkList}>
                <li>
                  <Link href="/features#sis">Student Information System (SIS)</Link>
                </li>
                <li>
                  <Link href="/features#sms">Automated SMS & Multichannel Alerts</Link>
                </li>
                <li>
                  <Link href="/features#grading">Gradebook & Digital Transcripts</Link>
                </li>
                <li>
                  <Link href="/features#attendance">Smart Attendance & Absence Logs</Link>
                </li>
                <li>
                  <Link href="/features#finance">Fee Invoicing & Payment Tracker</Link>
                </li>
                <li>
                  <Link href="/features#timetable">Intelligent Timetable Scheduler</Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Portals & Access */}
            <div className={styles.navCol}>
              <h4 className={styles.colTitle}>Portals & Access</h4>
              <ul className={styles.linkList}>
                <li>
                  <Link href="/login">Super Admin Control Center</Link>
                </li>
                <li>
                  <Link href="/login">Teacher Academic Desk</Link>
                </li>
                <li>
                  <Link href="/login">Parent & Guardian Hub</Link>
                </li>
                <li>
                  <Link href="/login">Student Learning Portal</Link>
                </li>
                <li>
                  <Link href="/about">About YOYO Academy</Link>
                </li>
                <li>
                  <Link href="/contact">Schedule an Onboarding Demo</Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Campus Info */}
            <div className={styles.navCol}>
              <h4 className={styles.colTitle}>Campus & Support</h4>
              <div className={styles.contactList}>
                <div className={styles.contactItem}>
                  <HiMapPin className={styles.contactIcon} />
                  <span>YOYO Academy Campus, Main Boulevard, Addis Ababa, Ethiopia</span>
                </div>
                <div className={styles.contactItem}>
                  <HiEnvelope className={styles.contactIcon} />
                  <a href="mailto:support@smart-sms.edu.et">support@smart-sms.edu.et</a>
                </div>
                <div className={styles.contactItem}>
                  <HiPhone className={styles.contactIcon} />
                  <a href="tel:+251911000000">+251 (911) 00-0000 / +251 (912) 00-0000</a>
                </div>
                <div className={styles.workingHours}>
                  <strong>Office Hours:</strong> Monday – Saturday (8:00 AM – 6:00 PM)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Compliance */}
      <div className={styles.bottomBar}>
        <div className={styles.container}>
          <div className={styles.bottomContent}>
            <div className={styles.copyright}>
              © {new Date().getFullYear()} YOYO Academy Smart SMS. All rights reserved. Built for modern academic excellence.
            </div>
            <div className={styles.legalLinks}>
              <Link href="/about">Architecture & Security</Link>
              <span className={styles.dot}>•</span>
              <Link href="/features">Features</Link>
              <span className={styles.dot}>•</span>
              <Link href="/contact">Support & Contact</Link>
              <span className={styles.dot}>•</span>
              <Link href="/login">Portal Login</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
