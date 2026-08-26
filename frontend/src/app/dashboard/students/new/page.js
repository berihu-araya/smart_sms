"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUserPlus, FaUserTie, FaSchool, FaPhoneAlt, FaCheckCircle, FaSearch } from "react-icons/fa";
import studentService from "@/services/studentService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import parentService from "@/services/parentService";
import styles from "./new.module.css";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"];
const RELATIONSHIPS = ["FATHER", "MOTHER", "GUARDIAN", "BROTHER", "SISTER", "UNCLE", "AUNT", "OTHER"];
const getTodayDateString = () => new Date().toISOString().split("T")[0];

export default function NewStudentPage() {
  const router = useRouter();
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [parentsList, setParentsList] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Parent mode: "new" (auto-register) or "existing" (select already created parent)
  const [parentMode, setParentMode] = useState("new");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    admissionDate: getTodayDateString(),
    email: "",
    phone: "",
    sectionId: "",
    address: "",
    status: "ACTIVE",
    // Existing parent selection
    parentId: "",
    // Auto-register new parent fields
    parentFullName: "",
    parentRelationship: "GUARDIAN",
    parentPhone: "",
    parentEmail: "",
    parentOccupation: "",
    parentAddress: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("Generated on save");

  // Load grades and existing parents for selection
  useEffect(() => {
    async function loadOptions() {
      try {
        setLoadingOptions(true);
        const [gradesData, parentsData] = await Promise.all([
          gradeService.listGrades({ limit: 100, offset: 0 }).catch(() => ({ items: [] })),
          parentService.listParents({ limit: 200, offset: 0 }).catch(() => ({ items: [] })),
        ]);
        setGrades(gradesData.items || []);
        setParentsList(parentsData.items || []);
      } catch (err) {
        console.error("Failed to load options:", err);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

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

  function validate() {
    const errs = {};

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
      errs.phone = "Phone must be 7-20 characters";
    }

    // Parent validation based on mode
    if (parentMode === "new") {
      if (!form.parentFullName.trim()) {
        errs.parentFullName = "Guardian full name is required for registration";
      }
      if (form.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail.trim())) {
        errs.parentEmail = "Enter a valid guardian email address";
      }
      if (form.parentPhone && !/^[\d\s\-+()]{7,20}$/.test(form.parentPhone.trim())) {
        errs.parentPhone = "Guardian phone must be 7-20 characters";
      }
    } else {
      if (!form.parentId) {
        errs.parentId = "Please select an existing parent/guardian";
      }
    }

    return errs;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        admissionDate: form.admissionDate,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        sectionId: form.sectionId || null,
        address: form.address.trim() || null,
        status: form.status,
      };

      if (parentMode === "new") {
        payload.parent = {
          fullName: form.parentFullName.trim(),
          relationship: form.parentRelationship,
          phone: form.parentPhone.trim() || null,
          email: form.parentEmail.trim() || null,
          occupation: form.parentOccupation.trim() || null,
          address: form.parentAddress.trim() || form.address.trim() || null,
        };
      } else {
        payload.parentId = form.parentId;
      }

      await studentService.createStudent(payload);
      router.push("/dashboard/students");
    } catch (err) {
      setApiError(err.message || "Unable to create student. Please check the form and try again.");
    } finally {
      setSaving(false);
    }
  }

  const filteredParents = parentsList.filter((p) => {
    const q = parentSearch.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/dashboard/students">Students</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>New Student</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Register Student</h1>
        <p>Register a student record. The parent/guardian will be registered automatically in the same step.</p>
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
          {/* Section 1: Student Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>👤</div>
              <div>
                <h3 className={styles.sectionTitle}>Student Personal Information</h3>
                <p className={styles.sectionSubtitle}>Admission details and identity</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Admission Number</label>
                <input
                  value={admissionNumber}
                  readOnly
                  aria-describedby="admission-number-help"
                  className={styles.input}
                />
                <span id="admission-number-help" className={styles.fieldHint}>
                  Generated automatically from the active academic year
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  First Name<span className={styles.required}>*</span>
                </label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="e.g. Dawit"
                  className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                />
                {errors.firstName && (
                  <span className={styles.fieldError}>✕ {errors.firstName}</span>
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
                  placeholder="e.g. Haile"
                  className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                />
                {errors.lastName && (
                  <span className={styles.fieldError}>✕ {errors.lastName}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Admission Date<span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="admissionDate"
                  value={form.admissionDate}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.admissionDate ? styles.inputError : ""}`}
                />
                {errors.admissionDate && (
                  <span className={styles.fieldError}>✕ {errors.admissionDate}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Student Email (Optional)</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="student@school.edu"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                />
                {errors.email && <span className={styles.fieldError}>✕ {errors.email}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Student Phone (Optional)</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+251 9..."
                  className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                />
                {errors.phone && <span className={styles.fieldError}>✕ {errors.phone}</span>}
              </div>
            </div>
          </div>

          {/* Section 2: Parent / Guardian Details (Automatic Registration) */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon} style={{ background: "#f0fdf4", color: "#16a34a" }}>
                👨‍👩‍👧‍👦
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Parent / Guardian Information</h3>
                <p className={styles.sectionSubtitle}>
                  Parent record is automatically created and linked to this student
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeToggleBtn} ${
                  parentMode === "new" ? styles.modeToggleBtnActive : ""
                }`}
                onClick={() => setParentMode("new")}
              >
                + Register New Guardian
              </button>
              <button
                type="button"
                className={`${styles.modeToggleBtn} ${
                  parentMode === "existing" ? styles.modeToggleBtnActive : ""
                }`}
                onClick={() => setParentMode("existing")}
              >
                🔗 Link Existing Guardian ({parentsList.length})
              </button>
            </div>

            {parentMode === "new" ? (
              <>
                <div className={styles.infoBadge}>
                  <FaCheckCircle color="#2563eb" />
                  <span>
                    <strong>Automatic Registration:</strong> Filling this form creates both the student and the parent record in one transaction.
                  </span>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Guardian Full Name<span className={styles.required}>*</span>
                    </label>
                    <input
                      name="parentFullName"
                      value={form.parentFullName}
                      onChange={handleChange}
                      placeholder="e.g. Haile Gebreselassie"
                      className={`${styles.input} ${
                        errors.parentFullName ? styles.inputError : ""
                      }`}
                    />
                    {errors.parentFullName && (
                      <span className={styles.fieldError}>✕ {errors.parentFullName}</span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Relationship</label>
                    <select
                      name="parentRelationship"
                      value={form.parentRelationship}
                      onChange={handleChange}
                      className={styles.select}
                    >
                      {RELATIONSHIPS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel.charAt(0) + rel.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Guardian Phone Number</label>
                    <input
                      name="parentPhone"
                      type="tel"
                      value={form.parentPhone}
                      onChange={handleChange}
                      placeholder="+251 91 234 5678"
                      className={`${styles.input} ${errors.parentPhone ? styles.inputError : ""}`}
                    />
                    {errors.parentPhone && (
                      <span className={styles.fieldError}>✕ {errors.parentPhone}</span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Guardian Email Address</label>
                    <input
                      name="parentEmail"
                      type="email"
                      value={form.parentEmail}
                      onChange={handleChange}
                      placeholder="parent@example.com"
                      className={`${styles.input} ${errors.parentEmail ? styles.inputError : ""}`}
                    />
                    {errors.parentEmail && (
                      <span className={styles.fieldError}>✕ {errors.parentEmail}</span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Occupation / Profession</label>
                    <input
                      name="parentOccupation"
                      value={form.parentOccupation}
                      onChange={handleChange}
                      placeholder="e.g. Architect / Teacher / Trader"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Residential Address</label>
                    <input
                      name="parentAddress"
                      value={form.parentAddress}
                      onChange={handleChange}
                      placeholder="e.g. Bole Sub-city, Woreda 03, House 450"
                      className={styles.input}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label}>
                    Select Existing Parent / Guardian<span className={styles.required}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      placeholder="Filter parents by name or phone..."
                      className={styles.input}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <select
                    name="parentId"
                    value={form.parentId}
                    onChange={handleChange}
                    className={`${styles.select} ${errors.parentId ? styles.inputError : ""}`}
                  >
                    <option value="">-- Choose Existing Parent ({filteredParents.length} available) --</option>
                    {filteredParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} {p.phone ? `(${p.phone})` : ""} — {p.occupation || "Parent"}
                      </option>
                    ))}
                  </select>
                  {errors.parentId && (
                    <span className={styles.fieldError}>✕ {errors.parentId}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Academic Placement */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon} style={{ background: "#fef3c7", color: "#d97706" }}>
                🏫
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Academic Allocation</h3>
                <p className={styles.sectionSubtitle}>Grade and classroom section placement</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Grade Level</label>
                <select
                  name="grade"
                  value={selectedGradeId}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className={styles.select}
                  disabled={loadingOptions}
                >
                  <option value="">-- Select Grade --</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Section</label>
                <select
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={!selectedGradeId || loadingOptions}
                >
                  <option value="">
                    {selectedGradeId ? "-- Select Section --" : "-- Select Grade First --"}
                  </option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} {sec.room_number ? `(${sec.room_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Enrollment Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <Link href="/dashboard/students" className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Registering Student & Guardian...
                </>
              ) : (
                "Save Student & Guardian"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
