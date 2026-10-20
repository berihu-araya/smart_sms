'use strict';
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';
import { previewPromotions, executeBatchPromotion } from '@/services/studentPromotionService';
import { listAcademicYears } from '@/services/academicYearService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import {
  HiAcademicCap,
  HiArrowPath,
  HiCheckCircle,
  HiExclamationTriangle,
  HiUserGroup,
  HiArrowRight,
  HiShieldCheck,
  HiCheckBadge,
  HiSparkles,
  HiInformationCircle,
  HiArrowUpRight,
  HiXCircle,
  HiMagnifyingGlass,
  HiChevronRight,
} from 'react-icons/hi2';

export default function StudentPromotionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const canAccess = ['school admin', 'admin', 'staff'].includes(role);

  // Metadata State
  const [academicYears, setAcademicYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  // Selection Filters
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Candidates & Progression State
  const [cohortData, setCohortData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Filter & Search inside roster
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PROMOTED | RETAINED | GRADUATED
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Redirect if unauthorized
  useEffect(() => {
    if (!metaLoading && !canAccess) {
      router.replace('/dashboard');
    }
  }, [metaLoading, canAccess, router]);

  // Load Metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        setMetaLoading(true);
        const [yRes, gRes, sRes] = await Promise.all([
          listAcademicYears({ limit: 50 }).catch(() => ({ items: [] })),
          listGrades({ limit: 100 }).catch(() => ({ items: [] })),
          listSections({ limit: 200 }).catch(() => ({ items: [] })),
        ]);

        const yItems = yRes?.items || yRes?.data?.items || (Array.isArray(yRes) ? yRes : []);
        const gItems = gRes?.items || gRes?.data?.items || (Array.isArray(gRes) ? gRes : []);
        const sItems = sRes?.items || sRes?.data?.items || (Array.isArray(sRes) ? sRes : []);

        setAcademicYears(yItems);
        setGrades(gItems);
        setSections(sItems);

        // Pre-select Active Year as Source Year
        const activeYear = yItems.find((y) => y.is_active);
        if (activeYear) {
          setSourceYearId(activeYear.id);
          // Suggest target year as next year chronologically if available
          const otherYears = yItems.filter((y) => y.id !== activeYear.id);
          if (otherYears.length > 0) {
            setTargetYearId(otherYears[0].id);
          }
        } else if (yItems.length > 0) {
          setSourceYearId(yItems[0].id);
          if (yItems.length > 1) setTargetYearId(yItems[1].id);
        }

        if (gItems.length > 0) {
          setSelectedGradeId(gItems[0].id);
        }
      } catch (err) {
        setFeedback({ type: 'error', message: 'Failed to load system metadata: ' + (err.message || 'Unknown error') });
      } finally {
        setMetaLoading(false);
      }
    }

    loadMeta();
  }, []);

  // Filter sections belonging to selected grade
  const availableCurrentSections = useMemo(() => {
    if (!selectedGradeId) return [];
    return sections.filter((s) => s.grade_id === selectedGradeId);
  }, [sections, selectedGradeId]);

  // Handle Load Candidates
  const handleLoadCandidates = async (e) => {
    if (e) e.preventDefault();
    if (!sourceYearId || !selectedGradeId) {
      setFeedback({ type: 'error', message: 'Please select both Source Academic Year and Grade.' });
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
      const data = await previewPromotions({
        sourceAcademicYearId: sourceYearId,
        gradeId: selectedGradeId,
        sectionId: selectedSectionId || '',
      });

      setCohortData(data);
      // Initialize candidate rows with suggested actions
      const initialRows = (data.candidates || []).map((c) => ({
        ...c,
        action: c.suggestedAction || 'PROMOTED',
        targetGradeId: c.suggestedGradeId,
        targetSectionId: c.suggestedSectionId,
        remarks: c.alreadyProcessed ? 'Re-promoted' : '',
      }));

      setCandidates(initialRows);
      // Select all by default
      setSelectedStudentIds(new Set(initialRows.map((r) => r.studentId)));
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch promotion candidates.' });
      setCohortData(null);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  // Modify individual candidate row
  const updateCandidate = (studentId, patch) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.studentId !== studentId) return c;
        const updated = { ...c, ...patch };

        // If action changed to RETAINED, adjust targetGradeId to current grade
        if (patch.action === 'RETAINED') {
          updated.targetGradeId = cohortData?.currentGrade?.id;
          updated.targetSectionId = c.currentSectionId;
        } else if (patch.action === 'PROMOTED') {
          updated.targetGradeId = cohortData?.nextGrade?.id || null;
          if (cohortData?.nextSections?.length > 0 && !updated.targetSectionId) {
            updated.targetSectionId = cohortData.nextSections[0].id;
          }
        } else if (patch.action === 'GRADUATED') {
          updated.targetGradeId = null;
          updated.targetSectionId = null;
        }

        return updated;
      })
    );
  };

  // Bulk Apply Recommended Actions
  const handleAcceptAllRecommendations = () => {
    setCandidates((prev) =>
      prev.map((c) => ({
        ...c,
        action: c.suggestedAction,
        targetGradeId: c.suggestedGradeId,
        targetSectionId: c.suggestedSectionId,
      }))
    );
    setFeedback({ type: 'success', message: 'Applied system recommended progression to all candidates.' });
  };

  // Bulk Assign Target Section to all PROMOTED
  const handleBulkAssignSection = (secId) => {
    if (!secId) return;
    setCandidates((prev) =>
      prev.map((c) => {
        if (selectedStudentIds.has(c.studentId) && c.action === 'PROMOTED') {
          return { ...c, targetSectionId: secId };
        }
        return c;
      })
    );
  };

  // Toggle Selection
  const toggleSelect = (studentId) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredCandidates.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredCandidates.map((c) => c.studentId)));
    }
  };

  // Filter candidates for display
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PROMOTED' && c.action === 'PROMOTED') ||
        (statusFilter === 'RETAINED' && c.action === 'RETAINED') ||
        (statusFilter === 'GRADUATED' && c.action === 'GRADUATED');

      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchQuery, statusFilter]);

  // Summary counts for Confirmation Modal
  const executionSummary = useMemo(() => {
    const selectedList = candidates.filter((c) => selectedStudentIds.has(c.studentId));
    let promoteCount = 0;
    let retainCount = 0;
    let graduateCount = 0;
    let otherCount = 0;

    selectedList.forEach((c) => {
      if (c.action === 'PROMOTED') promoteCount++;
      else if (c.action === 'RETAINED') retainCount++;
      else if (c.action === 'GRADUATED') graduateCount++;
      else otherCount++;
    });

    return {
      total: selectedList.length,
      promoteCount,
      retainCount,
      graduateCount,
      otherCount,
    };
  }, [candidates, selectedStudentIds]);

  // Execute Batch Promotion
  const handleExecuteBatch = async () => {
    if (!targetYearId) {
      setFeedback({ type: 'error', message: 'Target Academic Year must be selected.' });
      return;
    }

    const selectedList = candidates.filter((c) => selectedStudentIds.has(c.studentId));
    if (selectedList.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one student to promote.' });
      return;
    }

    try {
      setExecuting(true);
      setShowConfirmModal(false);

      const payload = selectedList.map((c) => ({
        studentId: c.studentId,
        currentGradeId: c.currentGradeId,
        currentSectionId: c.currentSectionId,
        finalAverage: c.finalAverage,
        finalGradeLetter: c.finalGradeLetter,
        action: c.action,
        targetGradeId: c.targetGradeId,
        targetSectionId: c.targetSectionId,
        remarks: c.remarks || null,
      }));

      const res = await executeBatchPromotion({
        sourceAcademicYearId: sourceYearId,
        targetAcademicYearId: targetYearId,
        promotions: payload,
      });

      setFeedback({
        type: 'success',
        message: `Successfully executed batch progression! ${res.summary.promoted} promoted, ${res.summary.retained} retained, ${res.summary.graduated} graduated.`,
      });

      // Reload cohort data to refresh statuses
      await handleLoadCandidates();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Batch promotion execution failed.' });
    } finally {
      setExecuting(false);
    }
  };

  const getLetterStyle = (letter) => {
    if (!letter) return '';
    if (letter.startsWith('A')) return styles.letterA;
    if (letter.startsWith('B')) return styles.letterB;
    if (letter.startsWith('C')) return styles.letterC;
    if (letter.startsWith('D')) return styles.letterD;
    return styles.letterF;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <nav className={styles.breadcrumb}>
          <Link href="/dashboard">Dashboard</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link href="/dashboard/students">Students</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>Student Promotions</span>
        </nav>

        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>
              <span className={styles.titleIcon}>
                <HiSparkles size={24} />
              </span>
              Student Promotions & Academic Progression
            </h1>
            <p className={styles.subtitle}>
              Intelligent end-of-year cohort roll-forward engine with continuous transcript tracking and performance audits.
            </p>
          </div>
        </div>
      </header>

      {/* Stepper Guide */}
      <div className={styles.stepper}>
        <div className={`${styles.stepItem} ${!cohortData ? styles.stepActive : styles.stepCompleted}`}>
          <div className={styles.stepNumber}>1</div>
          <div>
            <span className={styles.stepLabel}>Select Cohort</span>
            <span className={styles.stepSubLabel}>Years, Grade & Section</span>
          </div>
        </div>
        <div className={styles.stepDivider} />
        <div className={`${styles.stepItem} ${cohortData ? styles.stepActive : ''}`}>
          <div className={styles.stepNumber}>2</div>
          <div>
            <span className={styles.stepLabel}>Review & Allocate</span>
            <span className={styles.stepSubLabel}>Marks, Actions & Placements</span>
          </div>
        </div>
        <div className={styles.stepDivider} />
        <div className={styles.stepItem}>
          <div className={styles.stepNumber}>3</div>
          <div>
            <span className={styles.stepLabel}>Atomic Execution</span>
            <span className={styles.stepSubLabel}>Commit Transcripts</span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`${styles.alertBox} ${feedback.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          {feedback.type === 'success' ? <HiCheckCircle size={22} /> : <HiXCircle size={22} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Cohort Selection Form Card */}
      <div className={styles.configCard}>
        <div className={styles.configCardHeader}>
          <div className={styles.configTitle}>
            <HiAcademicCap size={20} color="#2563eb" />
            <span>Select Progression Cohort & Academic Timeline</span>
          </div>
        </div>

        <form onSubmit={handleLoadCandidates} className={styles.formGrid}>
          {/* Source Academic Year */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Source Academic Year (From)</label>
            <select
              className={styles.formSelect}
              value={sourceYearId}
              onChange={(e) => setSourceYearId(e.target.value)}
              disabled={loading || executing}
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_active ? '★ (Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Current Grade */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Current Grade</label>
            <select
              className={styles.formSelect}
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              disabled={loading || executing}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Section (Optional Filter)</label>
            <select
              className={styles.formSelect}
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={loading || executing}
            >
              <option value="">All Sections</option>
              {availableCurrentSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Section {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Academic Year */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Target Academic Year (To)</label>
            <select
              className={styles.formSelect}
              value={targetYearId}
              onChange={(e) => setTargetYearId(e.target.value)}
              disabled={loading || executing}
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.id === sourceYearId ? '(Same Year)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Action */}
          <div className={styles.formGroup}>
            <button type="submit" className={styles.submitBtn} disabled={loading || executing}>
              <HiArrowPath size={18} className={loading ? 'spin' : ''} />
              {loading ? 'Evaluating...' : 'Load Candidates'}
            </button>
          </div>
        </form>
      </div>

      {/* Cohort Evaluation & Roster Table */}
      {cohortData && (
        <>
          {/* KPI Stat Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                <HiUserGroup />
              </div>
              <div>
                <div className={styles.statValue}>{cohortData.summary.totalStudents}</div>
                <div className={styles.statLabel}>Total Cohort Size</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <HiCheckBadge />
              </div>
              <div>
                <div className={styles.statValue}>{cohortData.summary.passCount}</div>
                <div className={styles.statLabel}>
                  {cohortData.nextGrade ? `Eligible for ${cohortData.nextGrade.name}` : 'Eligible for Graduation'}
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#fffbeb', color: '#d97706' }}>
                <HiExclamationTriangle />
              </div>
              <div>
                <div className={styles.statValue}>{cohortData.summary.remedialCount}</div>
                <div className={styles.statLabel}>Remedial / Retain Required</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#faf5ff', color: '#9333ea' }}>
                <HiAcademicCap />
              </div>
              <div>
                <div className={styles.statValue}>{cohortData.nextGrade ? cohortData.nextGrade.name : 'Graduation Stage'}</div>
                <div className={styles.statLabel}>Next Ladder Level</div>
              </div>
            </div>
          </div>

          {/* Roster Card */}
          <div className={styles.rosterCard}>
            {/* Toolbar */}
            <div className={styles.rosterToolbar}>
              <div className={styles.toolbarLeft}>
                <div className={styles.searchBox}>
                  <HiMagnifyingGlass className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search by name or admission #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.filterBadgeGroup}>
                  <button
                    className={`${styles.filterBadge} ${statusFilter === 'ALL' ? styles.filterBadgeActive : ''}`}
                    onClick={() => setStatusFilter('ALL')}
                  >
                    All ({candidates.length})
                  </button>
                  <button
                    className={`${styles.filterBadge} ${statusFilter === 'PROMOTED' ? styles.filterBadgeActive : ''}`}
                    onClick={() => setStatusFilter('PROMOTED')}
                  >
                    Promote ({candidates.filter((c) => c.action === 'PROMOTED').length})
                  </button>
                  <button
                    className={`${styles.filterBadge} ${statusFilter === 'RETAINED' ? styles.filterBadgeActive : ''}`}
                    onClick={() => setStatusFilter('RETAINED')}
                  >
                    Retain ({candidates.filter((c) => c.action === 'RETAINED').length})
                  </button>
                  <button
                    className={`${styles.filterBadge} ${statusFilter === 'GRADUATED' ? styles.filterBadgeActive : ''}`}
                    onClick={() => setStatusFilter('GRADUATED')}
                  >
                    Graduate ({candidates.filter((c) => c.action === 'GRADUATED').length})
                  </button>
                </div>
              </div>

              <div className={styles.toolbarRight}>
                <button className={styles.bulkBtn} onClick={handleAcceptAllRecommendations}>
                  <HiSparkles color="#2563eb" />
                  Accept Recommendations
                </button>

                {cohortData.nextSections?.length > 0 && (
                  <select
                    className={styles.bulkBtn}
                    onChange={(e) => handleBulkAssignSection(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Assign Section to Selected...
                    </option>
                    {cohortData.nextSections.map((ns) => (
                      <option key={ns.id} value={ns.id}>
                        Next: Section {ns.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={
                          filteredCandidates.length > 0 &&
                          selectedStudentIds.size === filteredCandidates.length
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Student Info</th>
                    <th>Current Placement</th>
                    <th>Academic Score</th>
                    <th>Progression Decision</th>
                    <th>Target Section Placement</th>
                    <th>Audit Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c) => {
                    const isSelected = selectedStudentIds.has(c.studentId);
                    const letterClass = getLetterStyle(c.finalGradeLetter);

                    return (
                      <tr key={c.studentId} style={{ opacity: isSelected ? 1 : 0.6 }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(c.studentId)}
                          />
                        </td>
                        <td>
                          <div className={styles.studentCell}>
                            {c.photoUrl ? (
                              <img src={c.photoUrl} alt="" className={styles.avatar} />
                            ) : (
                              <div className={styles.avatar}>
                                {(c.firstName?.[0] || 'S').toUpperCase()}
                              </div>
                            )}
                            <div className={styles.studentInfo}>
                              <span className={styles.studentName}>{c.name}</span>
                              <span className={styles.admissionNumber}>{c.admissionNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.currentBadge}>
                            {c.currentGradeName} • Sec {c.currentSectionName}
                          </span>
                        </td>
                        <td>
                          <div className={styles.perfContainer}>
                            <div className={styles.perfTop}>
                              <span className={styles.scoreValue}>
                                {c.finalAverage !== null ? `${c.finalAverage}%` : 'No Marks'}
                              </span>
                              {c.finalGradeLetter && (
                                <span className={`${styles.letterBadge} ${letterClass}`}>
                                  {c.finalGradeLetter}
                                </span>
                              )}
                            </div>
                            {c.finalAverage !== null && (
                              <div className={styles.progressBar}>
                                <div
                                  className={styles.progressFill}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, c.finalAverage))}%`,
                                    background:
                                      c.finalAverage >= 70
                                        ? '#22c55e'
                                        : c.finalAverage >= 50
                                        ? '#3b82f6'
                                        : '#ef4444',
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <select
                            className={`${styles.actionSelect} ${styles[`actionSelect${c.action}`]}`}
                            value={c.action}
                            onChange={(e) => updateCandidate(c.studentId, { action: e.target.value })}
                          >
                            <option value="PROMOTED">
                              Promote {cohortData.nextGrade ? `→ ${cohortData.nextGrade.name}` : ''}
                            </option>
                            <option value="RETAINED">Retain (Repeat {c.currentGradeName})</option>
                            <option value="GRADUATED">Graduate Program</option>
                            <option value="TRANSFERRED">Transferred Out</option>
                            <option value="WITHDRAWN">Withdrawn / Inactive</option>
                          </select>
                        </td>
                        <td>
                          {c.action === 'PROMOTED' && (
                            <select
                              className={styles.sectionSelect}
                              value={c.targetSectionId || ''}
                              onChange={(e) => updateCandidate(c.studentId, { targetSectionId: e.target.value })}
                            >
                              {cohortData.nextSections?.length === 0 ? (
                                <option value="">No sections defined</option>
                              ) : (
                                cohortData.nextSections?.map((ns) => (
                                  <option key={ns.id} value={ns.id}>
                                    Section {ns.name}
                                  </option>
                                ))
                              )}
                            </select>
                          )}
                          {c.action === 'RETAINED' && (
                            <select
                              className={styles.sectionSelect}
                              value={c.targetSectionId || c.currentSectionId || ''}
                              onChange={(e) => updateCandidate(c.studentId, { targetSectionId: e.target.value })}
                            >
                              {cohortData.currentSections?.map((cs) => (
                                <option key={cs.id} value={cs.id}>
                                  Section {cs.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {(c.action === 'GRADUATED' || c.action === 'TRANSFERRED' || c.action === 'WITHDRAWN') && (
                            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>N/A (Exiting Cohort)</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="text"
                              className={styles.remarksInput}
                              placeholder="Add audit note..."
                              value={c.remarks || ''}
                              onChange={(e) => updateCandidate(c.studentId, { remarks: e.target.value })}
                            />
                            {c.alreadyProcessed && (
                              <span className={styles.processedTag} title="Already has an academic history snapshot">
                                <HiShieldCheck /> Processed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredCandidates.length === 0 && (
                <div className={styles.emptyState}>
                  <HiInformationCircle className={styles.emptyIcon} />
                  <h3>No students found matching your filters</h3>
                  <p>Try clearing your search query or selecting a different section filter.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Execution Bar */}
          {candidates.length > 0 && (
            <div className={styles.bottomBar}>
              <div className={styles.bottomInfo}>
                <span className={styles.selectionCount}>
                  <strong>{selectedStudentIds.size}</strong> of {candidates.length} students selected for batch transition
                </span>
                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  Target: {academicYears.find((y) => y.id === targetYearId)?.name || 'Next Academic Year'}
                </span>
              </div>

              <div className={styles.bottomActions}>
                <button
                  className={styles.executeBtn}
                  disabled={selectedStudentIds.size === 0 || executing}
                  onClick={() => setShowConfirmModal(true)}
                >
                  <HiArrowRight size={18} />
                  Proceed to Execute Batch ({selectedStudentIds.size})
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation & Audit Modal */}
      {showConfirmModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>
                <HiShieldCheck />
              </div>
              <div>
                <h3 className={styles.modalTitle}>Confirm Batch Student Progression</h3>
                <p className={styles.modalSubtitle}>
                  Please review the atomic cohort transition summary before committing.
                </p>
              </div>
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Source Year:</span>
                <span className={styles.summaryVal}>
                  {academicYears.find((y) => y.id === sourceYearId)?.name}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Target Year:</span>
                <span className={styles.summaryVal}>
                  {academicYears.find((y) => y.id === targetYearId)?.name}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Current Cohort:</span>
                <span className={styles.summaryVal}>{cohortData?.currentGrade?.name}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Promote to {cohortData?.nextGrade?.name || 'Next Grade'}:</span>
                <span className={styles.summaryVal} style={{ color: '#16a34a' }}>
                  {executionSummary.promoteCount} students
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Retain in {cohortData?.currentGrade?.name}:</span>
                <span className={styles.summaryVal} style={{ color: '#d97706' }}>
                  {executionSummary.retainCount} students
                </span>
              </div>
              {executionSummary.graduateCount > 0 && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Graduate / Exit Program:</span>
                  <span className={styles.summaryVal} style={{ color: '#7c3aed' }}>
                    {executionSummary.graduateCount} students
                  </span>
                </div>
              )}
              {executionSummary.otherCount > 0 && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Transferred / Inactive:</span>
                  <span className={styles.summaryVal} style={{ color: '#475569' }}>
                    {executionSummary.otherCount} students
                  </span>
                </div>
              )}
            </div>

            <div className={styles.calloutWarning}>
              <HiInformationCircle size={22} style={{ flexShrink: 0 }} />
              <div>
                <strong>Immutable Audit Snapshot:</strong> This operation writes an end-of-year transcript record into the multi-year academic history archive for each selected student and updates their live section placement atomically.
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowConfirmModal(false)}
                disabled={executing}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleExecuteBatch}
                disabled={executing}
              >
                <HiCheckCircle size={18} />
                {executing ? 'Committing...' : 'Commit & Execute Promotions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
