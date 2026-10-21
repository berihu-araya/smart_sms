"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HiArrowLeft,
  HiArrowRight,
  HiCheck,
  HiCheckCircle,
  HiSparkles,
  HiBookOpen,
  HiAcademicCap,
  HiUserGroup,
  HiArrowPath,
  HiCalendarDays,
} from "react-icons/hi2";
import academicYearService from "@/services/academicYearService";
import styles from "./page.module.css";

export default function AcademicYearTransitionPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [sourceYearId, setSourceYearId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");

  // Stepper state: 1 = Selection & Preview, 2 = Execution, 3 = Completed
  const [step, setStep] = useState(1);

  // Preview Data
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Configuration Toggles
  const [cloneGradeSubjects, setCloneGradeSubjects] = useState(true);
  const [cloneTeacherAssignments, setCloneTeacherAssignments] = useState(true);
  const [cloneClassTeachers, setCloneClassTeachers] = useState(true);
  const [activateTargetYear, setActivateTargetYear] = useState(true);
  const [closeSourceYear, setCloseSourceYear] = useState(true);

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [error, setError] = useState(null);

  // Load available academic years
  useEffect(() => {
    async function loadYears() {
      try {
        const res = await academicYearService.listAcademicYears({ limit: 100 });
        const list = Array.isArray(res) ? res : res?.items || [];
        setAcademicYears(list);

        const activeYear = list.find((y) => y.is_active);
        const inactiveYears = list.filter((y) => !y.is_active);

        if (activeYear) {
          setTargetYearId(activeYear.id);
        }
        if (inactiveYears.length > 0) {
          setSourceYearId(inactiveYears[0].id);
        }
      } catch (err) {
        console.error("Failed to load academic years:", err);
        setError("Unable to load academic years");
      }
    }
    loadYears();
  }, []);

  // Fetch rollover preview whenever source or target changes
  useEffect(() => {
    if (!sourceYearId || !targetYearId || sourceYearId === targetYearId) {
      setPreviewData(null);
      return;
    }

    async function fetchPreview() {
      setLoadingPreview(true);
      setError(null);
      try {
        const data = await academicYearService.getRolloverPreview({
          sourceAcademicYearId: sourceYearId,
          targetAcademicYearId: targetYearId,
        });
        setPreviewData(data);
      } catch (err) {
        console.error("Failed to fetch rollover preview:", err);
        setPreviewData(null);
      } finally {
        setLoadingPreview(false);
      }
    }

    fetchPreview();
  }, [sourceYearId, targetYearId]);

  const handleExecuteRollover = async () => {
    if (!sourceYearId || !targetYearId || sourceYearId === targetYearId) {
      setError("Please select distinct source and target academic sessions.");
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      const result = await academicYearService.executeRollover({
        sourceAcademicYearId: sourceYearId,
        targetAcademicYearId: targetYearId,
        cloneGradeSubjects,
        cloneTeacherAssignments,
        cloneClassTeachers,
        activateTargetYear,
        closeSourceYear,
      });

      setExecutionResult(result);
      setStep(3);

      // Trigger global header update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("smart-sms-academic-year-change"));
      }
    } catch (err) {
      console.error("Rollover execution failed:", err);
      setError(err.message || "Failed to execute academic year rollover.");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className={styles.transitionPage}>
      {/* Back Link */}
      <Link href="/dashboard/settings/academic-years" className={styles.backLink}>
        <HiArrowLeft /> Back to Academic Years List
      </Link>

      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>Academic Year Transition & Rollover Wizard</h1>
          <p className={styles.headerSub}>
            Conclude the previous academic session, clone curriculum & teacher assignments, and cleanly initialize operational modules for the new year.
          </p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className={styles.stepperBar}>
        <div className={`${styles.stepItem} ${step === 1 ? styles.stepActive : step > 1 ? styles.stepCompleted : ""}`}>
          <div className={styles.stepCircle}>{step > 1 ? <HiCheck /> : "1"}</div>
          <span className={styles.stepLabel}>Select Sessions & Pre-Flight</span>
        </div>
        <div className={styles.stepDivider}></div>
        <div className={`${styles.stepItem} ${step === 2 ? styles.stepActive : step > 2 ? styles.stepCompleted : ""}`}>
          <div className={styles.stepCircle}>{step > 2 ? <HiCheck /> : "2"}</div>
          <span className={styles.stepLabel}>Configure Rollover Options</span>
        </div>
        <div className={styles.stepDivider}></div>
        <div className={`${styles.stepItem} ${step === 3 ? styles.stepActive : ""}`}>
          <div className={styles.stepCircle}>3</div>
          <span className={styles.stepLabel}>Execution & Final Report</span>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "14px 18px", borderRadius: "10px", marginBottom: "20px", fontWeight: "600" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ================= STEP 1 & 2: CONFIGURATION & PRE-FLIGHT ================= */}
      {step < 3 && (
        <div className={styles.wizardCard}>
          <h2 className={styles.cardTitle}>
            <HiCalendarDays /> Academic Session Selection
          </h2>
          <p className={styles.cardSub}>
            Choose the concluded source year to clone configurations from, and the incoming target academic year.
          </p>

          <div className={styles.selectionGrid}>
            <div className={styles.yearSelectBox}>
              <span className={styles.boxLabel}>Source Concluded Year</span>
              <select
                className={styles.selectInput}
                value={sourceYearId}
                onChange={(e) => setSourceYearId(e.target.value)}
                disabled={executing}
              >
                <option value="">-- Select Source Year --</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_active ? "(Current Active)" : "(Archived)"}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.arrowTransfer}>
              <HiArrowRight />
            </div>

            <div className={styles.yearSelectBox}>
              <span className={styles.boxLabel}>Target Incoming Year</span>
              <select
                className={styles.selectInput}
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                disabled={executing}
              >
                <option value="">-- Select Target Year --</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_active ? "(Current Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pre-Flight Analysis */}
          {loadingPreview ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
              Calculating pre-flight impact analysis between sessions...
            </div>
          ) : previewData ? (
            <>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginBottom: "14px" }}>
                Pre-Flight Curriculum & Staffing Overview
              </h3>

              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <div className={`${styles.metricIconWrap} ${styles.iconSubjects}`}>
                    <HiBookOpen />
                  </div>
                  <div className={styles.metricContent}>
                    <span className={styles.metricTitle}>Grade Subjects Mapped</span>
                    <div className={styles.metricValues}>
                      <span className={styles.metricCount}>
                        {previewData.summary.sourceGradeSubjectsCount}
                      </span>
                      <span className={styles.metricTarget}>
                        ({previewData.summary.targetExistingGradeSubjectsCount} already in target)
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={`${styles.metricIconWrap} ${styles.iconTeachers}`}>
                    <HiAcademicCap />
                  </div>
                  <div className={styles.metricContent}>
                    <span className={styles.metricTitle}>Teacher Subject Assignments</span>
                    <div className={styles.metricValues}>
                      <span className={styles.metricCount}>
                        {previewData.summary.sourceTeacherSubjectsCount}
                      </span>
                      <span className={styles.metricTarget}>
                        ({previewData.summary.targetExistingTeacherSubjectsCount} in target)
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={`${styles.metricIconWrap} ${styles.iconClassTeachers}`}>
                    <HiUserGroup />
                  </div>
                  <div className={styles.metricContent}>
                    <span className={styles.metricTitle}>Class Teachers in Charge</span>
                    <div className={styles.metricValues}>
                      <span className={styles.metricCount}>
                        {previewData.summary.sourceClassTeachersCount}
                      </span>
                      <span className={styles.metricTarget}>
                        ({previewData.summary.targetExistingClassTeachersCount} in target)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rollover Execution Toggles */}
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", marginBottom: "14px" }}>
                Transition Actions & Automated Cloning
              </h3>

              <div className={styles.togglesList}>
                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={cloneGradeSubjects}
                    onChange={(e) => setCloneGradeSubjects(e.target.checked)}
                    disabled={executing}
                  />
                  <div className={styles.toggleText}>
                    <span className={styles.toggleTitle}>Clone Curriculum Grade Subjects</span>
                    <span className={styles.toggleDesc}>
                      Copy all {previewData.summary.sourceGradeSubjectsCount} grade-subject curriculum rules (weekly periods, pass marks, credits) into the target year.
                    </span>
                  </div>
                </label>

                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={cloneTeacherAssignments}
                    onChange={(e) => setCloneTeacherAssignments(e.target.checked)}
                    disabled={executing}
                  />
                  <div className={styles.toggleText}>
                    <span className={styles.toggleTitle}>Clone Active Teacher-Subject Assignments</span>
                    <span className={styles.toggleDesc}>
                      Carry forward subject teaching staff assignments for grades and sections into the new academic year.
                    </span>
                  </div>
                </label>

                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={cloneClassTeachers}
                    onChange={(e) => setCloneClassTeachers(e.target.checked)}
                    disabled={executing}
                  />
                  <div className={styles.toggleText}>
                    <span className={styles.toggleTitle}>Clone Class Teacher Assignments</span>
                    <span className={styles.toggleDesc}>
                      Carry forward homeroom and class teacher in-charge responsibilities.
                    </span>
                  </div>
                </label>

                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={activateTargetYear}
                    onChange={(e) => setActivateTargetYear(e.target.checked)}
                    disabled={executing}
                  />
                  <div className={styles.toggleText}>
                    <span className={styles.toggleTitle}>Activate Target Academic Year</span>
                    <span className={styles.toggleDesc}>
                      Make {previewData.targetYear.name} the active operational session across the school management system.
                    </span>
                  </div>
                </label>

                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={closeSourceYear}
                    onChange={(e) => setCloseSourceYear(e.target.checked)}
                    disabled={executing}
                  />
                  <div className={styles.toggleText}>
                    <span className={styles.toggleTitle}>Archive / Close Concluded Source Year</span>
                    <span className={styles.toggleDesc}>
                      Mark {previewData.sourceYear.name} as closed/inactive, preserving historical transcripts and grades in read-only mode.
                    </span>
                  </div>
                </label>
              </div>

              <div className={styles.cardFooter}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleExecuteRollover}
                  disabled={executing || !sourceYearId || !targetYearId}
                >
                  <HiSparkles /> {executing ? "Processing Rollover..." : "Execute 1-Click Rollover"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
              Please select both source and target academic sessions above to view pre-flight analysis.
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 3: SUCCESS & REPORT ================= */}
      {step === 3 && executionResult && (
        <div className={`${styles.wizardCard} ${styles.successCard}`}>
          <div className={styles.successIconWrap}>
            <HiCheckCircle />
          </div>

          <h2 className={styles.successTitle}>Academic Year Rollover Successful!</h2>
          <p className={styles.successSub}>
            The academic session <strong>{executionResult.targetYear}</strong> is now operational. Historical records for <strong>{executionResult.sourceYear}</strong> are safely archived.
          </p>

          <div className={styles.statsBanner}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{executionResult.stats?.clonedGradeSubjects || 0}</span>
              <span className={styles.statDesc}>Curriculum Subjects Cloned</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{executionResult.stats?.clonedTeacherAssignments || 0}</span>
              <span className={styles.statDesc}>Teacher Allocations Cloned</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{executionResult.stats?.clonedClassTeachers || 0}</span>
              <span className={styles.statDesc}>Class Teachers Assigned</span>
            </div>
          </div>

          <div className={styles.quickActionsRow}>
            <Link href="/dashboard/marks" className={styles.actionBtnLink}>
              Verify Marks & Exams ➔
            </Link>
            <Link href="/dashboard/timetable" className={styles.actionBtnLink}>
              Generate Timetable ➔
            </Link>
            <Link href="/dashboard/students/promotions" className={styles.actionBtnLink}>
              Promote Students ➔
            </Link>
            <Link href="/dashboard/settings/academic-years" className={styles.actionBtnLink}>
              Return to Academic Years
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
