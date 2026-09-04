"use client";

import { useEffect, useState } from "react";
import {
  FaUserPlus,
  FaUserEdit,
  FaUserGraduate,
  FaUserTie,
  FaSchool,
  FaPhoneAlt,
  FaCheckCircle,
  FaSearch,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import Modal from "@/components/common/Modal";
import studentService from "@/services/studentService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import parentService from "@/services/parentService";
import styles from "./StudentFormModal.module.css";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"];
const RELATIONSHIPS = [
  "FATHER",
  "MOTHER",
  "GUARDIAN",
  "BROTHER",
  "SISTER",
  "UNCLE",
  "AUNT",
  "OTHER",
];
const getTodayDateString = () => new Date().toISOString().split("T")[0];

export default function StudentFormModal({
  isOpen,
  onClose,
  studentId = null,
  onSuccess,
}) {
  const isEdit = Boolean(studentId);

  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [parentsList, setParentsList] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Guardian Mode: "new" (auto-create) vs "existing" (choose existing)
  const [parentMode, setParentMode] = useState("new");
  const [parentSearch, setParentSearch] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [form, setForm] = useState({
    admissionNumber: "",
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

  // Load initial options & student details if editing
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadData() {
      try {
        setLoadingInitial(true);
        setApiError("");
        setErrors({});

        const [gradesData, parentsData] = await Promise.all([
          gradeService.listGrades({ limit: 100, offset: 0 }).catch(() => ({ items: [] })),
          parentService.listParents({ limit: 200, offset: 0 }).catch(() => ({ items: [] })),
        ]);

        if (!isMounted) return;
        setGrades(gradesData.items || []);
        setParentsList(parentsData.items || []);

        if (studentId) {
          const student = await studentService.getStudentById(studentId);
          if (!isMounted) return;

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

          if (student.parent_id) {
            setParentMode("existing");
          } else if (student.parent_name) {
            setParentMode("new");
          }

          if (student.section_id) {
            try {
              const sectionData = await sectionService.getSectionById(student.section_id);
              if (sectionData?.grade_id && isMounted) {
                setSelectedGradeId(sectionData.grade_id);
                const sectionsData = await sectionService.listSections({
                  gradeId: sectionData.grade_id,
                  limit: 200,
                  offset: 0,
                });
                if (isMounted) {
                  setSections(sectionsData.items || []);
                }
              }
            } catch (err) {
              console.error("Failed to load student section:", err);
            }
          }
        } else {
          // Reset form for create
          setForm({
            admissionNumber: "",
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
            parentId: "",
            parentFullName: "",
            parentRelationship: "GUARDIAN",
            parentPhone: "",
            parentEmail: "",
            parentOccupation: "",
            parentAddress: "",
          });
          setSelectedGradeId("");
          setSections([]);
          setParentMode("new");
        }
      } catch (err) {
        if (isMounted) {
          setApiError(err.message || "Failed to load modal details.");
        }
      } finally {
        if (isMounted) {
          setLoadingInitial(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId]);

  const handleGradeChange = async (gradeId) => {
    setSelectedGradeId(gradeId);
    setForm((prev) => ({ ...prev, sectionId: "" }));
    setSections([]);

    if (!gradeId) return;

    try {
      const data = await sectionService.listSections({ gradeId, limit: 200, offset: 0 });
      setSections(data.items || []);
    } catch (err) {
      console.error("Failed to load sections:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = () => {
    const errs = {};

    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.admissionDate) errs.admissionDate = "Admission date is required";

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Valid email is required";
    }

    if (parentMode === "existing" && !form.parentId) {
      errs.parentId = "Please select an existing parent/guardian";
    }

    if (parentMode === "new" && form.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
      errs.parentEmail = "Valid guardian email is required";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      let result;
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        admissionDate: form.admissionDate,
        email: form.email ? form.email.trim() : null,
        phone: form.phone ? form.phone.trim() : null,
        address: form.address ? form.address.trim() : null,
        status: form.status,
        sectionId: form.sectionId || null,
      };

      if (isEdit) {
        payload.admissionNumber = form.admissionNumber;
      }

      // Handle guardian association
      if (parentMode === "existing" && form.parentId) {
        payload.parentId = form.parentId;
        payload.relationship = form.parentRelationship || "GUARDIAN";
      } else if (parentMode === "new" && form.parentFullName.trim()) {
        payload.parent = {
          fullName: form.parentFullName.trim(),
          relationship: form.parentRelationship || "GUARDIAN",
          phone: form.parentPhone ? form.parentPhone.trim() : null,
          email: form.parentEmail ? form.parentEmail.trim() : null,
          occupation: form.parentOccupation ? form.parentOccupation.trim() : null,
          address: form.parentAddress ? form.parentAddress.trim() : null,
        };
      }

      if (isEdit) {
        result = await studentService.updateStudent(studentId, payload);
      } else {
        result = await studentService.createStudent(payload);
      }

      onSuccess?.(result);
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to save student record. Please check inputs.");
    } finally {
      setSaving(false);
    }
  };

  const filteredParents = parentsList.filter((p) => {
    if (!parentSearch) return true;
    const q = parentSearch.toLowerCase();
    const fullName = `${p.first_name || ""} ${p.last_name || ""} ${p.name || ""}`.toLowerCase();
    const phone = (p.phone || "").toLowerCase();
    return fullName.includes(q) || phone.includes(q);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Student Record" : "Enroll New Student"}
      subtitle={
        isEdit
          ? "Update academic profile, contact info, and guardian assignment."
          : "Register a new student and associate with class and guardian."
      }
      icon={isEdit ? FaUserEdit : FaUserPlus}
      size="xl"
      preventBackdropClose={saving}
    >
      {loadingInitial ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <span>Loading student form...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {apiError && <div className={styles.apiErrorBanner}>{apiError}</div>}

          {/* Section 1: Academic & Personal Information */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <FaUserGraduate className={styles.sectionIcon} />
              <h3>Academic & Personal Information</h3>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>
                  First Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="e.g. Samuel"
                  className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                />
                {errors.firstName && (
                  <span className={styles.errorMessage}>{errors.firstName}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Last Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="e.g. Tadesse"
                  className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                />
                {errors.lastName && (
                  <span className={styles.errorMessage}>{errors.lastName}</span>
                )}
              </div>
            </div>

            <div className={styles.formGrid3}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Gender <span className={styles.required}>*</span>
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
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
                  Admission Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="admissionDate"
                  value={form.admissionDate}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.admissionDate ? styles.inputError : ""}`}
                />
                {errors.admissionDate && (
                  <span className={styles.errorMessage}>{errors.admissionDate}</span>
                )}
              </div>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>Grade / Level</label>
                <select
                  value={selectedGradeId}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Select Grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Class Section</label>
                <select
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                  disabled={!selectedGradeId && sections.length === 0}
                  className={styles.select}
                >
                  <option value="">Select Section</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGrid3}>
              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="student@school.edu"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                />
                {errors.email && (
                  <span className={styles.errorMessage}>{errors.email}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+251 91 123 4567"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Enrollment Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Residential Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Street address, sub-city, city"
                rows={2}
                className={styles.textarea}
              />
            </div>
          </div>

          {/* Section 2: Guardian / Parent Assignment */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <FaUserTie className={styles.sectionIcon} />
              <h3>Parent / Guardian Information</h3>
            </div>

            {/* Mode Switcher */}
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={`${styles.modeTab} ${parentMode === "new" ? styles.modeTabActive : ""}`}
                onClick={() => setParentMode("new")}
              >
                Create New Parent / Guardian
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${parentMode === "existing" ? styles.modeTabActive : ""}`}
                onClick={() => setParentMode("existing")}
              >
                Link Existing Parent ({parentsList.length})
              </button>
            </div>

            {parentMode === "new" ? (
              <div className={styles.newParentFields}>
                <div className={styles.formGrid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Guardian Full Name</label>
                    <input
                      type="text"
                      name="parentFullName"
                      value={form.parentFullName}
                      onChange={handleChange}
                      placeholder="e.g. Dr. Abebe Tadesse"
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
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Guardian Phone</label>
                    <input
                      type="tel"
                      name="parentPhone"
                      value={form.parentPhone}
                      onChange={handleChange}
                      placeholder="+251 92 345 6789"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Guardian Email</label>
                    <input
                      type="email"
                      name="parentEmail"
                      value={form.parentEmail}
                      onChange={handleChange}
                      placeholder="parent@example.com"
                      className={`${styles.input} ${errors.parentEmail ? styles.inputError : ""}`}
                    />
                    {errors.parentEmail && (
                      <span className={styles.errorMessage}>{errors.parentEmail}</span>
                    )}
                  </div>
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Occupation</label>
                    <input
                      type="text"
                      name="parentOccupation"
                      value={form.parentOccupation}
                      onChange={handleChange}
                      placeholder="e.g. Engineer, Business"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Guardian Address</label>
                    <input
                      type="text"
                      name="parentAddress"
                      value={form.parentAddress}
                      onChange={handleChange}
                      placeholder="Same as student or other"
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.existingParentSelector}>
                <div className={styles.searchParentBox}>
                  <FaSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    placeholder="Search parent by name or phone..."
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.parentsListScroll}>
                  {filteredParents.length === 0 ? (
                    <div className={styles.emptyParentNotice}>
                      No parents found. Switch to "Create New Parent".
                    </div>
                  ) : (
                    filteredParents.map((p) => {
                      const isSelected = form.parentId === p.id;
                      const pName = `${p.first_name || ""} ${p.last_name || ""} ${p.name || ""}`.trim();
                      return (
                        <div
                          key={p.id}
                          className={`${styles.parentCard} ${isSelected ? styles.parentCardActive : ""}`}
                          onClick={() => setForm((prev) => ({ ...prev, parentId: p.id }))}
                        >
                          <div className={styles.parentCardInfo}>
                            <strong>{pName || "Parent Record"}</strong>
                            <span>{p.phone || p.email || "No phone"}</span>
                          </div>
                          {isSelected && <FaCheckCircle className={styles.parentCheck} />}
                        </div>
                      );
                    })
                  )}
                </div>
                {errors.parentId && (
                  <span className={styles.errorMessage}>{errors.parentId}</span>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={saving}
            >
              {saving ? (
                <>
                  <FaSpinner className={styles.btnSpinner} />
                  <span>Saving...</span>
                </>
              ) : isEdit ? (
                "Update Student"
              ) : (
                "Enroll Student"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
