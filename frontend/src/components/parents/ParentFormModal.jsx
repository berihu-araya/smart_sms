"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  HiXMark,
  HiUserPlus,
  HiUser,
  HiPhone,
  HiEnvelope,
  HiBriefcase,
  HiMapPin,
  HiCheckCircle,
  HiInformationCircle,
  HiUserGroup,
} from "react-icons/hi2";
import parentService from "@/services/parentService";
import styles from "./ParentFormModal.module.css";

const RELATIONSHIPS = [
  { value: "FATHER", label: "Father (👨)" },
  { value: "MOTHER", label: "Mother (👩)" },
  { value: "GUARDIAN", label: "Guardian (🛡️)" },
  { value: "BROTHER", label: "Brother (👦)" },
  { value: "SISTER", label: "Sister (👧)" },
  { value: "UNCLE", label: "Uncle (👨‍💼)" },
  { value: "AUNT", label: "Aunt (👩‍💼)" },
  { value: "OTHER", label: "Other Relation (👤)" },
];

export default function ParentFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [form, setForm] = useState({
    fullName: "",
    relationship: "FATHER",
    phone: "",
    email: "",
    occupation: "",
    address: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  // Populate initial data when editing or reset on open
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          fullName: initialData.full_name || initialData.fullName || "",
          relationship: initialData.relationship || "FATHER",
          phone: initialData.phone || "",
          email: initialData.email || "",
          occupation: initialData.occupation || "",
          address: initialData.address || "",
        });
      } else {
        setForm({
          fullName: "",
          relationship: "FATHER",
          phone: "",
          email: "",
          occupation: "",
          address: "",
        });
      }
      setErrors({});
      setApiError("");
    }
  }, [isOpen, initialData]);

  // Lock body scroll, handle Escape key, and dim background header, sidebar & page
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open-dimmed");

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.classList.remove("modal-open-dimmed");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

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
    if (!form.fullName.trim()) {
      errs.fullName = "Full name is required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Please enter a valid email address";
    }
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone.trim())) {
      errs.phone = "Phone number must be 7-20 digits";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        relationship: form.relationship,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        occupation: form.occupation.trim() || null,
        address: form.address.trim() || null,
      };

      let result;
      if (initialData?.id) {
        result = await parentService.updateParent(initialData.id, payload);
      } else {
        result = await parentService.createParent(payload);
      }

      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      setApiError(err.message || "Failed to save parent record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(initialData?.id);

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-modal-title"
      >
        {/* Header with gradient badge */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBadge}>
              <HiUserPlus />
            </div>
            <div>
              <h2 id="parent-modal-title" className={styles.modalTitle}>
                {isEditing ? "Edit Guardian Profile" : "Register New Guardian"}
              </h2>
              <p className={styles.modalSubtitle}>
                {isEditing
                  ? "Update contact details and relationship information."
                  : "Add a parent or guardian record to connect with enrolled students."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            <HiXMark size={20} />
          </button>
        </div>

        {/* API Error Message */}
        {apiError && (
          <div className={styles.errorBanner}>
            <span>⚠️ {apiError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formBody}>
            {/* Full Name & Relationship Row */}
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  <HiUser className={styles.fieldIcon} /> Full Name{" "}
                  <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Abebe Kebede"
                  className={`${styles.input} ${errors.fullName ? styles.inputError : ""
                    }`}
                  autoFocus
                />
                {errors.fullName && (
                  <span className={styles.errorText}>{errors.fullName}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  <HiUserGroup className={styles.fieldIcon} /> Relationship
                </label>
                <div className={styles.selectWrapper}>
                  <select
                    name="relationship"
                    value={form.relationship}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel.value} value={rel.value}>
                        {rel.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Phone & Email Row */}
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  <HiPhone className={styles.fieldIcon} /> Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+251 91 234 5678"
                  className={`${styles.input} ${errors.phone ? styles.inputError : ""
                    }`}
                />
                {errors.phone ? (
                  <span className={styles.errorText}>{errors.phone}</span>
                ) : (
                  <span className={styles.helperText}>
                    Used for automated SMS attendance & report card alerts
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  <HiEnvelope className={styles.fieldIcon} /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="guardian@example.com"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""
                    }`}
                />
                {errors.email && (
                  <span className={styles.errorText}>{errors.email}</span>
                )}
              </div>
            </div>

            {/* Occupation */}
            <div className={styles.fullWidthField}>
              <label className={styles.fieldLabel}>
                <HiBriefcase className={styles.fieldIcon} /> Occupation / Profession
              </label>
              <input
                type="text"
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                placeholder="e.g. Civil Engineer / Accountant / Business Owner"
                className={styles.input}
              />
            </div>

            {/* Home Address */}
            <div className={styles.fullWidthField}>
              <label className={styles.fieldLabel}>
                <HiMapPin className={styles.fieldIcon} /> Residential / Home Address
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="e.g. Bole Sub-city, Woreda 03, House No. 450, Addis Ababa"
                rows={2}
                className={styles.textarea}
              />
            </div>

            {/* Informational Tip */}
            <div className={styles.infoBox}>
              <HiInformationCircle className={styles.infoBoxIcon} />
              <span>
                Once registered, you can easily link this guardian to one or multiple students from their respective student profile.
              </span>
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
                  <span className={styles.spinner}></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <HiCheckCircle size={18} />
                  <span>{isEditing ? "Update Guardian" : "Register Guardian"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
