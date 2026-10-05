"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HiAcademicCap,
  HiDocumentText,
  HiExclamationCircle,
  HiArrowPath,
  HiSparkles,
  HiCheckCircle,
} from "react-icons/hi2";
import { FaGraduationCap } from "react-icons/fa6";
import Modal from "@/components/common/Modal";
import { createGrade, updateGrade, getGradeById } from "@/services/gradeService";
import styles from "./GradeFormModal.module.css";

const EDUCATION_STAGES = [
  {
    id: "EARLY",
    name: "Early Years",
    sub: "KG & Nursery",
    icon: "🧸",
    defaultDesc: "Early childhood development and foundational learning stage.",
    presets: ["Kindergarten (KG)", "Nursery", "Pre-K"],
  },
  {
    id: "PRIMARY",
    name: "Primary",
    sub: "Grades 1 – 6",
    icon: "🎒",
    defaultDesc: "Elementary primary education curriculum level.",
    presets: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"],
  },
  {
    id: "MIDDLE",
    name: "Middle School",
    sub: "Grades 7 – 8",
    icon: "📚",
    defaultDesc: "Junior secondary / middle school curriculum level.",
    presets: ["Grade 7", "Grade 8"],
  },
  {
    id: "HIGH",
    name: "High School",
    sub: "Grades 9 – 12",
    icon: "🎓",
    defaultDesc: "Senior secondary college-preparatory level.",
    presets: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
  },
];

function getBadgeInitials(name = "") {
  const trimmed = name.trim();
  if (!trimmed) return "G";
  const numMatch = trimmed.match(/\d+/);
  if (numMatch) return `G${numMatch[0]}`;
  if (trimmed.toLowerCase().includes("kg") || trimmed.toLowerCase().includes("kindergarten")) return "KG";
  if (trimmed.toLowerCase().includes("nursery")) return "NUR";
  if (trimmed.toLowerCase().includes("pre")) return "PRE";
  return trimmed.substring(0, 3).toUpperCase();
}

