"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import studentService from "@/services/studentService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import styles from "./edit.module.css";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"];

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [form, setForm] = useState({
    admissionNumber: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    admissionDate: "",
    email: "",
    phone: "",
    parentId: "",
    sectionId: "",
    address: "",
    status: "ACTIVE",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingPage(true);

        // Load student data
        const student = await studentService.getStudentById(params.id);
        setForm({
          admissionNumber: student.admission_number || "",
          firstName: student.first_name || "",
          lastName: student.last_name || "",
          gender: student.gender || "MALE",
          dateOfBirth: student.date_of_birth ? student.date_of_birth.substring(0, 10) : "",
          admissionDate: student.admission_date ? student.admission_date.substring(0, 10) : "",
          email: student.email || "",
          phone: student.phone || "",
          parentId: student.parent_id || "",
          sectionId: student.section_id || "",
          address: student.address || "",
          status: student.status || "ACTIVE",
        });

        // Load all grades
        const gradesData = await gradeService.listGrades({ limit: 100, offset: 0 });
        setGrades(gradesData.items || []);

        // If student has a section, find its grade to pre-select
        if (student.section_id) {
          try {
            const sectionData = await sectionService.getSectionById(student.section_id);
            if (sectionData) {
              const gradeId = sectionData.grade_id || "";
              setSelectedGradeId(gradeId);

              // Load sections for that grade
              if (gradeId) {
                const sectionsData = await sectionService.listSections({ gradeId, limit: 200, offset: 0 });
                setSections(sectionsData.items || []);
              }
            }
          } catch (err) {
            console.error("Could not load section details:", err);
          }
        }
      } catch (err) {
        setApiError(err.message || "Unable to load student data");
      } finally {
        setLoadingPage(false);
      }
    }

    if (params?.id) {
      loadData();
    }
  }, [params]);

  function handleGradeChange(gradeId) {
    setSelectedGradeId(gradeId);
    setForm((prev) => ({ ...prev, sectionId: "" }));
    setSections([]);

    if (!gradeId) return;

    async function loadSections() {
      try {
        const data = await sectionService.listSections({ gradeId, limit: 200, offset: 0 });
        setSections(data.items || []);
      } catch (err) {
        console.error("Failed to load sections:", err);
      }
    }
    loadSections();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  }

  function validate() {  //this function validates the form fields and returns an object containing any validation errors
    const errs = {};

    if (!form.admissionNumber.trim()) { // this trim() removes any leading or trailing whitespace from the admission number before checking if it's empty
      errs.admissionNumber = "Admission number is required";
    }
    if (!form.firstName.trim()) {
      errs.firstName = "First name is required";
    }
    if (!form.lastName.trim()) {
      errs.lastName = "Last name is required";
    }
    if (!form.admissionDate) {
      errs.admissionDate = "Admission date is required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Enter a valid email address (e.g., name@domain.com)";
    }
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone.trim())) {
      errs.phone = "Phone must be 7-20 characters (digits, spaces, dashes, +, or parentheses)";
    }

    return errs;
  }

  async function handleSubmit(event) { // this function handles the form submission, validates the input, and sends an update request to the server
    event.preventDefault();
    setApiError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      await studentService.updateStudent(params.id, form);
      router.push(`/dashboard/students/${params.id}`);
    } catch (err) {
      setApiError(err.message || "Unable to update student. Please check the form and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingPage) {
    return <div className={styles.loading}>Loading student data...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/students">Students</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href={`/dashboard/students/${params.id}`}>Details</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>Edit</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Edit Student</h1>
        <p>Update student record for <strong>{form.firstName} {form.lastName}</strong></p>
      </div>

      {/* API Error Banner */}
      {apiError ? (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{apiError}</span>
        </div>
      ) : null}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className={styles.formCard}>
          {/* Section 1: Personal Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>👤</div>
              <div>
                <h3 className={styles.sectionTitle}>Personal Information</h3>
                <p className={styles.sectionSubtitle}>Basic details about the student</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Admission Number<span className={styles.required}>*</span>
                </label>
                <input
                  name="admissionNumber"
                  value={form.admissionNumber}
                  onChange={handleChange}
                  placeholder="e.g. STU-2024-001"
                  className={`${styles.input} ${errors.admissionNumber ? styles.inputError : ""}`}
                />
                {errors.admissionNumber && (
                  <span className={styles.fieldError}><span>✕</span> {errors.admissionNumber}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  First Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                />
                {errors.firstName && (
                  <span className={styles.fieldError}><span>✕</span> {errors.firstName}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Last Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                />
                {errors.lastName && (
                  <span className={styles.fieldError}><span>✕</span> {errors.lastName}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange} className={styles.select}>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Date of Birth</label>
                <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} className={styles.input} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Admission Date<span className={styles.required}>*</span>
                </label>
                <input type="date" name="admissionDate" value={form.admissionDate} onChange={handleChange}
                  className={`${styles.input} ${errors.admissionDate ? styles.inputError : ""}`} />
                {errors.admissionDate && (
                  <span className={styles.fieldError}><span>✕</span> {errors.admissionDate}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>📞</div>
              <div>
                <h3 className={styles.sectionTitle}>Contact Details</h3>
                <p className={styles.sectionSubtitle}>Email and phone information for the student</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="john.doe@school.edu"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`} />
                {errors.email && <span className={styles.fieldError}><span>✕</span> {errors.email}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Phone Number</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  className={`${styles.input} ${errors.phone ? styles.inputError : ""}`} />
                {errors.phone && <span className={styles.fieldError}><span>✕</span> {errors.phone}</span>}
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Address</label>
                <textarea name="address" value={form.address} onChange={handleChange}
                  placeholder="123 Main Street, City, State, ZIP" rows={3} className={styles.textarea} />
              </div>
            </div>
          </div>

          {/* Section 3: Academic Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>🏫</div>
              <div>
                <h3 className={styles.sectionTitle}>Academic Information</h3>
                <p className={styles.sectionSubtitle}>Grade, section, and status details</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Grade</label>
                <select name="grade" value={selectedGradeId}
                  onChange={(e) => handleGradeChange(e.target.value)} className={styles.select}>
                  <option value="">-- Select Grade --</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Section</label>
                <select name="sectionId" value={form.sectionId} onChange={handleChange}
                  className={styles.select} disabled={!selectedGradeId}>
                  <option value="">-- Select Section --</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} {sec.room_number ? `(${sec.room_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Parent ID</label>
                <input name="parentId" value={form.parentId} onChange={handleChange}
                  placeholder="UUID of the parent" className={styles.input} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} className={styles.select}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href={`/dashboard/students/${params.id}`} className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <><span className={styles.spinner}></span> Saving...</>
              ) : (
                <>💾 Update Student</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

