"use client";

import { useState, useEffect } from "react";
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
    message:
      "Good morning Mr. Samuel. Alex has arrived safely at school and was marked PRESENT at 08:15 AM today. Thank you, YOYO Academy.",
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
    message:
      "YOYO Academy Notice: Liya's Term 2 Final Report Card has been published! Average: 94.6% (Rank: 1st/45). View the complete transcript on your Parent Portal.",
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
    message:
      "Payment Received! ETB 6,200 has been credited for Dawit's Term 3 Tuition Fee. Remaining balance: ETB 0.00. Receipt #REC-2026-904. Thank you!",
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
    message:
      "Dear Parents & Guardians, please note that tomorrow Friday is our Annual Science Fair from 9:00 AM to 1:00 PM. Parents are warmly invited to attend!",
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
    q: "How do we get started with Smart SMS for our school?",
    a: "You can click 'Book Demo' or 'Sign In' right away. Our team provides guided onboarding, system configuration, staff training, and dedicated technical support to get your campus running smoothly.",
  },
];

export default function HomeLandingClient() {
  const [selectedSms, setSelectedSms] = useState(SMS_SCENARIOS[0]);
  const [activeRole, setActiveRole] = useState(ROLES_DATA[0]);
  const [openFaq, setOpenFaq] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState("annual");
  const [currentTime, setCurrentTime] = useState("");

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

  return (
    <div className={styles.landingPage}>
      {/* 1. HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroGlowOverlay}></div>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            {/* Left Hero Content */}
            <div className={styles.heroTextCol}>
              <div className={styles.versionBadge}>
                <span className={styles.pulseDot}></span>
                <span className={styles.versionText}>
                  ✨ Smart SMS Operating System • Version 2.4 Active
                </span>
              </div>

              <h1 className={styles.heroHeading}>
                The <span className={styles.goldGradientText}>Intelligent</span> Operating System for Modern Schools
              </h1>

              <p className={styles.heroSubheading}>
                Unify student information, automated parent SMS notifications, digital gradebooks, fee reconciliation, and class timetables into one synchronized cloud platform.
              </p>

              {/* Action Buttons */}
              <div className={styles.heroCtaGroup}>
                <Link href="/login" className={styles.primaryCta}>
                  <span>Access School Portal</span>
                  <HiArrowRight className={styles.btnIcon} />
                </Link>

                <Link href="/contact" className={styles.secondaryCta}>
                  <HiSparkles className={styles.sparkleCta} />
                  <span>Request Live Demo</span>
                </Link>

                <Link href="/features" className={styles.ghostCta}>
                  <span>Explore Modules</span>
                  <HiArrowTopRightOnSquare className={styles.ghostIcon} />
                </Link>
              </div>

              {/* Trust Badges */}
              <div className={styles.heroTrustStrip}>
                <div className={styles.trustItem}>
                  <HiCheckCircle className={styles.trustIcon} />
                  <span>150+ Schools Enrolled</span>
                </div>
                <div className={styles.trustItem}>
                  <HiCheckCircle className={styles.trustIcon} />
                  <span>99.9% Instant SMS Delivery</span>
                </div>
                <div className={styles.trustItem}>
                  <HiCheckCircle className={styles.trustIcon} />
                  <span>100% Paperless Workflows</span>
                </div>
              </div>
            </div>

            {/* Right Hero Live Interactive Mock Dashboard */}
            <div className={styles.heroVisualCol}>
              <div className={styles.mockDashboardWindow}>
                {/* Window Bar */}
                <div className={styles.windowHeader}>
                  <div className={styles.windowDots}>
                    <span className={styles.dotRed}></span>
                    <span className={styles.dotYellow}></span>
                    <span className={styles.dotGreen}></span>
                  </div>
                  <div className={styles.windowTitle}>
                    <HiBuildingOffice2 /> YOYO Academy • Live Operations Hub
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
                    <span className={styles.kpiBadge}>+14% Term 2</span>
                  </div>
                  <div className={styles.mockKpiCard}>
                    <span className={styles.kpiLabel}>Today's Attendance</span>
                    <span className={styles.kpiVal}>98.6%</span>
                    <span className={styles.kpiBadgeSuccess}>1,461 Present</span>
                  </div>
                  <div className={styles.mockKpiCard}>
                    <span className={styles.kpiLabel}>SMS Gateway</span>
                    <span className={styles.kpiVal}>Active</span>
                    <span className={styles.kpiBadgeGold}>0.8s Latency</span>
                  </div>
                  <div className={styles.mockKpiCard}>
                    <span className={styles.kpiLabel}>Fee Collection</span>
                    <span className={styles.kpiVal}>94.8%</span>
                    <span className={styles.kpiBadge}>On Schedule</span>
                  </div>
                </div>

                {/* Real-time Activity Logs */}
                <div className={styles.mockActivityFeed}>
                  <div className={styles.feedHeader}>
                    <span className={styles.feedTitle}>
                      <HiSignal className={styles.feedIcon} /> Live School Event Stream
                    </span>
                    <span className={styles.feedBadge}>Auto-Dispatched</span>
                  </div>

                  <div className={styles.feedList}>
                    <div className={styles.feedItem}>
                      <div className={`${styles.feedDot} ${styles.feedDotGreen}`}></div>
                      <div className={styles.feedBody}>
                        <div className={styles.feedRow}>
                          <strong>Attendance SMS Dispatched</strong>
                          <span className={styles.feedTime}>Just now</span>
                        </div>
                        <p>Grade 10B roll call finalized (42 SMS delivered to parents)</p>
                      </div>
                    </div>

                    <div className={styles.feedItem}>
                      <div className={`${styles.feedDot} ${styles.feedDotBlue}`}></div>
                      <div className={styles.feedBody}>
                        <div className={styles.feedRow}>
                          <strong>Term 2 Exam Gradebook Synced</strong>
                          <span className={styles.feedTime}>3m ago</span>
                        </div>
                        <p>Mathematics Midterm marks submitted by Mr. Abebe (Grade 9A)</p>
                      </div>
                    </div>

                    <div className={styles.feedItem}>
                      <div className={`${styles.feedDot} ${styles.feedDotGold}`}></div>
                      <div className={styles.feedBody}>
                        <div className={styles.feedRow}>
                          <strong>Tuition Fee Receipt Triggered</strong>
                          <span className={styles.feedTime}>8m ago</span>
                        </div>
                        <p>ETB 4,500 receipt #REC-8921 sent to parent of Liya Bekele</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className={styles.mockFooter}>
                  <span>🔒 256-bit Role-Based Encrypted System</span>
                  <Link href="/login" className={styles.mockDirectBtn}>
                    Enter Portal →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS IMPACT BANNER */}
      <section className={styles.statsBanner}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>150+</span>
              <span className={styles.statLabel}>Schools & Academies Powered</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>500K+</span>
              <span className={styles.statLabel}>Automated Parent SMS Delivered</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>99.99%</span>
              <span className={styles.statLabel}>Server & Carrier Uptime SLA</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>12 hrs</span>
              <span className={styles.statLabel}>Average Admin Time Saved / Week</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE SMS SIMULATOR PLAYGROUND */}
      <section className={styles.simulatorSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiBolt /> Live SMS Automation Engine
            </span>
            <h2 className={styles.sectionTitle}>
              Experience Instant School-to-Parent Communication
            </h2>
            <p className={styles.sectionDesc}>
              Smart SMS connects classroom events directly to parents' mobile phones. Click any scenario below to see how our automated SMS gateway formats and delivers real-time notifications.
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
                    <span className={styles.scenarioTarget}>Recipient: {item.student}</span>
                  </div>
                </button>
              ))}
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
                      <span className={styles.senderSubtitle}>Verified School Sender ID</span>
                    </div>
                  </div>

                  {/* SMS Thread */}
                  <div className={styles.phoneChatArea}>
                    <div className={styles.chatTimestamp}>Today, {selectedSms.time}</div>

                    <div className={styles.chatBubble}>
                      <div className={styles.bubbleTag}>
                        <HiSparkles /> {selectedSms.category}
                      </div>
                      <p className={styles.bubbleText}>{selectedSms.message}</p>
                      <div className={styles.bubbleMeta}>
                        <span>{selectedSms.time}</span>
                        <span>• Delivered via TeleSMS</span>
                      </div>
                    </div>

                    <div className={styles.simulationPill}>
                      <HiCheckCircle /> SMS Delivered in 0.4s to Parent Mobile
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

      {/* 4. CORE PLATFORM MODULES GRID */}
      <section id="features" className={styles.modulesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiAcademicCap /> Comprehensive Platform
            </span>
            <h2 className={styles.sectionTitle}>
              Everything Your School Needs to Run Flawlessly
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
              <h3>Need a customized workflow or multi-campus setup?</h3>
              <p>Smart SMS supports custom grading formulas, regional SMS carriers, and scalable campus hierarchies.</p>
            </div>
            <Link href="/contact" className={styles.moduleCtaBtn}>
              Consult with an Engineer <HiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. MULTI-ROLE EXPERIENCE */}
      <section className={styles.rolesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <HiShieldCheck /> Role-Tailored Workspaces
            </span>
            <h2 className={styles.sectionTitle}>Built for Every Stakeholder in the School Community</h2>
            <p className={styles.sectionDesc}>
              A dedicated, intuitive interface tailored specifically for administrators, teachers, parents, and students.
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
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className={styles.testimonialsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              <FaQuoteLeft /> Proven Impact
            </span>
            <h2 className={styles.sectionTitle}>Loved by School Leaders & Parents</h2>
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

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
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

      {/* 8. FINAL HIGH-CONVERSION CTA */}
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
