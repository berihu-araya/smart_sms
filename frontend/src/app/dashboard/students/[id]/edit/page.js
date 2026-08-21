"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import studentService from "@/services/studentService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import parentService from "@/services/parentService";
import styles from "../../new/new.module.css";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"];
const RELATIONSHIPS = ["FATHER", "MOTHER", "GUARDIAN", "BROTHER", "SISTER", "UNCLE", "AUNT", "OTHER"];

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id;

  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [parentsList, setParentsList] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);

  // Guardian mode: "edit" (update existing guardian details) or "select" (link a different parent)
  const [parentMode, setParentMode] = useState("edit");

  const [form, setForm] = useState({
    admissionNumber: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    admissionDate: "",
    email: "",
    phone: "",
    sectionId: "",
    address: "",
    status: "ACTIVE",
    // Guardian fields
    parentId: "",
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

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingPage(true);

        const [student, gradesData, parentsData] = await Promise.all([
          studentService.getStudentById(studentId),
          gradeService.listGrades({ limit: 100, offset: 0 }).catch(() => ({ items: [] })),
          parentService.listParents({ limit: 200, offset: 0 }).catch(() => ({ items: [] })),
        ]);

        setGrades(gradesData.items || []);
        setParentsList(parentsData.items || []);

        setForm({
          admissionNumber: student.admission_number || "",
          firstName: student.first_name || "",
          lastName: student.last_name || "",
          gender: student.gender || "MALE",
          dateOfBirth: student.date_of_birth ? student.date_of_birth.substring(0, 10) : "",
          admissionDate: student.admission_date ? student.admission_date.substring(0, 10) : "",
          email: student.email || "",
          phone: student.phone || "",
          sectionId: student.section_id || "",
          address: student.address || "",
          status: student.status || "ACTIVE",
          parentId: student.parent_id || "",
          parentFullName: student.parent_name || "",
          parentRelationship: student.parent_relationship || "GUARDIAN",
          parentPhone: student.parent_phone || "",
          parentEmail: student.parent_email || "",
          parentOccupation: student.parent_occupation || "",
          parentAddress: student.parent_address || "",
        });

        if (student.section_id) {
          try {
            const sectionData = await sectionService.getSectionById(student.section_id);
            if (sectionData?.grade_id) {
              setSelectedGradeId(sectionData.grade_id);
              const sectionsData = await sectionService.listSections({
                gradeId: sectionData.grade_id,
                limit: 200,
                offset: 0,
              });
              setSections(sectionsData.items || []);
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

    if (studentId) {
      loadData();
    }
  }, [studentId]);

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

    if (!form.admissionNumber.trim()) {
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
      errs.email = "Enter a valid email address";
    }
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone.trim())) {
      errs.phone = "Phone must be 7-20 characters";
    }

    if (parentMode === "edit" && form.parentFullName) {
      if (form.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail.trim())) {
        errs.parentEmail = "Enter a valid parent email";
      }
      if (form.parentPhone && !/^[\d\s\-+()]{7,20}$/.test(form.parentPhone.trim())) {
        errs.parentPhone = "Parent phone must be 7-20 characters";
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
        admissionNumber: form.admissionNumber.trim(),
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

      if (parentMode === "edit" && form.parentFullName.trim()) {
        payload.parent = {
          fullName: form.parentFullName.trim(),
          relationship: form.parentRelationship,
          phone: form.parentPhone.trim() || null,
          email: form.parentEmail.trim() || null,
          occupation: form.parentOccupation.trim() || null,
          address: form.parentAddress.trim() || null,
        };
      } else if (parentMode === "select") {
        payload.parentId = form.parentId || null;
      }

      await studentService.updateStudent(studentId, payload);
      router.push(`/dashboard/students/${studentId}`);
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
        <Link href={`/dashboard/students/${studentId}`}>
          {form.firstName} {form.lastName}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span style={{ color: "#101828", fontWeight: 500 }}>Edit</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Edit Student & Guardian</h1>
        <p>Update personal, guardian, and academic records for <strong>{form.firstName} {form.lastName}</strong></p>
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
          {/* Section 1: Personal Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>👤</div>
              <div>
                <h3 className={styles.sectionTitle}>Personal Information</h3>
                <p className={styles.sectionSubtitle}>Student admission details and identity</p>
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
                  className={`${styles.input} ${errors.admissionNumber ? styles.inputError : ""}`}
                />
                {errors.admissionNumber && (
                  <span className={styles.fieldError}>✕ {errors.admissionNumber}</span>
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
                <label className={styles.label}>Student Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                />
                {errors.email && <span className={styles.fieldError}>✕ {errors.email}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Student Phone</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                />
                {errors.phone && <span className={styles.fieldError}>✕ {errors.phone}</span>}
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label}>Home Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={2}
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Guardian Information */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon} style={{ background: "#f0fdf4", color: "#16a34a" }}>
                👨‍👩‍👧‍👦
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Guardian Information</h3>
                <p className={styles.sectionSubtitle}>Update contact records for the linked parent/guardian</p>
              </div>
            </div>

            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeToggleBtn} ${
                  parentMode === "edit" ? styles.modeToggleBtnActive : ""
                }`}
                onClick={() => setParentMode("edit")}
              >
                ✏️ Edit Current Guardian Details
              </button>
              <button
                type="button"
                className={`${styles.modeToggleBtn} ${
                  parentMode === "select" ? styles.modeToggleBtnActive : ""
                }`}
                onClick={() => setParentMode("select")}
              >
                🔗 Link to Different Existing Guardian
              </button>
            </div>

            {parentMode === "edit" ? (
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Guardian Full Name</label>
                  <input
                    name="parentFullName"
                    value={form.parentFullName}
                    onChange={handleChange}
                    placeholder="e.g. Haile Gebreselassie"
                    className={styles.input}
                  />
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
                  <label className={styles.label}>Guardian Phone</label>
                  <input
                    name="parentPhone"
                    type="tel"
                    value={form.parentPhone}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.parentPhone ? styles.inputError : ""}`}
                  />
                  {errors.parentPhone && (
                    <span className={styles.fieldError}>✕ {errors.parentPhone}</span>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Guardian Email</label>
                  <input
                    name="parentEmail"
                    type="email"
                    value={form.parentEmail}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.parentEmail ? styles.inputError : ""}`}
                  />
                  {errors.parentEmail && (
                    <span className={styles.fieldError}>✕ {errors.parentEmail}</span>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Occupation</label>
                  <input
                    name="parentOccupation"
                    value={form.parentOccupation}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Guardian Address</label>
                  <input
                    name="parentAddress"
                    value={form.parentAddress}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label}>Select Different Parent / Guardian</label>
                  <select
                    name="parentId"
                    value={form.parentId}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="">-- Choose Existing Parent --</option>
                    {parentsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} {p.phone ? `(${p.phone})` : ""} — {p.occupation || "Parent"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Academic Allocation */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon} style={{ background: "#fef3c7", color: "#d97706" }}>
                🏫
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Academic Placement</h3>
                <p className={styles.sectionSubtitle}>Grade and classroom section placement</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Grade</label>
                <select
                  name="grade"
                  value={selectedGradeId}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className={styles.select}
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
                  disabled={!selectedGradeId}
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
                <label className={styles.label}>Status</label>
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

          {/* Actions */}
          <div className={styles.actions}>
            <Link href={`/dashboard/students/${studentId}`} className={styles.btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
