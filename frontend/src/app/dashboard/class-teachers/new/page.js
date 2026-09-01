"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import classTeacherService from "@/services/classTeacherService";
import teacherService from "@/services/teacherService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "../page.module.css";

export default function NewClassTeacherPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    teacher_id: "",
    section_id: "",
    academic_year_id: "",
  });
  const [errors, setErrors] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        const [teachersData, yearsData, sectionsData] = await Promise.all([
          teacherService.listTeachers({ limit: 300 }),
          academicYearService.listAcademicYears({ limit: 100 }),
          sectionService.listSections({ limit: 300 }),
        ]);
        setTeachers(teachersData.items || []);
        setAcademicYears(yearsData.items || []);
        setSections(sectionsData.items || []);

        const activeYear = yearsData.items?.find((y) => y.is_active);
        if (activeYear) {
          setForm((prev) => ({ ...prev, academic_year_id: activeYear.id }));
        }
      } catch (err) {
        console.error("Failed to load options", err);
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
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
    if (!form.teacher_id) errs.teacher_id = "Teacher is required";
    if (!form.section_id) errs.section_id = "Section is required";
    if (!form.academic_year_id) errs.academic_year_id = "Academic year is required";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      await classTeacherService.assignClassTeacher({
        teacher_id: form.teacher_id,
        section_id: form.section_id,
        academic_year_id: form.academic_year_id,
      });

      router.push("/dashboard/class-teachers");
    } catch (err) {
      setApiError(err.message || "Unable to assign class teacher. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingOptions) {
    return <div className={styles.loading}>Loading form data...</div>;
  }

  return (
    <div className={styles.page}>
      <div>
        <h1>Assign Class Teacher</h1>
        <p style={{ color: "#667085" }}>Designate a homeroom teacher for a class/section</p>
      </div>

      <div className={styles.formCard}>
        {apiError && (
          <div className={styles.errorBox}>{apiError}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Select Teacher <span className={styles.required}>*</span>
            </label>
            <select
              name="teacher_id"
              value={form.teacher_id}
              onChange={handleChange}
              className={`${styles.select} ${errors.teacher_id ? styles.inputError : ""}`}
              required
            >
              <option value="">-- Choose a teacher --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
            {errors.teacher_id && <div className={styles.errorText}>{errors.teacher_id}</div>}
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Select Class / Section <span className={styles.required}>*</span>
            </label>
            <select
              name="section_id"
              value={form.section_id}
              onChange={handleChange}
              className={`${styles.select} ${errors.section_id ? styles.inputError : ""}`}
              required
            >
              <option value="">-- Choose a section --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.grade_name} - {s.name}
                </option>
              ))}
            </select>
            {errors.section_id && <div className={styles.errorText}>{errors.section_id}</div>}
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Academic Year <span className={styles.required}>*</span>
            </label>
            <select
              name="academic_year_id"
              value={form.academic_year_id}
              onChange={handleChange}
              className={`${styles.select} ${errors.academic_year_id ? styles.inputError : ""}`}
              required
            >
              <option value="">-- Choose year --</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? "★ (Active)" : ""}
                </option>
              ))}
            </select>
            {errors.academic_year_id && <div className={styles.errorText}>{errors.academic_year_id}</div>}
          </div>

          <div className={styles.formActions}>
            <Link href="/dashboard/class-teachers" className={`${styles.btnSecondary} ${styles.btnCancel}`}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className={styles.btnPrimary}
            >
              {saving ? "Assigning..." : "Assign Class Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
