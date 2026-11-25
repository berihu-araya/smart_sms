"use client";

import { useState, useEffect, useRef, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HiAcademicCap,
  HiShieldCheck,
  HiUserGroup,
  HiChatBubbleBottomCenterText,
  HiDocumentText,
  HiCreditCard,
  HiCalendarDays,
  HiChartBar,
  HiSparkles,
  HiArrowRight,
  HiCheckCircle,
  HiBolt,
  HiClock,
  HiChevronDown,
  HiChevronUp,
  HiDevicePhoneMobile,
  HiArrowTopRightOnSquare,
  HiBuildingOffice2,
  HiLockClosed,
  HiEnvelope,
  HiPhone,
  HiSignal,
  HiCalculator,
  HiCurrencyDollar,
  HiArrowTrendingUp,
  HiServerStack,
  HiCircleStack,
  HiLanguage,
} from "react-icons/hi2";
import { FaGraduationCap, FaQuoteLeft } from "react-icons/fa6";
import styles from "./page.module.css";

const SMS_SCENARIOS = [
  {
    id: "attendance",
    label: "Daily Attendance Alert",
    category: "Attendance Trigger",
    icon: <HiClock />,
    sender: "YOYO-ACADEMY",
    time: "08:16 AM",
    student: "Alex Samuel (Grade 10B)",
    messageEn:
      "Good morning Mr. Samuel. Alex has arrived safely at school and was marked PRESENT at 08:15 AM today. Thank you, YOYO Academy.",
    messageAm:
      "ደህና አደሩ አቶ ሳሙኤል። አሌክስ ዛሬ 08:15 ጥዋት በሰላም ትምህርት ቤት ደርሶ ተገኝቷል። እናመሰግናለን፣ ዮዮ አካዳሚ።",
    tag: "Instant Delivery",
  },
  {
    id: "grades",
    label: "Term 2 Report Card",
    category: "Academic Dispatch",
    icon: <HiDocumentText />,
    sender: "YOYO-ACADEMY",
    time: "02:45 PM",
    student: "Liya Bekele (Grade 8A)",
    messageEn:
      "YOYO Academy Notice: Liya's Term 2 Final Report Card has been published! Average: 94.6% (Rank: 1st/45). View the complete transcript on your Parent Portal.",
    messageAm:
      "የዮዮ አካዳሚ ማስታወቂያ፡ የሊያ የ2ኛ ተርም የፈተና ውጤት ወጥቷል! አማካይ፡ 94.6% (ደረጃ፡ 1ኛ/45)። ሙሉ ዝርዝሩን በወላጅ ፖርታል ላይ ይመልከቱ።",
    tag: "Auto-Generated",
  },
  {
    id: "fee",
    label: "Tuition Fee Receipt",
    category: "Finance & Billing",
    icon: <HiCreditCard />,
    sender: "YOYO-ACADEMY",
    time: "11:20 AM",
    student: "Dawit Yohannes (Grade 11)",
    messageEn:
      "Payment Received! ETB 6,200 has been credited for Dawit's Term 3 Tuition Fee. Remaining balance: ETB 0.00. Receipt #REC-2026-904. Thank you!",
    messageAm:
      "ክፍያ ደርሶናል! የዳዊት የ3ኛ ተርም የትምህርት ክፍያ ብር 6,200 ገቢ ሆኗል። ቀሪ ሂሳብ፡ ብር 0.00። ደረሰኝ ቁጥር #REC-2026-904። እናመሰግናለን!",
    tag: "Bank Reconciled",
  },
  {
    id: "emergency",
    label: "Campus Notice & Events",
    category: "Emergency Broadcast",
    icon: <HiChatBubbleBottomCenterText />,
    sender: "YOYO-ACADEMY",
    time: "03:10 PM",
    student: "All Guardians",
    messageEn:
      "Dear Parents & Guardians, please note that tomorrow Friday is our Annual Science Fair from 9:00 AM to 1:00 PM. Parents are warmly invited to attend!",
    messageAm:
      "የተከበራችሁ ወላጆችና አሳዳጊዎች፣ ነገ አርብ አመታዊ የሳይንስ አውደ-ርዕይ ከጥዋቱ 3:00 እስከ 7:00 የሚካሄድ በመሆኑ ሁላችሁም በክብር ተጋብዛችኋል።",
    tag: "Mass Broadcast (1,480)",
  },
];

