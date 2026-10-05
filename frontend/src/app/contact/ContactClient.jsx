"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiSparkles,
  HiEnvelope,
  HiPhone,
  HiMapPin,
  HiCheckCircle,
  HiArrowRight,
  HiShieldCheck,
  HiBuildingOffice2,
} from "react-icons/hi2";
import styles from "./contact.module.css";

export default function ContactClient() {
  const [formData, setFormData] = useState({
    fullName: "",
    schoolName: "",
    email: "",
    phone: "",
    studentsCount: "100-500",
    role: "School Principal / Owner",
    inquiryType: "Schedule Live Demo",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className={styles.contactPage}>
      {/* 1. HERO HEADER */}
      <section className={styles.contactHero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrowTag}>
              <HiSparkles /> Contact & Demo Desk
            </span>
            <h1 className={styles.heroTitle}>
              Connect with Our <span className={styles.goldText}>School Technology Specialists</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Whether you are looking to deploy Smart SMS for your academy, request a tailored demonstration, or integrate custom SMS carrier gateways, our team is ready to help.
            </p>
          </div>
        </div>
      </section>

      {/* 2. MAIN FORM & INFO GRID */}
      <section className={styles.mainContactSection}>
        <div className={styles.container}>
          <div className={styles.contactGrid}>
            {/* Left: Interactive Demo / Inquiry Form */}
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Request a Guided Walkthrough or Inquiry</h2>
                <p className={styles.formSubtitle}>
                  Fill out the details below and an engineering specialist will prepare a customized test environment for your institution.
                </p>
              </div>

              {submitted ? (
                <div className={styles.successCard}>
                  <HiCheckCircle className={styles.successIcon} />
                  <h3 className={styles.successTitle}>Inquiry Received Successfully!</h3>
                  <p className={styles.successText}>
                    Thank you, <strong>{formData.fullName}</strong>. A dedicated Smart SMS specialist has received your request for <strong>{formData.schoolName}</strong> and will contact you via email ({formData.email}) or phone ({formData.phone}) within one business day.
                  </p>
                  <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        fullName: "",
                        schoolName: "",
                        email: "",
                        phone: "",
                        studentsCount: "100-500",
                        role: "School Principal / Owner",
                        inquiryType: "Schedule Live Demo",
                        message: "",
                      });
                    }}
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className={styles.formGroupGrid}>
                    <div className={styles.inputFieldWrap}>
                      <label className={styles.inputLabel}>Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Dr. Daniel Tadesse"
                        className={styles.textInput}
                      />
                    </div>

                    <div className={styles.inputFieldWrap}>
                      <label className={styles.inputLabel}>School / Institution Name *</label>
                      <input
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Horizon Academy"
                        className={styles.textInput}
                      />
                    </div>

                    <div className={styles.inputFieldWrap}>
                      <label className={styles.inputLabel}>Official Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="admin@school.edu.et"
                        className={styles.textInput}
                      />
                    </div>

                    <div className={styles.inputFieldWrap}>
                      <label className={styles.inputLabel}>Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="+251 91 123 4567"
                        className={styles.textInput}
                      />
                    </div>

                    <div className={styles.inputFieldWrap}>
                      <label className={styles.inputLabel}>Approximate Student Enrollment</label>
                      <select
                        name="studentsCount"
                        value={formData.studentsCount}
                        onChange={handleChange}
                        className={styles.selectInput}
                      >
                        <option value="Under 200">Under 200 Students</option>
                        <option value="200-500">200 – 500 Students</option>
                        <option value="500-1,500">500 – 1,500 Students</option>
                        <option value="1,500-3,000">1,500 – 3,000 Students</option>
                        <option value="3,000+ Multi-Campus">3,000+ Multi-Campus Network</option>
                      </select>
                    </div>

                    <div className={styles.inputFieldWrap}>
                      <label className={styles.inputLabel}>Your Role in the School</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={styles.selectInput}
                      >
                        <option value="School Principal / Owner">School Principal / Owner</option>
                        <option value="Academic Director / Vice Principal">Academic Director / Vice Principal</option>
                        <option value="IT Administrator / System Manager">IT Administrator / System Manager</option>
                        <option value="Finance & Accounting Officer">Finance & Accounting Officer</option>
                        <option value="Teacher / Faculty Member">Teacher / Faculty Member</option>
                        <option value="Parent / Guardian">Parent / Guardian</option>
                      </select>
                    </div>

                    <div className={`${styles.inputFieldWrap} ${styles.fullWidth}`}>
                      <label className={styles.inputLabel}>Inquiry Reason</label>
                      <select
                        name="inquiryType"
                        value={formData.inquiryType}
                        onChange={handleChange}
                        className={styles.selectInput}
                      >
                        <option value="Schedule Live Demo">Schedule Live Demo & Walkthrough</option>
                        <option value="Pricing & School Licensing">Pricing & School Licensing Inquiries</option>
                        <option value="Custom SMS Gateway Integration">Custom Telecom / SMS Gateway Setup</option>
                        <option value="Technical Support & Data Migration">Technical Support & Data Migration</option>
                      </select>
                    </div>

                    <div className={`${styles.inputFieldWrap} ${styles.fullWidth}`}>
                      <label className={styles.inputLabel}>Specific Needs or Questions (Optional)</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your current school management setup or any specific requirements..."
                        className={styles.textArea}
                      ></textarea>
                    </div>
                  </div>

                  <button type="submit" className={styles.submitBtn}>
                    <span>Submit Demo Request</span>
                    <HiArrowRight />
                  </button>
                </form>
              )}
            </div>

            {/* Right: Direct Contact & Campus Details */}
            <div className={styles.sidebarCol}>
              <div className={styles.infoCard}>
                <h3 className={styles.infoTitle}>Direct Contact Channels</h3>

                <div className={styles.infoItem}>
                  <HiMapPin className={styles.infoIcon} />
                  <div className={styles.infoDetails}>
                    <strong>Campus & Operations HQ</strong>
                    <span>YOYO Academy Campus, Main Boulevard, Addis Ababa, Ethiopia</span>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <HiEnvelope className={styles.infoIcon} />
                  <div className={styles.infoDetails}>
                    <strong>Email Support Desk</strong>
                    <a href="mailto:support@smart-sms.edu.et">support@smart-sms.edu.et</a>
                    <a href="mailto:info@yoyoacademy.com">info@yoyoacademy.com</a>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <HiPhone className={styles.infoIcon} />
                  <div className={styles.infoDetails}>
                    <strong>Direct Telephones</strong>
                    <a href="tel:+251911000000">+251 (911) 00-0000</a>
                    <a href="tel:+251912000000">+251 (912) 00-0000</a>
                  </div>
                </div>

                <div className={styles.hoursBadge}>
                  <strong>Operational Hours:</strong>
                  <div>Monday – Friday: 8:00 AM – 6:00 PM EAT</div>
                  <div>Saturday: 8:30 AM – 2:00 PM EAT</div>
                </div>
              </div>

              {/* Quick Portal Access */}
              <div className={styles.portalDirectCard}>
                <span className={styles.portalTitle}>Already an Active Partner School?</span>
                <p className={styles.portalDesc}>
                  Access your secure workspace directly to view student rosters, record marks, and manage broadcasts.
                </p>
                <Link href="/login" className={styles.portalBtn}>
                  <span>Log In to School Portal</span>
                  <HiArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
