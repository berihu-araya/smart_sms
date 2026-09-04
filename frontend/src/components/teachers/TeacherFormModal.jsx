"use client";

import { useEffect, useState } from "react";
import {
  FaChalkboardTeacher,
  FaUserPlus,
  FaUserEdit,
  FaBriefcase,
  FaSpinner,
} from "react-icons/fa";
import Modal from "@/components/common/Modal";
import teacherService from "@/services/teacherService";
import styles from "./TeacherFormModal.module.css";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const getTodayDateString = () => new Date().toISOString().split("T")[0];

export default function TeacherFormModal({
  isOpen,
  onClose,
  teacherId = null,
  onSuccess,
}) {
  const isEdit = Boolean(teacherId);

  const [form, setForm] = useState({
    employeeNumber: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    email: "",
    phone: "",
    address: "",
    qualification: "",
    designation: "",
    department: "",
    joiningDate: getTodayDateString(),
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadData() {
      if (teacherId) {
        try {
          setLoadingInitial(true);
          setApiError("");
          setErrors({});
          const data = await teacherService.getTeacherById(teacherId);

          if (!isMounted) return;
          setForm({
            employeeNumber: data.employee_number || "",
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            gender: data.gender || "MALE",
            dateOfBirth: data.date_of_birth ? data.date_of_birth.split("T")[0] : "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
            qualification: data.qualification || "",
            designation: data.designation || "",
            department: data.department || "",
            joiningDate: data.joining_date ? data.joining_date.split("T")[0] : getTodayDateString(),
          });
        } catch (err) {
          if (isMounted) {
            setApiError(err.message || "Failed to load teacher details.");
          }
        } finally {
          if (isMounted) {
            setLoadingInitial(false);
          }
        }
      } else {
        setForm({
          employeeNumber: "",
          firstName: "",
          lastName: "",
          gender: "MALE",
          dateOfBirth: "",
          email: "",
          phone: "",
          address: "",
          qualification: "",
          designation: "",
          department: "",
          joiningDate: getTodayDateString(),
        });
        setErrors({});
        setApiError("");
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, teacherId]);

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

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Valid email is required";
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
        phone: form.phone ? form.phone.trim() : null,
        email: form.email ? form.email.trim() : null,
        address: form.address ? form.address.trim() : null,
        qualification: form.qualification ? form.qualification.trim() : null,
        designation: form.designation ? form.designation.trim() : null,
        department: form.department ? form.department.trim() : null,
        joiningDate: form.joiningDate || null,
      };

      if (isEdit) {
        if (form.employeeNumber) {
          payload.employeeNumber = form.employeeNumber;
        }
        result = await teacherService.updateTeacher(teacherId, payload);
      } else {
        result = await teacherService.createTeacher(payload);
      }

      onSuccess?.(result);
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to save teacher record. Please check inputs.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Teacher Profile" : "Register New Teacher"}
      subtitle={
        isEdit
          ? "Update teacher employment details, department, and contact information."
          : "Add a new teaching faculty member to the academic directory."
      }
      icon={isEdit ? FaUserEdit : FaUserPlus}
      size="lg"
      preventBackdropClose={saving}
    >
      {loadingInitial ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <span>Loading teacher details...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {apiError && <div className={styles.apiErrorBanner}>{apiError}</div>}

          {/* Section 1: Personal & Contact Details */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <FaChalkboardTeacher className={styles.sectionIcon} />
              <h3>Personal & Contact Details</h3>
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
                  placeholder="e.g. Almaz"
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
                  placeholder="e.g. Kebede"
                  className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                />
                {errors.lastName && (
                  <span className={styles.errorMessage}>{errors.lastName}</span>
                )}
              </div>
            </div>

            <div className={styles.formGrid2}>
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
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="teacher@school.edu"
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
                  placeholder="+251 91 234 5678"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Residential Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Residential address, city, sub-city"
                rows={2}
                className={styles.textarea}
              />
            </div>
          </div>

          {/* Section 2: Professional & Employment */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <FaBriefcase className={styles.sectionIcon} />
              <h3>Employment & Department</h3>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>Department</label>
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. Mathematics, Natural Sciences"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="e.g. Senior Teacher, Department Head"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>Qualification</label>
                <input
                  type="text"
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  placeholder="e.g. B.Sc in Physics, M.Ed"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Joining Date</label>
                <input
                  type="date"
                  name="joiningDate"
                  value={form.joiningDate}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
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
                "Update Teacher"
              ) : (
                "Save Teacher"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