const MODULES = [
  {
    icon: <HiUserGroup />,
    title: "Student Information System (SIS)",
    desc: "Complete digital profile for every learner: admissions, guardian contacts, emergency info, and academic history.",
    points: ["One-click student enrollment", "Guardian & sibling linking", "Digital student ID & barcode"],
    accent: "blue",
    id: "sis",
  },
  {
    icon: <HiChatBubbleBottomCenterText />,
    title: "Smart SMS Automation",
    desc: "Multi-carrier automated SMS dispatch for attendance, exam scores, payment confirmations, and urgent school notices.",
    points: ["Instant delivery confirmation", "Dynamic personalized templates", "Scheduled mass announcements"],
    accent: "purple",
    id: "sms",
  },
  {
    icon: <HiDocumentText />,
    title: "Gradebook & Report Cards",
    desc: "Effortless marks entry for teachers with automatic GPA calculations, ranking, and print-ready PDF report card generation.",
    points: ["Custom grading scales & weights", "Continuous assessment (CA) tracking", "Digital PDF report export"],
    accent: "gold",
    id: "grading",
  },
  {
    icon: <HiClock />,
    title: "Attendance & Absence Logs",
    desc: "Fast classroom attendance taking with automated instant SMS alerts sent to parents if a student is marked absent or late.",
    points: ["One-tap roll call interface", "Real-time daily absence triggers", "Comprehensive term attendance stats"],
    accent: "emerald",
    id: "attendance",
  },
  {
    icon: <HiCreditCard />,
    title: "Fee Billing & Payment Ledgers",
    desc: "Transparent financial management with student invoice generation, partial payment support, and automated SMS receipts.",
    points: ["Tuition & transport billing", "Automated payment reminder SMS", "Detailed school cashflow reports"],
    accent: "cyan",
    id: "finance",
  },
  {
    icon: <HiCalendarDays />,
    title: "Timetable & Class Schedules",
    desc: "Conflict-free master scheduling for teachers, subjects, classrooms, and weekly academic timetable distributions.",
    points: ["Automatic teacher clash detection", "Subject load balancing", "Printable class & teacher timetables"],
    accent: "rose",
    id: "timetable",
  },
];

const ROLES_DATA = [
  {
    id: "admin",
    role: "School Administrators",
    badge: "Full Control",
    title: "Command Center for Complete School Operations",
    description:
      "Empower your administrative team with instant bird's-eye visibility over admissions, staff assignments, fee collections, system audits, and bulk parent communication.",
    highlights: [
      "Real-time school performance analytics dashboard",
      "Automated financial reconciliation & fee tracking",
      "Granular role-based permissions (Admin, Accountant, Registrar)",
      "Instant mass SMS dispatch to entire grade levels or campus",
    ],
    mockBadge: "Super Admin Active",
  },
  {
    id: "teacher",
    role: "Educators & Teachers",
    badge: "Fast & Intuitive",
    title: "Less Paperwork, More Time for Great Teaching",
    description:
      "Teachers can take daily attendance in under 30 seconds, record assignment & exam marks with auto-averaging, and view their personalized weekly timetable.",
    highlights: [
      "Streamlined marks entry with automatic grade calculation",
      "One-tap daily classroom attendance marker",
      "Real-time class schedule & room assignments",
      "Teacher subject progress and syllabus coverage logs",
    ],
    mockBadge: "Teacher Desk Active",
  },
  {
    id: "parent",
    role: "Parents & Guardians",
    badge: "Always Informed",
    title: "Real-Time Peace of Mind for Every Parent",
    description:
      "Keep families engaged through automated SMS alerts for attendance check-in, exam score publications, fee receipts, and school events directly on their phone.",
    highlights: [
      "Instant SMS notification when student arrives or is absent",
      "Access to term report cards & academic progress",
      "Real-time fee balance and digital receipt tracking",
      "Direct school announcements and event calendar",
    ],
    mockBadge: "Parent Hub Active",
  },
  {
    id: "student",
    role: "Students & Learners",
    badge: "Empowered Learning",
    title: "Personalized Academic Hub for Every Student",
    description:
      "Students stay organized with personal class schedules, homework submission deadlines, term examination transcripts, and library book loans.",
    highlights: [
      "Weekly class timetable with classroom numbers & subject teachers",
      "Published exam scores, GPA transcripts, and performance ranks",
      "Upcoming assignment deadlines and course announcements",
      "Digital library loans and borrow history tracking",
    ],
    mockBadge: "Student Desk Active",
  },
];

const SECURITY_PILLARS = [
  {
    icon: <HiShieldCheck className={styles.securityIcon} />,
    title: "256-Bit TLS & Data-in-Transit Encryption",
    desc: "All traffic between browsers, mobile devices, and our backend is encrypted with enterprise TLS 1.3 and AES-256 standards.",
    badge: "End-to-End Encrypted",
  },
  {
    icon: <HiLockClosed className={styles.securityIcon} />,
    title: "Granular Role-Based Access Control (RBAC)",
    desc: "Strict isolation ensures administrators, bursars, teachers, parents, and students only access data authorized for their role.",
    badge: "Strict Token RBAC",
  },
  {
    icon: <HiServerStack className={styles.securityIcon} />,
    title: "Tamper-Evident Audit Trails",
    desc: "Every grade edit, fee reconciliation, and profile modification is recorded with immutable timestamps and staff IP identifiers.",
    badge: "100% Audit Logging",
  },
  {
    icon: <HiCircleStack className={styles.securityIcon} />,
    title: "Redundant Daily Backups & Disaster Recovery",
    desc: "Automated snapshot backups with point-in-time recovery ensure zero data loss and 99.99% service availability.",
    badge: "Daily Cloud Snapshots",
  },
];

