"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HiBuildingOffice2,
  HiAcademicCap,
  HiHomeModern,
  HiUserGroup,
  HiExclamationCircle,
  HiArrowPath,
  HiSparkles,
} from "react-icons/hi2";
import Modal from "@/components/common/Modal";
import sectionService from "@/services/sectionService";
import gradeService from "@/services/gradeService";
import styles from "./SectionFormModal.module.css";

const SECTION_NAME_PRESETS = [
  "Section A",
  "Section B",
  "Section C",
  "Section D",
  "Blue",
  "Green",
  "Rose",
  "Gold",
];

const CAPACITY_PRESETS = [25, 30, 35, 40, 50];

function computeSectionBadge(gradeName = "", sectionName = "") {
  const gTrim = (gradeName || "").trim();
  const sTrim = (sectionName || "").trim();

  let gPrefix = "";
  if (gTrim) {
    const num = gTrim.match(/\d+/);
    if (num) {
      gPrefix = `G${num[0]}`;
    } else if (gTrim.toLowerCase().includes("kg")) {
      gPrefix = "KG";
    } else if (gTrim.toLowerCase().includes("nur")) {
      gPrefix = "NUR";
    } else {
      gPrefix = gTrim.substring(0, 3).toUpperCase();
    }
  }

  let sSuffix = "";
  if (sTrim) {
    const secMatch = sTrim.match(/section\s*([a-zA-Z0-9]+)/i);
    if (secMatch) {
      sSuffix = secMatch[1].toUpperCase();
    } else {
      sSuffix = sTrim.substring(0, 3).toUpperCase();
    }
  }

  if (gPrefix && sSuffix) return `${gPrefix}-${sSuffix}`;
  if (sSuffix) return sSuffix;
  if (gPrefix) return gPrefix;
  return "SEC";
}

