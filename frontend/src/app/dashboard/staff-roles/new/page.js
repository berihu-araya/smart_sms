"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import staffRoleService from "@/services/staffRoleService";
import teacherService from "@/services/teacherService";
import academicYearService from "@/services/academicYearService";
import unitService from "@/services/unitService";
import sectionService from "@/services/sectionService";
import styles from "../page.module.css";

export default function NewStaffRolePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    staff_role_id: "",
    teacher_id: "",
    academic_year_id: "",
    unit_id: "",
    section_id: "",
  });
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [units, setUnits] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [selectedRoleScope, setSelectedRoleScope] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        const [rolesData, teachersData, yearsData, unitsData, sectionsData] = await Promise.all([
          staffRoleService.listRoles({ limit: 50 }),
          teacherService.listTeachers({ limit: 300 }),
          academicYearService.listAcademicYears({ limit: 100 }),
          unitService.listUnits({ limit: 100 }),
          sectionService.listSections({ limit: 300 }),
        ]);

        setRoles(rolesData.items || []);
        setTeachers(teachersData.items || []);
        setAcademicYears(yearsData.items || []);
        setUnits(unitsData.items || []);
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

  function handleRoleChange(roleId) {
    const role = roles.find((r) => r.id === roleId);
    setForm((prev) => ({
      ...prev,
      staff_role_id: roleId,
      unit_id: "",
      section_id: "",
    }));
    setSelectedRoleScope(role?.scope_type || "");
  }

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
    if (!form.staff_role_id) errs.staff_role_id = "Role is required";
    if (!form.academic_year_id) errs.academic_year_id = "Academic year is required";

    if (selectedRoleScope === "unit" && !form.unit_id) {
      errs.unit_id = "Unit is required for this role";
    }
    if (selectedRoleScope === "section" && !form.section_id) {
      errs.section_id = "Section is required for this role";
    }

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
      const payload = {
        staff_role_id: form.staff_role_id,
        teacher_id: form.teacher_id,
        academic_year_id: form.academic_year_id,
      };

      if (selectedRoleScope === "unit") {
        payload.unit_id = form.unit_id;
      } else if (selectedRoleScope === "section") {
        payload.section_id = form.section_id;
      }

      await staffRoleService.assignStaffRole(payload);
      router.push("/dashboard/staff-roles");
    } catch (err) {
      setApiError(err.message || "Unable to assign role. Please try again.");
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
        <h1>Assign Leadership Role</h1>
        <p style={{ color: "#667085" }}>Designate a school director, unit leader, or other leadership role</p>
      </div>

      <div className={styles.formCard}>
        {apiError && <div className={styles.errorBox}>{apiError}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Select Teacher <span style={{ color: "#dc2626" }}>*</span>
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
              Select Role <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={form.staff_role_id}
              onChange={(e) => handleRoleChange(e.target.value)}
              className={`${styles.select} ${errors.staff_role_id ? styles.inputError : ""}`}
              required
            >
              <option value="">-- Choose a role --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.staff_role_id && <div className={styles.errorText}>{errors.staff_role_id}</div>}
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>
              Academic Year <span style={{ color: "#dc2626" }}>*</span>
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

          {selectedRoleScope === "unit" && (
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                Select Unit <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                name="unit_id"
                value={form.unit_id}
                onChange={handleChange}
                className={`${styles.select} ${errors.unit_id ? styles.inputError : ""}`}
              >
                <option value="">-- Choose a unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {errors.unit_id && <div className={styles.errorText}>{errors.unit_id}</div>}
            </div>
          )}

          {selectedRoleScope === "section" && (
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                Select Section <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                name="section_id"
                value={form.section_id}
                onChange={handleChange}
                className={`${styles.select} ${errors.section_id ? styles.inputError : ""}`}
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
          )}

          <div className={styles.formActions}>
            <Link href="/dashboard/staff-roles" className={`${styles.btnSecondary} ${styles.btnCancel}`}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className={styles.btnPrimary}
            >
              {saving ? "Assigning..." : "Assign Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