const FAQS = [
  {
    q: "How does the automated SMS notification system work?",
    a: "When a teacher marks attendance or an administrator records a fee payment or finalizes exam marks, Smart SMS instantly generates a personalized message using your school's verified sender ID (e.g. YOYO-ACADEMY) and routes it through our multi-carrier gateway directly to the guardian's mobile phone within seconds.",
  },
  {
    q: "Can we migrate our existing student and staff data?",
    a: "Yes! Smart SMS provides built-in Excel and CSV data import tools. You can seamlessly upload student rosters, parent contact numbers, class allocations, and past academic records with full field mapping assistance.",
  },
  {
    q: "Is Smart SMS accessible on mobile phones and tablets?",
    a: "Absolutely. Smart SMS is built with a responsive, modern web architecture. Administrators, teachers, and parents can access their dedicated portals from any smartphone, tablet, laptop, or desktop without requiring bulky software installations.",
  },
  {
    q: "How secure is our school and student data?",
    a: "Security is our highest priority. Smart SMS uses industry-standard 256-bit TLS encryption in transit and at rest, role-based access control (RBAC), and continuous database backups to ensure strict student privacy.",
  },
  {
    q: "Can we customize report card formats and grading scales?",
    a: "Yes. You can configure custom grading criteria (letter grades, percentage ranges, GPA weighting), school logos, term remarks, attendance percentages, and principal signatures for official PDF report card printouts.",
  },
  {
    q: "How does the ROI and fee recovery benefit work in practice?",
    a: "Schools typically see an immediate 12% to 18% improvement in tuition collection within the first 30 days due to automated, friendly SMS payment reminder dispatches. Administrative time spent compiling manual broadsheets and paper report cards is cut by over 70%.",
  },
  {
    q: "How do we get started with Smart SMS for our school?",
    a: "You can click 'Request Live Demo' or 'Access School Portal' right away. Our team provides guided onboarding, system configuration, staff training, and dedicated technical support to get your campus running smoothly.",
  },
];

function CountUpNumber({ target, startFrom = 0, decimals = 0, prefix = "", suffix = "", isVisible, duration = 2000 }) {
  const [count, setCount] = useState(startFrom);

  useEffect(() => {
    if (!isVisible) return;

    // Respect reduced motion accessibility preferences
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(target);
      return;
    }

    let startTime = null;
    let frameId;

    const animate = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easeOutExpo deceleration curve
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startFrom + ease * (target - startFrom);
      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isVisible, target, startFrom, duration]);

  const display = decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString();

  return (
    <>
      {prefix}
      {display}
      {suffix}
    </>
  );
}

