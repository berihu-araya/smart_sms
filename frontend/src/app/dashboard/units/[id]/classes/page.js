"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import unitService from "@/services/unitService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "../../page.module.css";
import {
  HiPlus,
  HiCheckCircle,
  HiXMark,
  HiTrash,
  HiMagnifyingGlass,
} from "react-icons/hi2";

export default function ManageUnitClassesPage() {
  const params = useParams();
  const unitId = params.id;
  const router = useRouter();

  const [unit, setUnit] = useState(null);
  const [unitClasses, setUnitClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [unitData, yearsData, sectionsData] = await Promise.all([
          unitService.getUnitById(unitId),
          academicYearService.listAcademicYears({ limit: 100 }),
          sectionService.listSections({ limit: 200 }),
        ]);

        setUnit(unitData);
        setAcademicYears(yearsData.items || []);
        const activeYear = yearsData.items?.find((y) => y.is_active);
        setSelectedAcademicYear(activeYear?.id || "");
        setSections(sectionsData.items || []);

        const currentYear = activeYear?.id || "";
        if (currentYear && unitId) {
          const classesData = await unitService.getUnitClasses(unitId);
          setUnitClasses(classesData.items || []);
        }
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (unitId) {
      loadData();
    }
  }, [unitId]);

  const showToast = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddClass = async () => {
    if (!selectedSection || !selectedAcademicYear) {
      alert("Please select both a class and academic year");
      return;
    }

    try {
      setSaving(true);
      await unitService.assignClassToUnit({
        unit_id: unitId,
        section_id: selectedSection,
        academic_year_id: selectedAcademicYear,
      });

      showToast("Class assigned to unit successfully");
      setSelectedSection("");

      const classesData = await unitService.getUnitClasses(unitId);
      setUnitClasses(classesData.items || []);
    } catch (err) {
      alert(err.message || "Failed to assign class");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClass = async (assignmentId, sectionName) => {
    if (!window.confirm(`Remove "${sectionName}" from this unit?`)) {
      return;
    }

    try {
      setSaving(true);
      await unitService.removeClassFromUnit(unitId, assignmentId);
      showToast(`Class "${sectionName}" removed from unit`);
      setUnitClasses(unitClasses.filter((c) => c.id !== assignmentId));
    } catch (err) {
      alert(err.message || "Failed to remove class");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading unit classes...</div>;
  }

  if (!unit) {
    return <div className={styles.loading}>Unit not found</div>;
  }

  const filteredClasses = unitClasses.filter(
    (c) =>
      !search ||
      c.section_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.grade_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div>
        <h1>Manage Classes in "{unit.name}"</h1>
        <p style={{ color: "#667085" }}>Assign and manage classes for this organizational unit</p>
      </div>

      {notification && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <HiCheckCircle size={20} /> {notification.msg}
        </div>
      )}
      {error && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <HiXMark size={20} /> {error}
        </div>
      )}

      <div className={styles.formCard}>
        <h3 style={{ marginTop: 0 }}>Assign Classes to This Unit</h3>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Select Class *</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className={styles.select}
            >
              <option value="">-- Choose a class --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.grade_name} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Academic Year *</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className={styles.select}
            >
              <option value="">-- Choose year --</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? "★ (Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleAddClass}
          disabled={saving || !selectedSection || !selectedAcademicYear}
          className={styles.btnPrimary}
          style={{ marginTop: "12px" }}
        >
          <HiPlus size={16} /> Assign Class
        </button>
      </div>

      <div className={styles.controlCard}>
        <div className={styles.inputWrapper}>
          <HiMagnifyingGlass className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {filteredClasses.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No classes assigned to this unit yet.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Class Name</th>
                  <th>Academic Year</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.grade_name}</strong>
                    </td>
                    <td>{c.section_name}</td>
                    <td>{c.academic_year_name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: c.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                          color: c.status === "ACTIVE" ? "#166534" : "#6b7280",
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCell} style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleRemoveClass(c.id, c.section_name)}
                          disabled={saving}
                          title="Remove Class"
                        >
                          <HiTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <Link href={`/dashboard/units/${unitId}/edit`} className={`${styles.btnSecondary}`}>
          Edit Unit Details
        </Link>
      </div>
    </div>
  );
}
