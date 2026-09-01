"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import teacherSubjectService from "@/services/teacherSubjectService";
import classTeacherService from "@/services/classTeacherService";
import teacherService from "@/services/teacherService";
import gradeService from "@/services/gradeService";
import sectionService from "@/services/sectionService";
import academicYearService from "@/services/academicYearService";
import styles from "./page.module.css";

const STATUS_COLORS = {
  ACTIVE: { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
};

export default function TeacherSubjectListPage() {
  const [activeTab, setActiveTab] = useState("subjects");

  // Teacher-Subject State
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  // Class Teacher State
  const [classTeachers, setClassTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [classTeacherLoading, setClassTeacherLoading] = useState(true);
  const [classTeacherHasLoaded, setClassTeacherHasLoaded] = useState(false);
  const [classTeacherError, setClassTeacherError] = useState("");
  const [showClassTeacherForm, setShowClassTeacherForm] = useState(false);
  const [classTeacherForm, setClassTeacherForm] = useState({
    teacher_id: "",
    section_id: "",
    academic_year_id: "",
  });
  const [classTeacherFormErrors, setClassTeacherFormErrors] = useState({});
  const [classTeacherFormSaving, setClassTeacherFormSaving] = useState(false);

  // Teacher-Subject Filters
  const [search, setSearch] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterGradeId, setFilterGradeId] = useState("");
  const [filterAcademicYearId, setFilterAcademicYearId] = useState("");

  // Class Teacher Filters
  const [classTeacherSearch, setClassTeacherSearch] = useState("");
  const [classTeacherFilterTeacherId, setClassTeacherFilterTeacherId] = useState("");
  const [classTeacherFilterAcademicYearId, setClassTeacherFilterAcademicYearId] = useState("");

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [teachersData, gradesData, yearsData, sectionsData] = await Promise.all([
          teacherService.listTeachers({ limit: 300 }),
          gradeService.listGrades({ limit: 200 }),
          academicYearService.listAcademicYears({ limit: 200 }),
          sectionService.listSections({ limit: 300 }),
        ]);
        setTeachers(teachersData.items || []);
        setGrades(gradesData.items || []);
        setAcademicYears(yearsData.items || []);
        setSections(sectionsData.items || []);
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadFilterOptions();
  }, []);

  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        const data = await teacherSubjectService.listTeacherSubjects({
          search,
          teacher_id: filterTeacherId || undefined,
          grade_id: filterGradeId || undefined,
          academic_year_id: filterAcademicYearId || undefined,
          limit: 100,
          offset: 0,
        });
        setAssignments(data.items || []);
        setError("");
        setHasLoaded(true);
      } catch (err) {
        setError(err.message || "Unable to load teacher-subject assignments");
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, [search, filterTeacherId, filterGradeId, filterAcademicYearId]);

  // Load Class Teachers
  useEffect(() => {
    async function loadClassTeachers() {
      try {
        setClassTeacherLoading(true);
        const data = await classTeacherService.listClassTeachers({
          search: classTeacherSearch,
          teacher_id: classTeacherFilterTeacherId || undefined,
          academic_year_id: classTeacherFilterAcademicYearId || undefined,
          limit: 100,
          offset: 0,
        });
        setClassTeachers(data.items || []);
        setClassTeacherError("");
        setClassTeacherHasLoaded(true);
      } catch (err) {
        setClassTeacherError(err.message || "Unable to load class teacher assignments");
        setClassTeacherHasLoaded(true);
      } finally {
        setClassTeacherLoading(false);
      }
    }

    loadClassTeachers();
  }, [classTeacherSearch, classTeacherFilterTeacherId, classTeacherFilterAcademicYearId]);

  // Handle class teacher form
  const handleClassTeacherFormChange = (e) => {
    const { name, value } = e.target;
    setClassTeacherForm((prev) => ({ ...prev, [name]: value }));
    if (classTeacherFormErrors[name]) {
      setClassTeacherFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validateClassTeacherForm = () => {
    const errs = {};
    if (!classTeacherForm.teacher_id) errs.teacher_id = "Teacher is required";
    if (!classTeacherForm.section_id) errs.section_id = "Section is required";
    if (!classTeacherForm.academic_year_id) errs.academic_year_id = "Academic year is required";
    return errs;
  };

  const handleAssignClassTeacher = async (e) => {
    e.preventDefault();
    setClassTeacherError("");

    const errs = validateClassTeacherForm();
    setClassTeacherFormErrors(errs);

    if (Object.keys(errs).length > 0) {
      return;
    }

    setClassTeacherFormSaving(true);

    try {
      await classTeacherService.assignClassTeacher({
        teacher_id: classTeacherForm.teacher_id,
        section_id: classTeacherForm.section_id,
        academic_year_id: classTeacherForm.academic_year_id,
      });

      // Reload the list
      const data = await classTeacherService.listClassTeachers({
        limit: 100,
        offset: 0,
      });
      setClassTeachers(data.items || []);

      // Reset form
      setClassTeacherForm({ teacher_id: "", section_id: "", academic_year_id: "" });
      setShowClassTeacherForm(false);
      setClassTeacherError("");
    } catch (err) {
      setClassTeacherError(err.message || "Unable to assign class teacher. Please try again.");
    } finally {
      setClassTeacherFormSaving(false);
    }
  };

  const handleDeactivateClassTeacher = async (id, teacherName, sectionName) => {
    if (!window.confirm(`Deactivate ${teacherName} as class teacher for ${sectionName}?`)) {
      return;
    }

    try {
      await classTeacherService.deactivateClassTeacher(id);
      setClassTeachers(classTeachers.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message || "Failed to deactivate");
    }
  };

  const assignmentCount = useMemo(() => assignments.length, [assignments]);
  const classTeacherCount = useMemo(() => classTeachers.length, [classTeachers]);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Teachers Management</h1>
          <p>Manage teacher subject assignments and class teacher (homeroom) assignments.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === "subjects" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("subjects")}
        >
          📚 Subject Assignments ({assignmentCount})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "classTeachers" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("classTeachers")}
        >
          👥 Class Teachers ({classTeacherCount})
        </button>
      </div>

      {/* TAB 1: Teacher Subject Assignments */}
      {activeTab === "subjects" && (
        <>
          <div className={styles.tabButtonsRow}>
            <Link href="/dashboard/teachers/subjects/new" className={styles.primaryButton}>
              + New Subject Assignment
            </Link>
          </div>

          <div className={styles.summaryCard}>
            <div>
              <span className={styles.summaryLabel}>Search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by teacher or subject name..."
                className={styles.searchInput}
              />
            </div>
            <div>
              <span className={styles.summaryLabel}>Teacher</span>
              <select
                value={filterTeacherId}
                onChange={(e) => setFilterTeacherId(e.target.value)}
                className={styles.searchInput}
              >
                <option value="">All Teachers</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={styles.summaryLabel}>Grade</span>
              <select
                value={filterGradeId}
                onChange={(e) => setFilterGradeId(e.target.value)}
                className={styles.searchInput}
              >
                <option value="">All Grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={styles.summaryLabel}>Academic Year</span>
              <select
                value={filterAcademicYearId}
                onChange={(e) => setFilterAcademicYearId(e.target.value)}
                className={styles.searchInput}
              >
                <option value="">All Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <div className={styles.errorBox}>{error}</div> : null}

          {loading && !hasLoaded ? (
            <div className={styles.loading}>Loading assignments...</div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>Grade</th>
                    <th>Section</th>
                    <th>Academic Year</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.teacher_name}</strong>
                      </td>
                      <td>
                        {a.subject_name} ({a.subject_code})
                      </td>
                      <td>{a.grade_name}</td>
                      <td>{a.section_name}</td>
                      <td>{a.academic_year_name}</td>
                      <td>{a.start_date ? new Date(a.start_date).toLocaleDateString() : "—"}</td>
                      <td>{a.end_date ? new Date(a.end_date).toLocaleDateString() : "—"}</td>
                      <td>
                        <span
                          className={styles.statusPill}
                          style={{
                            background: (STATUS_COLORS[a.status] || STATUS_COLORS.INACTIVE).bg,
                            color: (STATUS_COLORS[a.status] || STATUS_COLORS.INACTIVE).color,
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>
                        <Link href={`/dashboard/teachers/subjects/${a.id}`} className={styles.linkButton}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "#667085" }}>
                        No assignments found. Create a new assignment to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB 2: Class Teacher Assignments */}
      {activeTab === "classTeachers" && (
        <>
          <div className={styles.tabButtonsRow}>
            <button
              onClick={() => setShowClassTeacherForm(!showClassTeacherForm)}
              className={styles.primaryButton}
            >
              {showClassTeacherForm ? "✕ Cancel" : "+ Assign Class Teacher"}
            </button>
          </div>

          {/* Modal Overlay */}
          {showClassTeacherForm && (
            <div className={styles.modalOverlay} onClick={() => setShowClassTeacherForm(false)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>Assign Class Teacher</h2>
                  <button
                    type="button"
                    className={styles.modalCloseBtn}
                    onClick={() => setShowClassTeacherForm(false)}
                  >
                    ✕
                  </button>
                </div>

                {classTeacherError && (
                  <div className={styles.errorBox} style={{ marginBottom: "16px" }}>
                    {classTeacherError}
                  </div>
                )}

                <form onSubmit={handleAssignClassTeacher} className={styles.modalForm}>
                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Teacher <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      name="teacher_id"
                      value={classTeacherForm.teacher_id}
                      onChange={handleClassTeacherFormChange}
                      className={`${styles.select} ${classTeacherFormErrors.teacher_id ? styles.inputError : ""}`}
                    >
                      <option value="">-- Select Teacher --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.first_name} {t.last_name}
                        </option>
                      ))}
                    </select>
                    {classTeacherFormErrors.teacher_id && (
                      <span style={{ color: "#ef4444", fontSize: "12px", display: "block", marginTop: "4px" }}>
                        {classTeacherFormErrors.teacher_id}
                      </span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Section <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      name="section_id"
                      value={classTeacherForm.section_id}
                      onChange={handleClassTeacherFormChange}
                      className={`${styles.select} ${classTeacherFormErrors.section_id ? styles.inputError : ""}`}
                    >
                      <option value="">-- Select Section --</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.grade_name} - {s.name}
                        </option>
                      ))}
                    </select>
                    {classTeacherFormErrors.section_id && (
                      <span style={{ color: "#ef4444", fontSize: "12px", display: "block", marginTop: "4px" }}>
                        {classTeacherFormErrors.section_id}
                      </span>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Academic Year <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      name="academic_year_id"
                      value={classTeacherForm.academic_year_id}
                      onChange={handleClassTeacherFormChange}
                      className={`${styles.select} ${classTeacherFormErrors.academic_year_id ? styles.inputError : ""}`}
                    >
                      <option value="">-- Select Year --</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} {y.is_active ? "★ (Active)" : ""}
                        </option>
                      ))}
                    </select>
                    {classTeacherFormErrors.academic_year_id && (
                      <span style={{ color: "#ef4444", fontSize: "12px", display: "block", marginTop: "4px" }}>
                        {classTeacherFormErrors.academic_year_id}
                      </span>
                    )}
                  </div>

                  <div className={styles.modalFormActions}>
                    <button
                      type="button"
                      onClick={() => setShowClassTeacherForm(false)}
                      className={styles.secondaryButton}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={classTeacherFormSaving}
                      className={styles.primaryButton}
                    >
                      {classTeacherFormSaving ? "Assigning..." : "Assign Class Teacher"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className={styles.summaryCard}>
            <div>
              <span className={styles.summaryLabel}>Search</span>
              <input
                value={classTeacherSearch}
                onChange={(e) => setClassTeacherSearch(e.target.value)}
                placeholder="Search by teacher or class name..."
                className={styles.searchInput}
              />
            </div>
            <div>
              <span className={styles.summaryLabel}>Teacher</span>
              <select
                value={classTeacherFilterTeacherId}
                onChange={(e) => setClassTeacherFilterTeacherId(e.target.value)}
                className={styles.searchInput}
              >
                <option value="">All Teachers</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={styles.summaryLabel}>Academic Year</span>
              <select
                value={classTeacherFilterAcademicYearId}
                onChange={(e) => setClassTeacherFilterAcademicYearId(e.target.value)}
                className={styles.searchInput}
              >
                <option value="">All Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {classTeacherError && !showClassTeacherForm && (
            <div className={styles.errorBox}>{classTeacherError}</div>
          )}

          {classTeacherLoading && !classTeacherHasLoaded ? (
            <div className={styles.loading}>Loading class teachers...</div>
          ) : classTeachers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#667085" }}>
              <p>No class teachers assigned yet.</p>
              <button
                onClick={() => setShowClassTeacherForm(true)}
                className={styles.primaryButton}
                style={{ marginTop: "16px" }}
              >
                Assign First Class Teacher
              </button>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Section</th>
                    <th>Grade</th>
                    <th>Academic Year</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classTeachers.map((ct) => (
                    <tr key={ct.id}>
                      <td>
                        <strong>{ct.teacher_name}</strong>
                      </td>
                      <td>{ct.section_name}</td>
                      <td>{ct.grade_name}</td>
                      <td>{ct.academic_year_name}</td>
                      <td>
                        <span
                          className={styles.statusPill}
                          style={{
                            background: (STATUS_COLORS[ct.status] || STATUS_COLORS.INACTIVE).bg,
                            color: (STATUS_COLORS[ct.status] || STATUS_COLORS.INACTIVE).color,
                          }}
                        >
                          {ct.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            handleDeactivateClassTeacher(ct.id, ct.teacher_name, ct.section_name)
                          }
                          className={styles.dangerButton}
                          style={{ fontSize: "12px", padding: "4px 8px" }}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