export default function HomeLandingClient() {
  const [selectedSms, setSelectedSms] = useState(SMS_SCENARIOS[0]);
  const [smsLang, setSmsLang] = useState("en"); // "en" | "am"
  const [activeRole, setActiveRole] = useState(ROLES_DATA[0]);
  const [openFaq, setOpenFaq] = useState(null);
  const [currentTime, setCurrentTime] = useState("");

  // Scroll observer for live stats count-up animation
  const statsBannerRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    if (!statsBannerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect(); // Trigger once when scrolled into view
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(statsBannerRef.current);
    return () => observer.disconnect();
  }, []);

  // ROI Calculator State
  const [studentCount, setStudentCount] = useState(1200);
  const [termFee, setTermFee] = useState(8500);
  const [uncollectedRate, setUncollectedRate] = useState(15);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // ROI Calculations
  const termGrossRevenue = studentCount * termFee;
  const uncollectedAmount = termGrossRevenue * (uncollectedRate / 100);
  // Automated SMS reminders reliably recover ~65% of otherwise uncollected receivables
  const recoveredReceivables = Math.round(uncollectedAmount * 0.65);
  // Average hours saved: 0.85 hours per student per term across report generation, manual calls, and attendance logs
  const hoursSavedPerTerm = Math.round(studentCount * 0.85);
  // Paper & toner savings: ~25 ETB saved per student in physical broadsheets, envelopes, and receipts
  const paperSavings = Math.round(studentCount * 25);
  // Net financial gain per term
  const netTermBenefit = recoveredReceivables + paperSavings;

  return (
    <div className={styles.landingPage}>
      {/* 1. AMBIENT HERO SECTION WITH DUAL-DEVICE SHOWCASE */}
      <section className={styles.heroSection}>
        <div className={styles.heroGlowOverlay}></div>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            {/* Left Hero Content */}
            <div className={styles.heroTextCol}>
              <div className={styles.versionBadge}>
                <span className={styles.pulseDot}></span>
                <span className={styles.versionText}>
                  ✨ Smart SMS OS 2.4 Active • 150+ Schools Connected
                </span>
              </div>

              <h1 className={styles.heroHeading}>
                The <span className={styles.goldGradientText}>Intelligent</span> Operating System for Modern Schools
              </h1>

              <p className={styles.heroSubheading}>
                Unified student information, automated multi-carrier SMS to parents, digital continuous assessment gradebooks, fee reconciliation, and conflict-free timetables in one synchronized cloud ecosystem.
              </p>

              {/* Action Buttons */}
              <div className={styles.heroCtaGroup}>
                <Link href="/login" className={styles.primaryCta}>
                  <span>Access School Portal</span>
                  <HiArrowRight className={styles.btnIcon} />
                </Link>

                <a href="#simulator" className={styles.secondaryCta}>
                  <HiSparkles className={styles.sparkleCta} />
                  <span>Launch Live Simulator</span>
                </a>

                <a href="#calculator" className={styles.ghostCta}>
                  <HiCalculator className={styles.calcIcon} />
                  <span>Calculate School ROI</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className={styles.heroTrustStrip}>
                <div className={styles.trustItem}>
                  <HiCheckCircle className={styles.trustIcon} />
                  <span>150+ Campuses Onboarded</span>
                </div>
                <div className={styles.trustItem}>
                  <HiCheckCircle className={styles.trustIcon} />
                  <span>99.9% SMS Delivery Rate</span>
                </div>
                <div className={styles.trustItem}>
                  <HiCheckCircle className={styles.trustIcon} />
                  <span>100% Ethiopian Tax & Pension Ready</span>
                </div>
              </div>
            </div>

            {/* Right Hero: DUAL-DEVICE SHOWCASE (Desktop Dashboard + Floating Mobile SMS Preview) */}
            <div className={styles.heroVisualCol}>
              <div className={styles.dualDeviceContainer}>
                {/* 1. Desktop Dashboard Window (Back/Primary Layer) */}
                <div className={styles.mockDashboardWindow}>
                  {/* Window Bar */}
                  <div className={styles.windowHeader}>
                    <div className={styles.windowDots}>
                      <span className={styles.dotRed}></span>
                      <span className={styles.dotYellow}></span>
                      <span className={styles.dotGreen}></span>
                    </div>
                    <div className={styles.windowTitle}>
                      <HiBuildingOffice2 /> YOYO Academy • Executive Hub
                    </div>
                    <div className={styles.windowStatus}>
                      <span className={styles.statusLiveDot}></span>
                      <span>Live {currentTime || "10:45 AM"}</span>
                    </div>
                  </div>

                  {/* Dashboard Stats Row */}
                  <div className={styles.mockKpiGrid}>
                    <div className={styles.mockKpiCard}>
                      <span className={styles.kpiLabel}>Total Students</span>
                      <span className={styles.kpiVal}>1,482</span>
                      <span className={styles.kpiBadge}>Active Term 2</span>
                    </div>
                    <div className={styles.mockKpiCard}>
                      <span className={styles.kpiLabel}>Attendance</span>
                      <span className={styles.kpiVal}>98.6%</span>
                      <span className={styles.kpiBadgeSuccess}>1,461 Present</span>
                    </div>
                    <div className={styles.mockKpiCard}>
                      <span className={styles.kpiLabel}>SMS Gateway</span>
                      <span className={styles.kpiVal}>Online</span>
                      <span className={styles.kpiBadgeGold}>0.4s Latency</span>
                    </div>
                    <div className={styles.mockKpiCard}>
                      <span className={styles.kpiLabel}>Tuition Collected</span>
                      <span className={styles.kpiVal}>94.8%</span>
                      <span className={styles.kpiBadgeSuccess}>ETB 4.02M</span>
                    </div>
                  </div>

                  {/* Live Mini Activity Feed */}
                  <div className={styles.mockActivityFeed}>
                    <div className={styles.feedHeader}>
                      <span className={styles.feedTitle}>
                        <HiSignal className={styles.feedIcon} /> Real-Time Institutional Activity
                      </span>
                      <span className={styles.feedBadge}>Auto-Synced</span>
                    </div>

                    <div className={styles.feedList}>
                      <div className={styles.feedItem}>
                        <div className={`${styles.feedDot} ${styles.feedDotGreen}`}></div>
                        <div className={styles.feedBody}>
                          <div className={styles.feedRow}>
                            <strong>Morning Attendance Dispatched</strong>
                            <span className={styles.feedTime}>Just now</span>
                          </div>
                          <p>Grade 10B roll call finalized (42 parent SMS alerts sent)</p>
                        </div>
                      </div>

                      <div className={styles.feedItem}>
                        <div className={`${styles.feedDot} ${styles.feedDotBlue}`}></div>
                        <div className={styles.feedBody}>
                          <div className={styles.feedRow}>
                            <strong>Midterm Gradebook Published</strong>
                            <span className={styles.feedTime}>4m ago</span>
                          </div>
                          <p>Mathematics results verified for Grade 9A (Avg 88.4%)</p>
                        </div>
                      </div>

                      <div className={styles.feedItem}>
                        <div className={`${styles.feedDot} ${styles.feedDotGold}`}></div>
                        <div className={styles.feedBody}>
                          <div className={styles.feedRow}>
                            <strong>Tuition Slip Verified</strong>
                            <span className={styles.feedTime}>9m ago</span>
                          </div>
                          <p>ETB 6,200 receipt #REC-904 credited & parent SMS delivered</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Card Footer */}
                  <div className={styles.mockFooter}>
                    <span>🔒 Enterprise TLS 1.3 & Role RBAC Protected</span>
                    <Link href="/login" className={styles.mockDirectBtn}>
                      Portal Login →
                    </Link>
                  </div>
                </div>

                {/* 2. Floating Mobile Phone SMS Mockup (Overlapping Foreground Layer) */}
                <div className={styles.heroFloatingPhone}>
                  <div className={styles.floatingPhoneInner}>
                    <div className={styles.floatingPhoneHeader}>
                      <div className={styles.floatingPhoneNotch}></div>
                      <div className={styles.floatingPhoneBar}>
                        <span>{currentTime || "10:45"}</span>
                        <div className={styles.floatingSignal}>
                          <HiSignal />
                          <span>5G</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.floatingSmsNotice}>
                      <div className={styles.floatingSenderRow}>
                        <div className={styles.floatingAvatar}>
                          <FaGraduationCap />
                        </div>
                        <div className={styles.floatingSenderInfo}>
                          <strong>YOYO-ACADEMY</strong>
                          <span>Verified Sender • Now</span>
                        </div>
                        <span className={styles.liveBadgeSmall}>NEW</span>
                      </div>

                      <p className={styles.floatingMessageText}>
                        "Good morning Mr. Samuel. Alex has arrived safely at school and was marked PRESENT at 08:15 AM today. Thank you!"
                      </p>

                      <div className={styles.floatingDeliveryBadge}>
                        <HiCheckCircle className={styles.floatingCheck} />
                        <span>Delivered to Parent Mobile (0.4s)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. REAL-TIME INSTITUTIONAL PROOF BAR */}
      <section ref={statsBannerRef} className={styles.statsBanner}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>
                <CountUpNumber
                  target={150}
                  startFrom={0}
                  suffix="+"
                  isVisible={statsVisible}
                  duration={1800}
                />
              </span>
              <span className={styles.statLabel}>Campuses & Academies Onboarded</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>
                <CountUpNumber
                  target={500}
                  startFrom={0}
                  suffix="K+"
                  isVisible={statsVisible}
                  duration={2000}
                />
              </span>
              <span className={styles.statLabel}>Automated Parent SMS Delivered</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>
                <CountUpNumber
                  target={99.99}
                  startFrom={0}
                  decimals={2}
                  suffix="%"
                  isVisible={statsVisible}
                  duration={2200}
                />
              </span>
              <span className={styles.statLabel}>Carrier Gateway Uptime SLA</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>
                <CountUpNumber
                  target={1.2}
                  startFrom={0}
                  decimals={1}
                  prefix="< "
                  suffix="s"
                  isVisible={statsVisible}
                  duration={1600}
                />
              </span>
              <span className={styles.statLabel}>Average Real-Time Dispatch Latency</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. NEXT-GEN LIVE SMS DISPATCH SIMULATOR (CORE HERO FEATURE) */}
      <section id="simulator" className={styles.simulatorSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerTopFlex}>
              <span className={styles.sectionTag}>
                <HiBolt /> Live SMS Automation Engine
              </span>

              {/* Language Switcher */}
              <div className={styles.langToggleWrap}>
                <span className={styles.langLabel}>
                  <HiLanguage /> Preview Language:
                </span>
                <div className={styles.langButtons}>
                  <button
                    type="button"
                    className={`${styles.langBtn} ${smsLang === "en" ? styles.langBtnActive : ""}`}
                    onClick={() => setSmsLang("en")}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    className={`${styles.langBtn} ${smsLang === "am" ? styles.langBtnActive : ""}`}
                    onClick={() => setSmsLang("am")}
                  >
                    አማርኛ (Amharic)
                  </button>
                </div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>
              Experience Instant School-to-Parent Mobile Communication
            </h2>
            <p className={styles.sectionDesc}>
              Smart SMS connects classroom milestones directly to parents' phones. Click any scenario below to see how our automated SMS gateway formats and delivers real-time notifications with certified sender IDs.
            </p>
          </div>

          <div className={styles.simulatorGrid}>
            {/* Scenario Buttons */}
            <div className={styles.scenarioList}>
              {SMS_SCENARIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.scenarioBtn} ${
                    selectedSms.id === item.id ? styles.scenarioActive : ""
                  }`}
                  onClick={() => setSelectedSms(item)}
                >
                  <div className={styles.scenarioIconWrap}>{item.icon}</div>
                  <div className={styles.scenarioInfo}>
                    <div className={styles.scenarioTop}>
                      <span className={styles.scenarioCategory}>{item.category}</span>
                      <span className={styles.scenarioTagBadge}>{item.tag}</span>
                    </div>
                    <h4 className={styles.scenarioLabel}>{item.label}</h4>
                    <span className={styles.scenarioTarget}>Target: {item.student}</span>
                  </div>
                </button>
              ))}

              <div className={styles.carrierStatusNotice}>
                <div className={styles.carrierDot}></div>
                <span>
                  <strong>Carrier Gateway:</strong> Ethio Telecom & Safaricom Tier-1 Multi-Carrier Fallback Active (100% Delivery Confidence)
                </span>
              </div>
            </div>

            {/* Mobile Device Mockup */}
            <div className={styles.phoneWrapper}>
              <div className={styles.phoneDevice}>
                {/* Phone Speaker & Notch */}
                <div className={styles.phoneNotch}>
                  <div className={styles.phoneSpeaker}></div>
                  <div className={styles.phoneCamera}></div>
                </div>

                {/* Phone Screen */}
                <div className={styles.phoneScreen}>
                  {/* Status Bar */}
                  <div className={styles.phoneStatusBar}>
                    <span>{currentTime || "09:41"}</span>
                    <div className={styles.phoneIcons}>
                      <HiSignal />
                      <span>5G</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* SMS Header */}
                  <div className={styles.phoneSmsHeader}>
                    <div className={styles.senderAvatar}>
                      <FaGraduationCap />
                    </div>
                    <div className={styles.senderDetails}>
                      <strong className={styles.senderName}>{selectedSms.sender}</strong>
                      <span className={styles.senderSubtitle}>Verified Institutional Sender ID</span>
                    </div>
                  </div>

                  {/* SMS Thread */}
                  <div className={styles.phoneChatArea}>
                    <div className={styles.chatTimestamp}>Today, {selectedSms.time}</div>

                    <div className={styles.chatBubble}>
                      <div className={styles.bubbleTag}>
                        <HiSparkles /> {selectedSms.category}
                      </div>
                      <p className={styles.bubbleText}>
                        {smsLang === "am" ? selectedSms.messageAm : selectedSms.messageEn}
                      </p>
                      <div className={styles.bubbleMeta}>
                        <span>{selectedSms.time}</span>
                        <span>• Delivered via Smart SMS Gateway</span>
                      </div>
                    </div>

                    <div className={styles.simulationPill}>
                      <HiCheckCircle /> SMS Delivered in 0.4s to Guardian Mobile
                    </div>
                  </div>

                  {/* Phone Bottom Bar */}
                  <div className={styles.phoneHomeBar}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE SCHOOL ROI & SAVINGS CALCULATOR */}
      <section id="calculator" className={styles.calculatorSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiCalculator /> Institutional Financial Impact
            </span>
            <h2 className={styles.sectionTitle}>
              Calculate Your School's Operational Savings & Tuition Recovery
            </h2>
            <p className={styles.sectionDesc}>
              Discover how much uncollected tuition revenue your institution can recover and how many administrative hours your faculty will save by switching from manual workflows to Smart SMS.
            </p>
          </div>

          <div className={styles.calculatorCard}>
            <div className={styles.calculatorGrid}>
              {/* Sliders Input Side */}
              <div className={styles.calcInputsCol}>
                <h3 className={styles.calcSubheading}>Your School Parameters</h3>

                {/* Slider 1: Students */}
                <div className={styles.inputGroup}>
                  <div className={styles.sliderHeader}>
                    <label className={styles.sliderLabel}>Student Population</label>
                    <span className={styles.sliderValue}>{studentCount.toLocaleString()} Students</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="3500"
                    step="50"
                    value={studentCount}
                    onChange={(e) => setStudentCount(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                  <div className={styles.sliderRangeLimits}>
                    <span>100</span>
                    <span>1,800</span>
                    <span>3,500+</span>
                  </div>
                </div>

                {/* Slider 2: Term Tuition */}
                <div className={styles.inputGroup}>
                  <div className={styles.sliderHeader}>
                    <label className={styles.sliderLabel}>Average Term Tuition per Student</label>
                    <span className={styles.sliderValue}>ETB {termFee.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="2000"
                    max="35000"
                    step="500"
                    value={termFee}
                    onChange={(e) => setTermFee(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                  <div className={styles.sliderRangeLimits}>
                    <span>ETB 2,000</span>
                    <span>ETB 18,000</span>
                    <span>ETB 35,000+</span>
                  </div>
                </div>

                {/* Slider 3: Uncollected Rate */}
                <div className={styles.inputGroup}>
                  <div className={styles.sliderHeader}>
                    <label className={styles.sliderLabel}>Current Uncollected / Overdue Fee Rate</label>
                    <span className={styles.sliderValue}>{uncollectedRate}% of Invoices</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={uncollectedRate}
                    onChange={(e) => setUncollectedRate(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                  <div className={styles.sliderRangeLimits}>
                    <span>5% (Low)</span>
                    <span>15% (Typical)</span>
                    <span>30% (High Delinquency)</span>
                  </div>
                </div>

                <div className={styles.calcNoticeBox}>
                  <HiArrowTrendingUp className={styles.noticeIcon} />
                  <span>
                    Smart SMS automated SMS billing reminders reduce uncollected student fees by an average of <strong>65%</strong> within 30 days.
                  </span>
                </div>
              </div>

              {/* Dynamic Outputs Side */}
              <div className={styles.calcOutputsCol}>
                <div className={styles.outputsHeader}>
                  <span className={styles.outputTag}>Estimated Term Returns</span>
                  <h4 className={styles.outputMainFigure}>
                    + ETB {netTermBenefit.toLocaleString()}
                  </h4>
                  <span className={styles.outputSub}>Total Net Operational Value per Academic Term</span>
                </div>

                <div className={styles.metricsPillsGrid}>
                  <div className={styles.metricPill}>
                    <div className={styles.pillTop}>
                      <HiCreditCard className={styles.pillIcon} />
                      <span>Recovered Tuition</span>
                    </div>
                    <strong className={styles.pillVal}>
                      ETB {recoveredReceivables.toLocaleString()}
                    </strong>
                    <span className={styles.pillCaption}>From automated SMS payment reminders</span>
                  </div>

                  <div className={styles.metricPill}>
                    <div className={styles.pillTop}>
                      <HiClock className={styles.pillIcon} />
                      <span>Faculty Time Saved</span>
                    </div>
                    <strong className={styles.pillVal}>
                      {hoursSavedPerTerm.toLocaleString()} hrs
                    </strong>
                    <span className={styles.pillCaption}>On marks, attendance & parent calls</span>
                  </div>

                  <div className={styles.metricPill}>
                    <div className={styles.pillTop}>
                      <HiDocumentText className={styles.pillIcon} />
                      <span>Paperless Savings</span>
                    </div>
                    <strong className={styles.pillVal}>
                      ETB {paperSavings.toLocaleString()}
                    </strong>
                    <span className={styles.pillCaption}>In printed report cards, slips & ink</span>
                  </div>

                  <div className={styles.metricPill}>
                    <div className={styles.pillTop}>
                      <HiBolt className={styles.pillIcon} />
                      <span>Annual Potential</span>
                    </div>
                    <strong className={styles.pillVal}>
                      ETB {(netTermBenefit * 3).toLocaleString()}
                    </strong>
                    <span className={styles.pillCaption}>Projected across 3 academic terms</span>
                  </div>
                </div>

                <div className={styles.calcCtaWrapper}>
                  <Link href="/contact" className={styles.calcCtaBtn}>
                    <span>Lock In These Operational Gains for Your Campus</span>
                    <HiArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE PLATFORM MODULES (SIX PILLARS) */}
      <section id="features" className={styles.modulesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiAcademicCap /> Comprehensive Educational Platform
            </span>
            <h2 className={styles.sectionTitle}>
              Six Pillars of Flawless Institutional Command
            </h2>
            <p className={styles.sectionDesc}>
              Engineered specifically for K-12 schools, academies, and multi-campus institutions. Replace disjointed spreadsheets with one unified, secure platform.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            {MODULES.map((mod, i) => (
              <div key={i} className={styles.moduleCard} id={mod.id}>
                <div className={`${styles.modIconWrap} ${styles[`modIcon_${mod.accent}`]}`}>
                  {mod.icon}
                </div>
                <h3 className={styles.moduleTitle}>{mod.title}</h3>
                <p className={styles.moduleDesc}>{mod.desc}</p>
                <ul className={styles.modulePoints}>
                  {mod.points.map((pt, idx) => (
                    <li key={idx}>
                      <HiCheckCircle className={styles.pointCheck} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className={styles.moduleCtaBox}>
            <div className={styles.moduleCtaText}>
              <h3>Need a customized workflow, regional SMS gateway, or multi-campus setup?</h3>
              <p>Smart SMS supports custom grading formulas, Ethiopian progressive payroll, and scalable campus hierarchies.</p>
            </div>
            <Link href="/contact" className={styles.moduleCtaBtn}>
              Consult with an Engineer <HiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. MULTI-ROLE EXPERIENCE WORKSPACES */}
      <section className={styles.rolesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiShieldCheck /> Role-Tailored Workspaces
            </span>
            <h2 className={styles.sectionTitle}>Built for Every Stakeholder in the School Community</h2>
            <p className={styles.sectionDesc}>
              A dedicated, intuitive interface tailored specifically for administrators, educators, parents, and students.
            </p>
          </div>

          {/* Role Tabs */}
          <div className={styles.roleTabs}>
            {ROLES_DATA.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.roleTabBtn} ${
                  activeRole.id === item.id ? styles.roleTabActive : ""
                }`}
                onClick={() => setActiveRole(item)}
              >
                <span>{item.role}</span>
                <span className={styles.roleTabBadge}>{item.badge}</span>
              </button>
            ))}
          </div>

          {/* Active Role Showcase Card */}
          <div className={styles.roleCard}>
            <div className={styles.roleCardContent}>
              <span className={styles.roleCardBadge}>{activeRole.mockBadge}</span>
              <h3 className={styles.roleCardTitle}>{activeRole.title}</h3>
              <p className={styles.roleCardDesc}>{activeRole.description}</p>
              <div className={styles.roleHighlightsGrid}>
                {activeRole.highlights.map((h, idx) => (
                  <div key={idx} className={styles.roleHighlightItem}>
                    <HiCheckCircle className={styles.roleCheck} />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
              <div className={styles.roleActionRow}>
                <Link href="/login" className={styles.rolePrimaryBtn}>
                  Enter {activeRole.role} Portal <HiArrowRight />
                </Link>
                <Link href="/features" className={styles.roleSecondaryBtn}>
                  Explore Technical Specs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECURITY, ENCRYPTION & ENTERPRISE COMPLIANCE */}
      <section className={styles.securitySection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiLockClosed /> Enterprise Trust & Protection
            </span>
            <h2 className={styles.sectionTitle}>Bank-Grade Security for Sensitive Student & Financial Data</h2>
            <p className={styles.sectionDesc}>
              Institutions trust Smart SMS with their most critical academic records and treasury transactions. We engineer security into every layer of our stack.
            </p>
          </div>

          <div className={styles.securityGrid}>
            {SECURITY_PILLARS.map((sec, i) => (
              <div key={i} className={styles.securityCard}>
                <div className={styles.securityIconWrap}>{sec.icon}</div>
                <div className={styles.securityBadge}>{sec.badge}</div>
                <h3 className={styles.securityTitle}>{sec.title}</h3>
                <p className={styles.securityDesc}>{sec.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. VERIFIED SCHOOL LEADERSHIP TESTIMONIALS */}
      <section className={styles.testimonialsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <FaQuoteLeft /> Proven Institutional Impact
            </span>
            <h2 className={styles.sectionTitle}>Loved by School Leaders, Bursars & Parents</h2>
            <p className={styles.sectionDesc}>
              See how educational institutions are transforming daily operations and boosting parent trust with Smart SMS.
            </p>
          </div>

          <div className={styles.testimonialsGrid}>
            <div className={styles.testimonialCard}>
              <div className={styles.quoteIcon}>
                <FaQuoteLeft />
              </div>
              <p className={styles.quoteText}>
                "The automated SMS attendance feature alone eliminated hundreds of morning phone calls from worried parents. Gradebook calculations that used to take our teachers a week now take less than an hour."
              </p>
              <div className={styles.quoteAuthor}>
                <div className={styles.authorAvatar}>👨‍💼</div>
                <div>
                  <h4 className={styles.authorName}>Dr. Daniel Tadesse</h4>
                  <span className={styles.authorRole}>Principal, Horizon International Academy</span>
                </div>
              </div>
            </div>

            <div className={styles.testimonialCard}>
              <div className={styles.quoteIcon}>
                <FaQuoteLeft />
              </div>
              <p className={styles.quoteText}>
                "Our tuition fee collection rate jumped from 75% to 96% within the first term of deploying Smart SMS. Parents appreciate the instant SMS receipts and transparent balance alerts."
              </p>
              <div className={styles.quoteAuthor}>
                <div className={styles.authorAvatar}>👩‍💼</div>
                <div>
                  <h4 className={styles.authorName}>Sara Mekonnen</h4>
                  <span className={styles.authorRole}>Finance Director, YOYO Academy</span>
                </div>
              </div>
            </div>

            <div className={styles.testimonialCard}>
              <div className={styles.quoteIcon}>
                <FaQuoteLeft />
              </div>
              <p className={styles.quoteText}>
                "As a parent with two kids in school, receiving instant SMS updates for test results and daily arrival times gives me total peace of mind. The portal is clear, fast, and easy to use."
              </p>
              <div className={styles.quoteAuthor}>
                <div className={styles.authorAvatar}>👨‍👧</div>
                <div>
                  <h4 className={styles.authorName}>Dawit Haile</h4>
                  <span className={styles.authorRole}>Parent & PTA Committee Member</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FREQUENTLY ASKED QUESTIONS */}
      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiSparkles /> Got Questions?
            </span>
            <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            <p className={styles.sectionDesc}>
              Everything you need to know about implementing Smart SMS in your institution.
            </p>
          </div>

          <div className={styles.faqList}>
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`${styles.faqCard} ${openFaq === i ? styles.faqOpen : ""}`}
                onClick={() => toggleFaq(i)}
              >
                <div className={styles.faqQuestion}>
                  <span>{faq.q}</span>
                  <div className={styles.faqToggleIcon}>
                    {openFaq === i ? <HiChevronUp /> : <HiChevronDown />}
                  </div>
                </div>
                {openFaq === i && <div className={styles.faqAnswer}>{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FINAL HIGH-CONVERSION CTA */}
      <section className={styles.closingCtaSection}>
        <div className={styles.container}>
          <div className={styles.closingCtaCard}>
            <div className={styles.ctaGlow}></div>
            <div className={styles.closingContent}>
              <span className={styles.closingTag}>
                <HiSparkles /> Ready to Modernize Your Campus?
              </span>
              <h2 className={styles.closingTitle}>
                Start Transforming Your School Administration Today
              </h2>
              <p className={styles.closingDesc}>
                Join leading schools using Smart SMS to automate parent communication, streamline academic records, and elevate institutional excellence.
              </p>
              <div className={styles.closingButtons}>
                <Link href="/login" className={styles.closingPrimaryBtn}>
                  <span>Sign In to School Portal</span>
                  <HiArrowRight />
                </Link>
                <Link href="/contact" className={styles.closingSecondaryBtn}>
                  <span>Schedule a Personalized Demo</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