export default function SectionFormModal({
  isOpen,
  onClose,
  section = null,
  defaultGradeId = "",
  grades: propGrades = null,
  onSuccess,
}) {
  const isEdit = Boolean(section?.id);

  const [formData, setFormData] = useState({
    name: "",
    grade_id: "",
    room_number: "",
    capacity: "",
  });

  const [availableGrades, setAvailableGrades] = useState(propGrades || []);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Load active grades if not provided as prop
  useEffect(() => {
    if (!isOpen) return;

    if (propGrades && propGrades.length > 0) {
      setAvailableGrades(propGrades);
      return;
    }

    let isMounted = true;
    async function fetchGrades() {
      try {
        setLoadingGrades(true);
        const res = await gradeService.listGrades({ status: "active", limit: 100 });
        if (isMounted) {
          setAvailableGrades(res.items || []);
        }
      } catch (err) {
        console.warn("Could not load grades list:", err.message);
      } finally {
        if (isMounted) setLoadingGrades(false);
      }
    }

    fetchGrades();
    return () => {
      isMounted = false;
    };
  }, [isOpen, propGrades]);

  // Populate or reset form on open
  useEffect(() => {
    if (!isOpen) return;

    setApiError("");
    setErrors({});

    if (isEdit && section) {
      setFormData({
        name: section.name || "",
        grade_id: section.grade_id || "",
        room_number: section.room_number || "",
        capacity:
          section.capacity !== null && section.capacity !== undefined
            ? String(section.capacity)
            : "",
      });
    } else {
      setFormData({
        name: "",
        grade_id: defaultGradeId || (availableGrades[0]?.id || ""),
        room_number: "",
        capacity: "35",
      });
    }
  }, [isOpen, isEdit, section, defaultGradeId, availableGrades]);

  const selectedGradeObj = useMemo(() => {
    return availableGrades.find((g) => g.id === formData.grade_id) || null;
  }, [availableGrades, formData.grade_id]);

  const previewBadge = computeSectionBadge(
    selectedGradeObj?.name || (isEdit ? section?.grade_name : ""),
    formData.name
  );

  const handlePresetNameClick = (preset) => {
    setFormData((prev) => ({ ...prev, name: preset }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: null }));
    }
  };

  const handlePresetCapacityClick = (cap) => {
    setFormData((prev) => ({ ...prev, capacity: String(cap) }));
    if (errors.capacity) {
      setErrors((prev) => ({ ...prev, capacity: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name || !formData.name.trim()) {
      errs.name = "Section name is required.";
    } else if (formData.name.trim().length < 1) {
      errs.name = "Section name must contain at least 1 character.";
    }

    if (!formData.grade_id) {
      errs.grade_id = "Please select a grade level.";
    }

    if (
      formData.capacity &&
      (isNaN(Number(formData.capacity)) ||
        Number(formData.capacity) <= 0 ||
        !Number.isInteger(Number(formData.capacity)))
    ) {
      errs.capacity = "Capacity must be a positive whole number.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");

    const payload = {
      name: formData.name.trim(),
      gradeId: formData.grade_id,
      roomNumber: formData.room_number?.trim() || null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
    };

    try {
      if (isEdit) {
        await sectionService.updateSection(section.id, payload);
        onSuccess?.(`Section "${payload.name}" updated successfully!`);
      } else {
        await sectionService.createSection(payload);
        onSuccess?.(`Section "${payload.name}" created successfully!`);
      }
      onClose();
    } catch (err) {
      setApiError(
        err.message || "Failed to save class section. Please check your inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Section: ${section?.name || ""}` : "Create New Section"}
      subtitle={
        isEdit
          ? "Update section parameters, grade assignment, room, and capacity."
          : "Define a class section under an academic grade level and allocate seating."
      }
      icon={HiBuildingOffice2}
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.formContainer} noValidate>
        {apiError && (
          <div className={styles.alertError}>
            <HiExclamationCircle />
            <span>{apiError}</span>
          </div>
        )}

        {/* Quick Presets (Shown on Add) */}
        {!isEdit && (
          <div className={styles.presetsGroup}>
            <div className={styles.sectionHeader}>
              <HiSparkles size={16} color="#2563eb" />
              <span>Quick Section Name Suggestions</span>
            </div>
            <div className={styles.presetsRow}>
              {SECTION_NAME_PRESETS.map((preset) => {
                const isSelected = formData.name === preset;
                return (
                  <button
                    type="button"
                    key={preset}
                    className={`${styles.presetChip} ${
                      isSelected ? styles.presetChipActive : ""
                    }`}
                    onClick={() => handlePresetNameClick(preset)}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.formGrid}>
          {/* Section Name Input */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Section Name</span>
                <span className={styles.required}>*</span>
              </div>
              <span className={styles.charCount}>{formData.name.length} / 50</span>
            </label>
            <div className={styles.inputWrapper}>
              <HiBuildingOffice2 className={styles.inputIcon} />
              <input
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Section A, Blue, Rose"
                className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                autoFocus
              />
            </div>
            {errors.name && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.name}
              </span>
            )}
          </div>

          {/* Grade Level Selector */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Grade Level</span>
                <span className={styles.required}>*</span>
              </div>
              {loadingGrades && <span className={styles.charCount}>Loading...</span>}
            </label>
            <div className={styles.inputWrapper}>
              <HiAcademicCap className={styles.inputIcon} />
              <select
                required
                value={formData.grade_id}
                onChange={(e) => {
                  setFormData({ ...formData, grade_id: e.target.value });
                  if (errors.grade_id) setErrors({ ...errors, grade_id: null });
                }}
                className={`${styles.select} ${
                  errors.grade_id ? styles.inputError : ""
                }`}
              >
                <option value="">Select Academic Grade</option>
                {availableGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.grade_id && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.grade_id}
              </span>
            )}
          </div>

          {/* Room Number / Hall */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Room / Hall</span>
              </div>
              <span className={styles.charCount}>
                {formData.room_number?.length || 0} / 30
              </span>
            </label>
            <div className={styles.inputWrapper}>
              <HiHomeModern className={styles.inputIcon} />
              <input
                type="text"
                maxLength={30}
                placeholder="e.g. Room 102, Lab B"
                className={styles.input}
                value={formData.room_number}
                onChange={(e) =>
                  setFormData({ ...formData, room_number: e.target.value })
                }
              />
            </div>
          </div>

          {/* Student Capacity with Quick Presets */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Student Capacity</span>
              </div>
              <span className={styles.charCount}>Seats</span>
            </label>
            <div className={styles.inputWrapper}>
              <HiUserGroup className={styles.inputIcon} />
              <input
                type="number"
                min="1"
                max="200"
                placeholder="e.g. 35"
                className={`${styles.input} ${
                  errors.capacity ? styles.inputError : ""
                }`}
                value={formData.capacity}
                onChange={(e) => {
                  setFormData({ ...formData, capacity: e.target.value });
                  if (errors.capacity) setErrors({ ...errors, capacity: null });
                }}
              />
            </div>
            <div className={styles.capacityChips}>
              <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                Presets:
              </span>
              {CAPACITY_PRESETS.map((cap) => {
                const isSelected = formData.capacity === String(cap);
                return (
                  <button
                    type="button"
                    key={cap}
                    className={`${styles.capChip} ${
                      isSelected ? styles.capChipActive : ""
                    }`}
                    onClick={() => handlePresetCapacityClick(cap)}
                  >
                    {cap}
                  </button>
                );
              })}
            </div>
            {errors.capacity && (
              <span className={styles.fieldError}>
                <HiExclamationCircle size={14} /> {errors.capacity}
              </span>
            )}
          </div>
        </div>

        {/* Live Section Preview Card */}
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <span>Live Section Badge & Roster Preview</span>
            <span className={styles.previewBadge}>Interactive Preview</span>
          </div>
          <div className={styles.previewCardContent}>
            <div className={styles.previewAvatar}>{previewBadge}</div>
            <div className={styles.previewInfo}>
              <div className={styles.previewNameRow}>
                <span className={styles.previewSectionName}>
                  {formData.name || "Untitled Section"}
                </span>
                <span className={styles.previewGradeTag}>
                  {selectedGradeObj?.name ||
                    (isEdit ? section?.grade_name : "Select Grade")}
                </span>
              </div>
              <div className={styles.previewMetaRow}>
                <span className={styles.previewMetaItem}>
                  📍 Room: {formData.room_number || "Not assigned"}
                </span>
                <span>•</span>
                <span className={styles.previewMetaItem}>
                  👥 Capacity: {formData.capacity ? `${formData.capacity} seats` : "No limit"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <HiArrowPath className={styles.spinner} size={16} />
                <span>{isEdit ? "Updating Section..." : "Creating Section..."}</span>
              </>
            ) : (
              <span>{isEdit ? "Save Changes" : "Create Section"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