export default function GradeFormModal({
  isOpen,
  onClose,
  grade = null,
  onSuccess,
}) {
  const isEdit = Boolean(grade?.id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [selectedStage, setSelectedStage] = useState("PRIMARY");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [apiError, setApiError] = useState("");

  // Populate or reset on open
  useEffect(() => {
    if (!isOpen) return;

    setApiError("");
    setErrors({});

    if (isEdit && grade) {
      setFormData({
        name: grade.name || "",
        description: grade.description || "",
      });

      // Detect matching stage
      const gName = (grade.name || "").toLowerCase();
      if (gName.includes("kg") || gName.includes("nursery") || gName.includes("pre")) {
        setSelectedStage("EARLY");
      } else if (gName.match(/grade\s*([1-6])\b/i)) {
        setSelectedStage("PRIMARY");
      } else if (gName.match(/grade\s*([7-8])\b/i)) {
        setSelectedStage("MIDDLE");
      } else if (gName.match(/grade\s*(9|10|11|12)\b/i)) {
        setSelectedStage("HIGH");
      }
    } else {
      setFormData({
        name: "",
        description: "",
      });
      setSelectedStage("PRIMARY");
    }
  }, [isOpen, isEdit, grade]);

  const currentStageObj = useMemo(
    () => EDUCATION_STAGES.find((s) => s.id === selectedStage) || EDUCATION_STAGES[1],
    [selectedStage]
  );

  const handleStageSelect = (stageId) => {
    setSelectedStage(stageId);
    const stage = EDUCATION_STAGES.find((s) => s.id === stageId);
    if (!formData.description || EDUCATION_STAGES.some((s) => s.defaultDesc === formData.description)) {
      setFormData((prev) => ({ ...prev, description: stage?.defaultDesc || "" }));
    }
  };

  const handlePresetClick = (presetName) => {
    setFormData((prev) => ({
      ...prev,
      name: presetName,
      description: prev.description || currentStageObj.defaultDesc,
    }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name || !formData.name.trim()) {
      errs.name = "Grade name is required.";
    } else if (formData.name.trim().length < 2) {
      errs.name = "Grade name must be at least 2 characters.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");

    try {
      if (isEdit) {
        await updateGrade(grade.id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
        });
        onSuccess?.(`Grade "${formData.name.trim()}" updated successfully!`);
      } else {
        await createGrade({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
        });
        onSuccess?.(`Grade "${formData.name.trim()}" created successfully!`);
      }
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to save grade level. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const previewBadge = getBadgeInitials(formData.name || (isEdit ? grade?.name : "Grade"));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Grade: ${grade?.name || ""}` : "Create New Grade Level"}
      subtitle={
        isEdit
          ? "Update grade name, stage information, and curriculum notes."
          : "Define a new academic tier, educational stage, and syllabus tier."
      }
      icon={FaGraduationCap}
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.formContainer} noValidate>
        {apiError && (
          <div className={styles.alertError}>
            <HiExclamationCircle />
            <span>{apiError}</span>
          </div>
        )}

        {/* Education Stage Selector Cards */}
        {!isEdit && (
          <div className={styles.stageSelectorGroup}>
            <div className={styles.sectionTitle}>
              <HiSparkles size={16} color="#2563eb" />
              <span>Select Education Stage</span>
            </div>
            <div className={styles.stageGrid}>
              {EDUCATION_STAGES.map((st) => {
                const isActive = selectedStage === st.id;
                return (
                  <div
                    key={st.id}
                    className={`${styles.stageCard} ${isActive ? styles.stageCardActive : ""}`}
                    onClick={() => handleStageSelect(st.id)}
                  >
                    <span className={styles.stageIcon}>{st.icon}</span>
                    <span className={styles.stageName}>{st.name}</span>
                    <span className={styles.stageSub}>{st.sub}</span>
                  </div>
                );
              })}
            </div>

            {/* Stage Quick Presets */}
            <div className={styles.presetsRow}>
              <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 600 }}>
                Quick Presets:
              </span>
              {currentStageObj.presets.map((preset) => {
                const isSelected = formData.name === preset;
                return (
                  <button
                    type="button"
                    key={preset}
                    className={`${styles.presetChip} ${isSelected ? styles.presetChipActive : ""}`}
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.formGrid}>
          {/* Grade Name Input */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Grade Name</span>
                <span className={styles.required}>*</span>
              </div>
              <span className={styles.charCount}>{formData.name.length} / 50</span>
            </label>
            <div className={styles.inputWrapper}>
              <HiAcademicCap className={styles.inputIcon} />
              <input
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Grade 9, Grade 10, KG,  ...."
                className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                autoFocus
              />
            </div>
            {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
          </div>

          {/* Description / Notes */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <div className={styles.labelLeft}>
                <span>Description & Curriculum Notes</span>
              </div>
              <span className={styles.charCount}>{formData.description.length} / 250</span>
            </label>
            <textarea
              rows={2}
              maxLength={250}
              placeholder="e.g. Senior secondary preparatory curriculum with core science and humanities tracks."
              className={styles.textarea}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        {/* Live Preview Card */}
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <span>Live Grade Badge Preview</span>
            <span className={styles.previewBadge}>Roster Preview</span>
          </div>
          <div className={styles.previewCardContent}>
            <div className={styles.previewAvatar}>{previewBadge}</div>
            <div className={styles.previewInfo}>
              <div className={styles.previewNameRow}>
                <span className={styles.previewGradeName}>
                  {formData.name || "Untitled Grade Level"}
                </span>
                <span className={styles.previewStageTag}>{currentStageObj.name}</span>
              </div>
              <span className={styles.previewDesc}>
                {formData.description || currentStageObj.defaultDesc}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
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
                <span>{isEdit ? "Updating..." : "Creating..."}</span>
              </>
            ) : (
              <span>{isEdit ? "Save Changes" : "Create Grade Level"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
