"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import gradeSubjectService from "@/services/gradeSubjectService";
import gradeService from "@/services/gradeService";
import subjectService from "@/services/subjectService";
import academicYearService from "@/services/academicYearService";
import teacherService from "@/services/teacherService";
import Modal from "@/components/common/Modal";
import {
  GradeSubjectFormModal,
  GradeSubjectDeleteModal,
} from "@/components/grades";
import styles from "./page.module.css";
import {
  HiAcademicCap,
  HiBookOpen,
  HiClock,
  HiSparkles,
  HiArrowPath,
  HiPlus,
  HiDocumentDuplicate,
  HiSquares2X2,
  HiListBullet,
  HiMagnifyingGlass,
  HiCheckCircle,
  HiXMark,
  HiPencilSquare,
  HiTrash,
  HiEye,
  HiOutlineCheck,
} from "react-icons/hi2";

function GradeSubjectListContent() {
  const searchParams = useSearchParams();

  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [activeYearId, setActiveYearId] = useState("");
  const [allSubjects, setAllSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Filters & View State
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [compulsoryFilter, setCompulsoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Metrics
  const [stats, setStats] = useState(null);

  // Modals & Action States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState("");

  // Grade Subject Allocation Modal State (Create & Edit)
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Grade Subject Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Bulk Allocator Modal State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkGradeId, setBulkGradeId] = useState("");
  const [bulkYearId, setBulkYearId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState(new Set());
  const [bulkDefaultCompulsory, setBulkDefaultCompulsory] = useState(true);
  const [bulkDefaultPeriods, setBulkDefaultPeriods] = useState("4");
  const [bulkDefaultTotalMarks, setBulkDefaultTotalMarks] = useState("100");
  const [bulkDefaultPassMarks, setBulkDefaultPassMarks] = useState("40");
  const [bulkSearch, setBulkSearch] = useState("");

  // Clone Modal State
  const [isCloneOpen, setIsCloneOpen] = useState(false);
  const [cloneSourceGrade, setCloneSourceGrade] = useState("");
  const [cloneSourceYear, setCloneSourceYear] = useState("");
  const [cloneTargetGrade, setCloneTargetGrade] = useState("");
  const [cloneTargetYear, setCloneTargetYear] = useState("");

  // Support ?new=1 query param
  useEffect(() => {
    const isNew = searchParams.get("new");
    if (isNew === "1" || isNew === "true") {
      setEditingAssignment(null);
      setIsAllocationModalOpen(true);
    }
  }, [searchParams]);

  // Support ?edit=[id] query param
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && assignments.length > 0) {
      const target = assignments.find((a) => a.id === editId);
      if (target) {
        setEditingAssignment(target);
        setIsAllocationModalOpen(true);
      }
    }
  }, [searchParams, assignments]);

  // 1. Initial Load: Academic Years, Active Year, Grades, All Subjects, Teachers
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [gradesData, yearsData, activeYear, subjectsData, teachersData] =
          await Promise.all([
            gradeService.listGrades({ limit: 100 }).catch(() => ({ items: [] })),
            academicYearService
              .listAcademicYears({ limit: 100 })
              .catch(() => ({ items: [] })),
            academicYearService.getActiveAcademicYear().catch(() => null),
            subjectService.listSubjects({ limit: 200 }).catch(() => ({ items: [] })),
            teacherService.listTeachers({ limit: 200 }).catch(() => ({ items: [] })),
          ]);

        const gList = gradesData.items || gradesData.data?.items || [];
        const yList = yearsData.items || yearsData.data?.items || [];
        const subList = subjectsData.items || subjectsData.data?.items || [];
        const tList =
          teachersData.items ||
          teachersData.data?.items ||
          (Array.isArray(teachersData) ? teachersData : []);

        setGrades(gList);
        setAcademicYears(yList);
        setAllSubjects(subList);
        setTeachers(tList);

        const currentActive =
          activeYear?.data?.id ||
          yList.find((y) => y.is_active)?.id ||
          yList[0]?.id ||
          "";
        setActiveYearId(currentActive);
        setSelectedAcademicYear(currentActive);
        setBulkYearId(currentActive);
        setCloneSourceYear(currentActive);
        setCloneTargetYear(currentActive);

        if (gList.length > 0) {
          setBulkGradeId(gList[0].id);
          setCloneSourceGrade(gList[0].id);
          setCloneTargetGrade(gList[1]?.id || gList[0].id);
        }
      } catch (err) {
        console.error("Failed to load initial master data:", err);
      }
    }

    loadMasterData();
  }, []);

  // 2. Load Assignments & Stats whenever Filters Change
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [res, statsRes] = await Promise.all([
        gradeSubjectService.listGradeSubjects({
          grade_id: selectedGrade || undefined,
          academic_year_id: selectedAcademicYear || undefined,
          is_compulsory: compulsoryFilter || undefined,
          search,
          limit: 200,
          offset: 0,
        }),
        gradeSubjectService
          .getCurriculumStats({
            gradeId: selectedGrade || undefined,
            academicYearId: selectedAcademicYear || undefined,
          })
          .catch(() => null),
      ]);

      setAssignments(res.items || []);
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      setError(err.message || "Failed to load grade subjects");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGrade, selectedAcademicYear, compulsoryFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show Toast Notification
  const showToast = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Open New Assignment Modal
  const handleOpenNewAssignment = () => {
    setEditingAssignment(null);
    setIsAllocationModalOpen(true);
  };

  // Open Edit Assignment Modal
  const handleOpenEditAssignment = (item) => {
    setEditingAssignment(item);
    setIsAllocationModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (item) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  // Toggle Compulsory Status quickly
  const handleToggleCompulsory = async (item) => {
    try {
      setActionLoading(true);
      await gradeSubjectService.updateGradeSubject(item.id, {
        isCompulsory: !item.is_compulsory,
      });
      showToast(
        `Updated "${item.subject_name}" to ${
          !item.is_compulsory ? "Compulsory" : "Elective"
        }`
      );
      loadData();
    } catch (err) {
      alert(err.message || "Failed to update subject status");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Bulk Modal
  const handleOpenBulkModal = (gradeId) => {
    const targetGrade = gradeId || selectedGrade || grades[0]?.id || "";
    setBulkGradeId(targetGrade);
    setBulkYearId(selectedAcademicYear || activeYearId);
    setSelectedSubjectIds(new Set());
    setBulkSearch("");
    setIsBulkOpen(true);
  };

  // Handle Bulk Modal Subject Checkbox Toggle
  const handleToggleSubjectSelection = (id) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Submit Bulk Allocation
  const handleSaveBulkAllocation = async (e) => {
    e.preventDefault();
    if (!bulkGradeId || !bulkYearId || selectedSubjectIds.size === 0) {
      alert("Please select at least one subject to allocate.");
      return;
    }

    try {
      setActionLoading(true);
      const subjectsPayload = Array.from(selectedSubjectIds).map(
        (subId, idx) => ({
          subject_id: subId,
          is_compulsory: bulkDefaultCompulsory,
          weekly_periods: bulkDefaultPeriods ? Number(bulkDefaultPeriods) : null,
          total_marks: bulkDefaultTotalMarks
            ? Number(bulkDefaultTotalMarks)
            : null,
          pass_marks: bulkDefaultPassMarks ? Number(bulkDefaultPassMarks) : null,
          display_order: idx + 1,
        })
      );

      await gradeSubjectService.bulkAssignGradeSubjects({
        gradeId: bulkGradeId,
        academicYearId: bulkYearId,
        subjects: subjectsPayload,
      });

      setIsBulkOpen(false);
      showToast(
        `Successfully mapped ${subjectsPayload.length} subject(s) to grade!`
      );
      loadData();
    } catch (err) {
      alert(err.message || "Failed to allocate subjects in bulk");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Clone Curriculum
  const handleSaveClone = async (e) => {
    e.preventDefault();
    if (
      !cloneSourceGrade ||
      !cloneSourceYear ||
      !cloneTargetGrade ||
      !cloneTargetYear
    ) {
      alert("Please specify both source and target grade and academic years.");
      return;
    }
    if (
      cloneSourceGrade === cloneTargetGrade &&
      cloneSourceYear === cloneTargetYear
    ) {
      alert("Source and target cannot be identical.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await gradeSubjectService.cloneGradeSubjects({
        sourceGradeId: cloneSourceGrade,
        sourceAcademicYearId: cloneSourceYear,
        targetGradeId: cloneTargetGrade,
        targetAcademicYearId: cloneTargetYear,
      });

      setIsCloneOpen(false);
      showToast(
        `Successfully cloned ${res.clonedCount || 0} subject(s) to target grade!`
      );
      loadData();
    } catch (err) {
      alert(err.message || "Failed to clone curriculum");
    } finally {
      setActionLoading(false);
    }
  };

  // Mapped subject IDs for the currently selected grade in the bulk modal
  const alreadyMappedSubjectIds = useMemo(() => {
    if (!bulkGradeId || !bulkYearId) return new Set();
    const set = new Set();
    assignments.forEach((a) => {
      if (a.grade_id === bulkGradeId && a.academic_year_id === bulkYearId) {
        set.add(a.subject_id);
      }
    });
    return set;
  }, [assignments, bulkGradeId, bulkYearId]);

  // Filtered subjects in bulk modal
  const filteredBulkSubjects = useMemo(() => {
    if (!bulkSearch) return allSubjects;
    const q = bulkSearch.toLowerCase();
    return allSubjects.filter(
      (s) =>
        s.subject_name?.toLowerCase().includes(q) ||
        s.subject_code?.toLowerCase().includes(q) ||
        s.short_name?.toLowerCase().includes(q)
    );
  }, [allSubjects, bulkSearch]);

  const selectedGradeName = useMemo(() => {
    if (!selectedGrade) return "All Grades";
    return grades.find((g) => g.id === selectedGrade)?.name || "Selected Grade";
  }, [selectedGrade, grades]);

  return (
    <div className={styles.page}>
      {/* Header & Main Actions */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1>Subject-Class Curriculum Mapping</h1>
          <p>
            Define and manage curriculum structures, instructional periods, and
            mark boundaries per grade level.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnClone}
            onClick={() => setIsCloneOpen(true)}
            title="Replicate full curriculum from another grade or year"
          >
            <HiDocumentDuplicate size={17} /> Clone Curriculum
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => handleOpenBulkModal()}
            title="Assign multiple subjects in 1-click"
          >
            <HiSparkles size={17} style={{ color: "#2563eb" }} /> Bulk Allocator
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenNewAssignment}
            title="Assign single subject with customized parameters"
          >
            <HiPlus size={18} /> New Assignment
          </button>
        </div>
      </div>

      {/* Alerts */}
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

      {/* KPI Metric Strip */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiBlue}`}>
            <HiBookOpen />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Mapped Subjects</span>
            <span className={styles.kpiValue}>
              {stats?.total_assignments !== undefined
                ? stats.total_assignments
                : assignments.length}
            </span>
            <span className={styles.kpiSub}>
              {stats?.unique_subjects || assignments.length} unique subject courses
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiGreen}`}>
            <HiOutlineCheck />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Compulsory vs Elective</span>
            <span className={styles.kpiValue}>
              {stats?.compulsory_count ??
                assignments.filter((a) => a.is_compulsory).length}{" "}
              /{" "}
              {stats?.elective_count ??
                assignments.filter((a) => !a.is_compulsory).length}
            </span>
            <span className={styles.kpiSub}>Core curriculum requirements</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiPurple}`}>
            <HiClock />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Weekly Periods</span>
            <span className={styles.kpiValue}>
              {stats?.total_weekly_periods ??
                assignments.reduce(
                  (sum, a) => sum + (Number(a.weekly_periods) || 0),
                  0
                )}
            </span>
            <span className={styles.kpiSub}>Total instructional hours/week</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiAmber}`}>
            <HiAcademicCap />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Curriculum Marks</span>
            <span className={styles.kpiValue}>
              {stats?.total_curriculum_marks
                ? Math.round(stats.total_curriculum_marks)
                : "—"}
            </span>
            <span className={styles.kpiSub}>
              Avg Pass Mark:{" "}
              {stats?.avg_pass_marks ? `${stats.avg_pass_marks} pts` : "40%"}
            </span>
          </div>
        </div>
      </div>

      {/* Control & Filter Strip */}
      <div className={styles.controlCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            {/* Search Input */}
            <div className={styles.inputWrapper}>
              <HiMagnifyingGlass className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search subject by name, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Grade Filter Dropdown */}
            <select
              id="gradeSelect"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className={styles.gradeSelect}
            >
              <option value="">All Grades ({grades.length})</option>
              {grades.map((g) => {
                const count = assignments.filter(
                  (a) => a.grade_id === g.id
                ).length;
                return (
                  <option key={g.id} value={g.id}>
                    {g.name} ({count} subject{count === 1 ? "" : "s"})
                  </option>
                );
              })}
            </select>

            {/* Academic Year Selector */}
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className={styles.select}
            >
              <option value="">All Academic Years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? "★ (Active)" : ""}
                </option>
              ))}
            </select>

            {/* Compulsory Filter */}
            <select
              value={compulsoryFilter}
              onChange={(e) => setCompulsoryFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Types (Core & Elective)</option>
              <option value="true">Compulsory (Core) Only</option>
              <option value="false">Elective Only</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "grid" ? styles.viewBtnActive : ""
              }`}
              onClick={() => setViewMode("grid")}
              title="Curriculum Grid Cards"
            >
              <HiSquares2X2 size={16} /> Grid
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "table" ? styles.viewBtnActive : ""
              }`}
              onClick={() => setViewMode("table")}
              title="Spreadsheet Table View"
            >
              <HiListBullet size={16} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className={styles.loading}>
          <span className={styles.spinner}></span> Loading curriculum mappings...
        </div>
      ) : assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <HiAcademicCap className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>
            No Subjects Mapped for {selectedGradeName}
          </h3>
          <p className={styles.emptyText}>
            Get started by using the <strong>New Assignment</strong> modal or{" "}
            <strong>Bulk Allocator</strong> to define the subjects taught in this
            grade level.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "14px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleOpenNewAssignment}
            >
              <HiPlus size={18} /> New Assignment
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => handleOpenBulkModal(selectedGrade)}
            >
              <HiSparkles size={17} style={{ color: "#2563eb" }} /> Bulk
              Allocate Subjects
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ================= CURRICULUM GRID VIEW ================= */
        <div className={styles.curriculumGrid}>
          {assignments.map((item) => (
            <div key={item.id} className={styles.subjectCard}>
              <div className={styles.subjectCardTop}>
                <div className={styles.subjectTitleArea}>
                  <span className={styles.subjectCodeBadge}>
                    {item.subject_code}
                  </span>
                  <h3 className={styles.subjectName}>{item.subject_name}</h3>
                  <span className={styles.gradeBadge}>
                    {item.grade_name} &bull; {item.academic_year_name}
                  </span>
                </div>
              </div>

              {/* Metrics Box */}
              <div className={styles.cardMetricsGrid}>
                <div className={styles.cardMetricItem}>
                  <span className={styles.metricItemLabel}>Periods</span>
                  <span className={styles.metricItemVal}>
                    {item.weekly_periods ?? "—"}/wk
                  </span>
                </div>
                <div className={styles.cardMetricItem}>
                  <span className={styles.metricItemLabel}>Total Marks</span>
                  <span className={styles.metricItemVal}>
                    {item.total_marks ?? "100"} pts
                  </span>
                </div>
                <div className={styles.cardMetricItem}>
                  <span className={styles.metricItemLabel}>Pass Mark</span>
                  <span className={styles.metricItemVal}>
                    {item.pass_marks ?? "40"} pts
                  </span>
                </div>
              </div>

              {/* Teacher Info */}
              <div
                style={{
                  padding: "8px 14px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  margin: "0 14px 10px",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 500 }}>
                  Assigned Teacher:{" "}
                </span>
                <strong
                  style={{
                    color: item.teacher_name ? "#1e40af" : "#94a3b8",
                  }}
                >
                  {item.teacher_name ? `👨‍🏫 ${item.teacher_name}` : "Not Assigned"}
                </strong>
              </div>

              {/* Footer & Actions */}
              <div className={styles.cardFooter}>
                <button
                  type="button"
                  onClick={() => handleToggleCompulsory(item)}
                  disabled={actionLoading}
                  className={`${styles.compulsoryBadge} ${
                    item.is_compulsory
                      ? styles.badgeCompulsory
                      : styles.badgeElective
                  }`}
                  style={{ border: "none", cursor: "pointer" }}
                  title="Click to toggle Compulsory / Elective"
                >
                  {item.is_compulsory ? "✓ Compulsory" : "○ Elective"}
                </button>

                <div className={styles.cardActionBtns}>
                  <Link
                    href={`/dashboard/grades/subjects/${item.id}`}
                    className={styles.iconBtn}
                    title="View Details"
                  >
                    <HiEye size={15} />
                  </Link>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => handleOpenEditAssignment(item)}
                    title="Edit Settings"
                  >
                    <HiPencilSquare size={15} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => handleOpenDeleteModal(item)}
                    disabled={actionLoading}
                    title="Remove from Grade"
                  >
                    <HiTrash size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ================= TABULAR ROSTER VIEW ================= */
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Grade</th>
                  <th>Subject Code & Name</th>
                  <th>Assigned Teacher</th>
                  <th>Academic Session</th>
                  <th>Type</th>
                  <th>Weekly Periods</th>
                  <th>Total / Pass Marks</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: "#64748b", fontWeight: 600 }}>
                      {item.display_order || idx + 1}
                    </td>
                    <td>
                      <strong style={{ color: "#0f172a" }}>
                        {item.grade_name}
                      </strong>
                    </td>
                    <td>
                      <div>
                        <strong>{item.subject_name}</strong>
                        <span
                          style={{
                            color: "#64748b",
                            marginLeft: "6px",
                            fontSize: "12px",
                          }}
                        >
                          ({item.subject_code})
                        </span>
                      </div>
                    </td>
                    <td>
                      {item.teacher_name ? (
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#1e40af",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          👨‍🏫 {item.teacher_name}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#94a3b8",
                            fontStyle: "italic",
                            fontSize: "13px",
                          }}
                        >
                          Not Assigned
                        </span>
                      )}
                    </td>
                    <td>
                      {item.academic_year_name}
                      {item.is_active_year ? (
                        <span
                          style={{
                            marginLeft: "6px",
                            fontSize: "11px",
                            color: "#166534",
                            background: "#dcfce7",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Active
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`${styles.compulsoryBadge} ${
                          item.is_compulsory
                            ? styles.badgeCompulsory
                            : styles.badgeElective
                        }`}
                      >
                        {item.is_compulsory ? "Compulsory" : "Elective"}
                      </span>
                    </td>
                    <td>
                      <strong>{item.weekly_periods ?? "—"}</strong> periods
                    </td>
                    <td>
                      {item.total_marks ?? "100"} / {item.pass_marks ?? "40"}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color:
                            item.status === "ACTIVE" ? "#16a34a" : "#94a3b8",
                        }}
                      >
                        {item.status || "ACTIVE"}
                      </span>
                    </td>
                    <td>
                      <div
                        className={styles.actionsCell}
                        style={{ justifyContent: "flex-end" }}
                      >
                        <Link
                          href={`/dashboard/grades/subjects/${item.id}`}
                          className={styles.iconBtn}
                          title="View"
                        >
                          <HiEye size={15} />
                        </Link>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => handleOpenEditAssignment(item)}
                          title="Edit"
                        >
                          <HiPencilSquare size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleOpenDeleteModal(item)}
                          disabled={actionLoading}
                          title="Delete"
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

      {/* ================= GRADE SUBJECT ALLOCATION MODAL (CREATE & EDIT) ================= */}
      <GradeSubjectFormModal
        isOpen={isAllocationModalOpen}
        onClose={() => {
          setIsAllocationModalOpen(false);
          setEditingAssignment(null);
        }}
        assignment={editingAssignment}
        defaultGradeId={selectedGrade || grades[0]?.id || ""}
        defaultAcademicYearId={selectedAcademicYear || activeYearId}
        grades={grades}
        subjects={allSubjects}
        academicYears={academicYears}
        teachers={teachers}
        onSuccess={(msg) => {
          showToast(msg || "Subject assignment updated successfully!");
          loadData();
        }}
      />

      {/* ================= GRADE SUBJECT DELETE MODAL ================= */}
      {isDeleteModalOpen && (
        <GradeSubjectDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          assignment={deleteTarget}
          onSuccess={(msg) => {
            showToast(msg);
            loadData();
          }}
        />
      )}

      {/* ================= BULK ALLOCATOR MODAL ================= */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="⚡ Batch Subject Allocator"
        subtitle="Select multiple subjects to map to a grade level in a single transaction."
        icon={HiSparkles}
        size="lg"
      >
        <form onSubmit={handleSaveBulkAllocation}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Target Grade & Year */}
            <div className={styles.formGrid2}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Target Grade *</label>
                <select
                  value={bulkGradeId}
                  onChange={(e) => setBulkGradeId(e.target.value)}
                  className={styles.select}
                  required
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Academic Year *</label>
                <select
                  value={bulkYearId}
                  onChange={(e) => setBulkYearId(e.target.value)}
                  className={styles.select}
                  required
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_active ? "★ (Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Default Curriculum Parameters */}
            <div
              className={styles.formGrid2}
              style={{
                background: "#f8fafc",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Weekly Periods</label>
                <input
                  type="number"
                  value={bulkDefaultPeriods}
                  onChange={(e) => setBulkDefaultPeriods(e.target.value)}
                  placeholder="e.g. 4"
                  className={styles.searchInput}
                  style={{ paddingLeft: "12px" }}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Total / Pass Marks</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="number"
                    value={bulkDefaultTotalMarks}
                    onChange={(e) => setBulkDefaultTotalMarks(e.target.value)}
                    placeholder="Max 100"
                    className={styles.searchInput}
                    style={{ paddingLeft: "12px" }}
                  />
                  <input
                    type="number"
                    value={bulkDefaultPassMarks}
                    onChange={(e) => setBulkDefaultPassMarks(e.target.value)}
                    placeholder="Pass 40"
                    className={styles.searchInput}
                    style={{ paddingLeft: "12px" }}
                  />
                </div>
              </div>
            </div>

            {/* Subject Selector Checklist */}
            <div className={styles.formField}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <label className={styles.fieldLabel} style={{ marginBottom: 0 }}>
                  Select Subjects ({selectedSubjectIds.size} selected) *
                </label>
                <input
                  type="text"
                  placeholder="Filter subjects..."
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    outline: "none",
                  }}
                />
              </div>

              <div className={styles.subjectsChecklist}>
                {filteredBulkSubjects.map((sub) => {
                  const isSelected = selectedSubjectIds.has(sub.id);
                  const isAlreadyMapped = alreadyMappedSubjectIds.has(sub.id);

                  return (
                    <div
                      key={sub.id}
                      className={`${styles.subjectCheckItem} ${
                        isSelected ? styles.subjectCheckItemActive : ""
                      }`}
                      onClick={() => handleToggleSubjectSelection(sub.id)}
                    >
                      <div className={styles.checkLeft}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className={styles.checkbox}
                        />
                        <div>
                          <strong
                            style={{ fontSize: "14px", color: "#0f172a" }}
                          >
                            {sub.subject_name}
                          </strong>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              marginLeft: "6px",
                            }}
                          >
                            ({sub.subject_code})
                          </span>
                        </div>
                      </div>

                      {isAlreadyMapped && (
                        <span className={styles.alreadyMappedTag}>
                          Already Mapped
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setIsBulkOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || selectedSubjectIds.size === 0}
              className={styles.btnPrimary}
            >
              {actionLoading
                ? "Saving..."
                : `Allocate ${selectedSubjectIds.size} Subjects`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= CLONE CURRICULUM MODAL ================= */}
      <Modal
        isOpen={isCloneOpen}
        onClose={() => setIsCloneOpen(false)}
        title="📋 Replicate Curriculum Structure"
        subtitle="Copy all mapped subjects, periods, and mark configurations from one grade to another."
        icon={HiDocumentDuplicate}
        size="md"
      >
        <form onSubmit={handleSaveClone}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Source */}
            <div
              style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px",
                  fontSize: "14px",
                  color: "#0f172a",
                }}
              >
                Source Curriculum (Copy From):
              </h4>
              <div className={styles.formGrid2}>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Source Grade</label>
                  <select
                    value={cloneSourceGrade}
                    onChange={(e) => setCloneSourceGrade(e.target.value)}
                    className={styles.select}
                  >
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>
                    Source Academic Year
                  </label>
                  <select
                    value={cloneSourceYear}
                    onChange={(e) => setCloneSourceYear(e.target.value)}
                    className={styles.select}
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Target */}
            <div
              style={{
                background: "#eff6ff",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #bfdbfe",
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px",
                  fontSize: "14px",
                  color: "#1e3a8a",
                }}
              >
                Target Curriculum (Paste To):
              </h4>
              <div className={styles.formGrid2}>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Target Grade</label>
                  <select
                    value={cloneTargetGrade}
                    onChange={(e) => setCloneTargetGrade(e.target.value)}
                    className={styles.select}
                  >
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>
                    Target Academic Year
                  </label>
                  <select
                    value={cloneTargetYear}
                    onChange={(e) => setCloneTargetYear(e.target.value)}
                    className={styles.select}
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.is_active ? "★ (Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setIsCloneOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className={styles.btnPrimary}
            >
              {actionLoading ? "Cloning..." : "Execute Curriculum Clone"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function GradeSubjectListPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "28px" }}>Loading curriculum mappings...</div>
      }
    >
      <GradeSubjectListContent />
    </Suspense>
  );
}
