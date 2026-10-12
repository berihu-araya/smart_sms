'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { useAuth } from '@/hooks/useAuth';
import * as resultService from '@/services/resultService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  FaChartPie,
  FaAward,
  FaTrophy,
  FaMedal,
  FaUserGraduate,
  FaExclamationTriangle,
  FaCheckCircle,
  FaPrint,
  FaDownload,
  FaBookOpen,
  FaPhoneAlt,
  FaArrowUp,
  FaArrowDown,
  FaSearch,
  FaSchool,
  FaRegCheckCircle,
} from 'react-icons/fa';
import {
  HiOutlineArrowPath,
  HiOutlineChartBar,
  HiOutlineAcademicCap,
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import {
  DonutPieChart,
  SubjectBarChart,
  RadialGaugeChart,
  BellCurveChart,
} from '@/components/reports/charts';

export default function AcademicReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isStudentOrParent = isStudent || isParent;

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('overview');

  // Filter States
  const [academicYears, setAcademicYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Semester 1');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Data State
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Metadata (Academic Years, Grades, Sections)
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [yRes, gRes, sRes] = await Promise.all([
          listAcademicYears({ limit: 100 }).catch(() => ({ items: [] })),
          listGrades({ limit: 100 }).catch(() => ({ items: [] })),
          listSections({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        const yList = Array.isArray(yRes) ? yRes : yRes?.items || yRes?.data || [];
        const gList = Array.isArray(gRes) ? gRes : gRes?.items || gRes?.data || [];
        const sList = Array.isArray(sRes) ? sRes : sRes?.items || sRes?.data || [];

        setAcademicYears(yList);
        setGrades(gList);
        setSections(sList);

        const activeYear = yList.find((y) => y.is_active);
        if (activeYear) {
          setSelectedYear(activeYear.id);
        }
      } catch (err) {
        console.error('Failed to load academic reports metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Filter sections when selectedGrade changes
  const filteredSections = useMemo(() => {
    if (!selectedGrade) return sections;
    return sections.filter((s) => s.grade_id === selectedGrade);
  }, [sections, selectedGrade]);

  // Fetch Report Data via async loader inside useEffect
  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resultService.getAcademicReport({
        academicYearId: selectedYear || null,
        gradeId: selectedGrade || null,
        sectionId: selectedSection || null,
        term: selectedTerm === 'all' ? null : selectedTerm,
      });
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to generate academic report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedGrade, selectedSection, selectedTerm]);

  useEffect(() => {
    if (authLoading) return;
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await resultService.getAcademicReport({
          academicYearId: selectedYear || null,
          gradeId: selectedGrade || null,
          sectionId: selectedSection || null,
          term: selectedTerm === 'all' ? null : selectedTerm,
        });
        if (!isCancelled) {
          setReportData(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to generate academic report');
          setReportData(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, selectedYear, selectedGrade, selectedSection, selectedTerm]);

  // Grade color helper
  const getGradeColor = (grade) => {
    if (!grade || grade === '—') return '#94a3b8';
    if (grade.startsWith('A')) return '#10b981';
    if (grade.startsWith('B')) return '#3b82f6';
    if (grade.startsWith('C')) return '#f59e0b';
    if (grade.startsWith('D')) return '#f97316';
    return '#ef4444';
  };

  // Export Broadsheet as CSV
  const handleExportCSV = () => {
    if (!reportData?.broadsheet || reportData.broadsheet.length === 0) return;

    const subjects = reportData.subjectsList || [];
    const headers = [
      'Rank',
      'Admission Number',
      'Student Name',
      'Grade',
      'Section',
      ...subjects.map((s) => `${s.name} (${s.code || 'Score'})`),
      'Total Marks',
      'Average Score %',
      'Grade Letter',
      'Status',
    ];

    const rows = reportData.broadsheet.map((student) => {
      const subScores = subjects.map((s) => {
        const item = student.subjects?.[s.id];
        return item?.score !== null && item?.score !== undefined ? item.score : '—';
      });

      return [
        `"${student.rank || ''}"`,
        `"${student.admissionNumber || ''}"`,
        `"${student.name || ''}"`,
        `"${student.gradeName || ''}"`,
        `"${student.sectionName || ''}"`,
        ...subScores,
        student.totalWeightedScore ?? '—',
        student.averageScore ?? '—',
        `"${student.overallGrade || ''}"`,
        `"${student.status || ''}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const termLabel = selectedTerm || 'Semester_1';
    link.setAttribute('download', `SmartSMS_Academic_Broadsheet_${termLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered broadsheet by search query
  const filteredBroadsheet = useMemo(() => {
    const list = reportData?.broadsheet || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.admissionNumber?.toLowerCase().includes(q) ||
        s.sectionName?.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <FaChartPie style={{ color: '#4f46e5' }} />
            Academic Performance & Reports
            <span className={styles.titleBadge}>Real-Time Intelligence</span>
          </div>
          <p className={styles.subtitle}>
            Comprehensive grade distributions, subject pass rates, honors leaderboard, at-risk intervention register, and official broadsheets.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={loadReportData}
            disabled={loading}
            title="Refresh Data"
            id="academic-reports-refresh-btn"
          >
            <HiOutlineArrowPath className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {!isStudentOrParent && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleExportCSV}
              disabled={loading || !reportData?.broadsheet?.length}
              id="academic-reports-export-csv-btn"
            >
              <FaDownload />
              Export Broadsheet CSV
            </button>
          )}

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => window.print()}
            id="academic-reports-print-btn"
          >
            <FaPrint />
            Print Report
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid #fecdd3',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
          }}
        >
          <FaExclamationTriangle />
          {error}
        </div>
      )}

      {/* Filter Toolbar (Cohort View only) */}
      {!isStudentOrParent && (
        <div className={styles.filterBar}>
          <div className={styles.filterControls}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Academic Year</label>
              <select
                className={styles.filterSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                id="academic-reports-year-select"
              >
                <option value="">All Academic Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Term / Period</label>
              <select
                className={styles.filterSelect}
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                id="academic-reports-term-select"
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Final Term">Final Term</option>
                <option value="all">All Terms</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Grade Level</label>
              <select
                className={styles.filterSelect}
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setSelectedSection('');
                }}
                id="academic-reports-grade-select"
              >
                <option value="">All Grades (School-Wide)</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Section / Class</label>
              <select
                className={styles.filterSelect}
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                id="academic-reports-section-select"
              >
                <option value="">All Sections</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.searchBox}>
            <FaSearch style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Filter by student name or ID..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="academic-reports-search-input"
            />
          </div>
        </div>
      )}

      {/* STUDENT / PARENT INDIVIDUAL VIEW */}
      {isStudentOrParent && reportData?.mode === 'individual' && (
        <div className={styles.dossierContainer}>
          <div className={styles.studentHeroCard}>
            <div className={styles.studentHeroInfo}>
              <div className={styles.studentAvatar}>
                <FaUserGraduate />
              </div>
              <div>
                <h2 className={styles.studentHeroName}>
                  {reportData.student?.first_name} {reportData.student?.last_name}
                </h2>
                <div className={styles.studentHeroMeta}>
                  <span>Admission: <strong>{reportData.student?.admission_number || '—'}</strong></span>
                  <span>•</span>
                  <span>Grade: <strong>{reportData.student?.grade_name || '—'}</strong></span>
                  <span>•</span>
                  <span>Section: <strong>{reportData.student?.section_name || '—'}</strong></span>
                </div>
              </div>
            </div>

            <div className={styles.studentHeroGpa}>
              <div className={styles.studentGpaNumber}>
                {reportData.academicSummary?.averageScore ?? 0}%
              </div>
              <div className={styles.studentGpaLabel}>
                Cumulative Score • Grade {reportData.academicSummary?.finalGradeLetter || '—'}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <span className={styles.statusPassed}>
                  {reportData.academicSummary?.promotionStatus || 'PROMOTED'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Class Rank</span>
                  <span className={styles.kpiValue}>
                    #{reportData.academicSummary?.rankInSection ?? 1}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#fef3c7', color: '#d97706' }}>
                  <FaTrophy />
                </div>
              </div>
              <span className={styles.kpiSubtext}>
                Out of {reportData.academicSummary?.totalSectionStudents || 1} students in section
              </span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Assessed Subjects</span>
                  <span className={styles.kpiValue}>
                    {reportData.academicSummary?.completedSubjects ?? 0} / {reportData.academicSummary?.totalSubjects ?? 0}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#ede9fe', color: '#6d28d9' }}>
                  <FaBookOpen />
                </div>
              </div>
              <span className={styles.kpiSubtext}>
                {reportData.academicSummary?.isComplete ? '100% Evaluations Complete' : 'Assessments in progress'}
              </span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Attendance Rate</span>
                  <span className={styles.kpiValue}>
                    {reportData.attendance?.total_days > 0
                      ? `${Math.round((Number(reportData.attendance.present_days || 0) / Number(reportData.attendance.total_days)) * 100)}%`
                      : '100%'}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#dcfce7', color: '#166534' }}>
                  <FaRegCheckCircle />
                </div>
              </div>
              <span className={styles.kpiSubtext}>
                {reportData.attendance?.present_days ?? 0} days present of {reportData.attendance?.total_days ?? 0} active school days
              </span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Official Transcript</span>
                  <span className={styles.kpiValue} style={{ fontSize: '1.2rem', color: '#4f46e5' }}>
                    Available
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#e0e7ff', color: '#3730a3' }}>
                  <FaAward />
                </div>
              </div>
              <Link
                href={`/dashboard/results/report-card?studentId=${reportData.student?.id || 'me'}`}
                className={styles.btnSecondary}
                style={{ justifyContent: 'center', marginTop: '0.25rem' }}
              >
                <FaPrint /> View Printable Report Card
              </Link>
            </div>
          </div>

          {/* Subject Comparative Breakdown */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeaderBar}>
              <h3 className={styles.cardTitle}>
                <HiOutlineChartBar style={{ color: '#4f46e5' }} />
                Subject Performance & Cohort Comparison
              </h3>
              <span className={styles.cardSubtitle}>
                Compare individual subject scores against the class average
              </span>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Your Score</th>
                    <th>Class Average</th>
                    <th>Comparison</th>
                    <th>Grade</th>
                    <th>Evaluation Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.subjectPerformance || []).map((sub) => (
                    <tr key={sub.subjectId}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{sub.subjectName}</td>
                      <td>{sub.subjectCode || '—'}</td>
                      <td>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                          {sub.totalScore}%
                        </strong>
                      </td>
                      <td>{sub.sectionAverage !== null ? `${sub.sectionAverage}%` : '—'}</td>
                      <td>
                        {sub.isAhead ? (
                          <span style={{ color: '#166534', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <FaArrowUp /> {sub.relativePerformance}
                          </span>
                        ) : (
                          <span style={{ color: '#991b1b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <FaArrowDown /> {sub.relativePerformance}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={styles.gradeChip} style={{ background: getGradeColor(sub.gradeLetter) }}>
                          {sub.gradeLetter}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{sub.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INSTITUTIONAL COHORT VIEW (Admin, Teacher, Staff) */}
      {!isStudentOrParent && (
        <>
          {/* Executive KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Cohort Mean Score</span>
                  <span className={styles.kpiValue}>
                    {reportData?.kpis?.overallAverage ?? 0}%
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#e0e7ff', color: '#3730a3' }}>
                  <HiOutlineAcademicCap />
                </div>
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressBar}
                  style={{
                    width: `${Math.min(100, reportData?.kpis?.overallAverage || 0)}%`,
                    background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                Highest: <strong>{reportData?.kpis?.highestScore ?? 0}%</strong> • Lowest: <strong>{reportData?.kpis?.lowestScore ?? 0}%</strong>
              </span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Overall Pass Rate</span>
                  <span className={styles.kpiValue} style={{ color: '#166534' }}>
                    {reportData?.kpis?.passRate ?? 0}%
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#dcfce7', color: '#166534' }}>
                  <FaCheckCircle />
                </div>
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressBar}
                  style={{
                    width: `${reportData?.kpis?.passRate || 0}%`,
                    background: '#10b981',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                <strong>{reportData?.kpis?.passCount ?? 0}</strong> passed • <strong>{reportData?.kpis?.failCount ?? 0}</strong> needing remediation
              </span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Honors & Distinction</span>
                  <span className={styles.kpiValue} style={{ color: '#b45309' }}>
                    {reportData?.kpis?.honorsRate ?? 0}%
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#fef3c7', color: '#b45309' }}>
                  <FaTrophy />
                </div>
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressBar}
                  style={{
                    width: `${reportData?.kpis?.honorsRate || 0}%`,
                    background: '#f59e0b',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                <strong>{reportData?.kpis?.honorsCount ?? 0}</strong> students scoring Grade A / Distinction
              </span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>At-Risk Students</span>
                  <span
                    className={styles.kpiValue}
                    style={{
                      color: (reportData?.kpis?.atRiskCount || 0) > 0 ? '#dc2626' : '#166534',
                    }}
                  >
                    {reportData?.kpis?.atRiskCount ?? 0}
                  </span>
                </div>
                <div
                  className={styles.kpiIconWrapper}
                  style={{
                    background: (reportData?.kpis?.atRiskCount || 0) > 0 ? '#fee2e2' : '#f0fdf4',
                    color: (reportData?.kpis?.atRiskCount || 0) > 0 ? '#dc2626' : '#166534',
                  }}
                >
                  <FaExclamationTriangle />
                </div>
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressBar}
                  style={{
                    width: `${Math.min(100, ((reportData?.kpis?.atRiskCount || 0) / (reportData?.kpis?.evaluatedCount || 1)) * 100)}%`,
                    background: '#ef4444',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                {(reportData?.kpis?.atRiskCount || 0) > 0
                  ? 'Immediate academic intervention needed'
                  : 'Zero students currently below pass threshold'}
              </span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Evaluation Progress</span>
                  <span className={styles.kpiValue}>
                    {reportData?.kpis?.evaluatedCount ?? 0} / {reportData?.kpis?.totalStudentsCount ?? 0}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                  <HiOutlineUserGroup />
                </div>
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressBar}
                  style={{
                    width: `${reportData?.kpis?.totalStudentsCount ? Math.round((reportData.kpis.evaluatedCount / reportData.kpis.totalStudentsCount) * 100) : 0}%`,
                    background: '#a855f7',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                {reportData?.kpis?.totalStudentsCount
                  ? `${Math.round((reportData.kpis.evaluatedCount / reportData.kpis.totalStudentsCount) * 100)}% of enrolled roster assessed`
                  : '0% assessed'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabsNav}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
              id="academic-reports-tab-overview"
            >
              <HiOutlineChartBar />
              Overview & Grade Distribution
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'subjects' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('subjects')}
              id="academic-reports-tab-subjects"
            >
              <FaBookOpen />
              Subject Performance & Pass Rates
              <span className={styles.tabCountBadge}>{reportData?.subjectPerformance?.length ?? 0}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'honor_roll' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('honor_roll')}
              id="academic-reports-tab-honor-roll"
            >
              <HiOutlineSparkles />
              Honor Roll & Merit List
              <span className={styles.tabCountBadge}>{reportData?.honorRoll?.length ?? 0}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'at_risk' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('at_risk')}
              id="academic-reports-tab-at-risk"
            >
              <FaExclamationTriangle />
              At-Risk & Remediation Register
              <span
                className={styles.tabCountBadge}
                style={{
                  background: (reportData?.atRiskRegister?.length || 0) > 0 ? '#fee2e2' : undefined,
                  color: (reportData?.atRiskRegister?.length || 0) > 0 ? '#991b1b' : undefined,
                }}
              >
                {reportData?.atRiskRegister?.length ?? 0}
              </span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'broadsheet' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('broadsheet')}
              id="academic-reports-tab-broadsheet"
            >
              <HiOutlineClipboardDocumentList />
              Official Master Broadsheet
              <span className={styles.tabCountBadge}>{filteredBroadsheet.length}</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW & GRADE DISTRIBUTION */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Row 1: Dual Visual Analytics (Donut Pie + Radial Gauge) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
                <DonutPieChart
                  data={(reportData?.gradeDistribution || []).map((scale) => ({
                    ...scale,
                    label: `Grade ${scale.gradeLetter}`,
                    color: getGradeColor(scale.gradeLetter),
                  }))}
                  title="Grade Distribution & Quality Index"
                  subtitle="Proportion of assessed students across letter grade tiers"
                  centerValue={reportData?.kpis?.evaluatedCount || 0}
                  centerLabel="Evaluated"
                />

                <RadialGaugeChart
                  value={reportData?.kpis?.overallAverage || 0}
                  title="Cohort Academic Index"
                  subtitle="Institutional score benchmark and mastery rating"
                  gradeLetter={
                    reportData?.gradeDistribution?.find(
                      (g) => (reportData?.kpis?.overallAverage || 0) >= g.minScore
                    )?.gradeLetter || 'B'
                  }
                  gradeDescription={
                    reportData?.gradeDistribution?.find(
                      (g) => (reportData?.kpis?.overallAverage || 0) >= g.minScore
                    )?.description || 'Above Average / Very Good'
                  }
                />
              </div>

              {/* Row 2: Performance Bell Curve & Score Distribution Curve */}
              <BellCurveChart
                distribution={reportData?.gradeDistribution || []}
                meanScore={reportData?.kpis?.overallAverage || 0}
                highestScore={reportData?.kpis?.highestScore || 0}
                lowestScore={reportData?.kpis?.lowestScore || 0}
                totalStudents={reportData?.kpis?.evaluatedCount || 0}
                title="Academic Performance Bell Curve & Score Distribution"
                subtitle="Normal curve fitting across grade brackets with cohort mean marker"
              />

              {/* Row 3: Section & Class Comparison Table */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    <FaSchool style={{ color: '#4f46e5' }} />
                    Section & Class Performance
                  </h3>
                  <span className={styles.cardSubtitle}>
                    Comparative analysis across sections
                  </span>
                </div>

                {reportData?.sectionComparison?.length > 0 ? (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Grade</th>
                          <th>Section</th>
                          <th>Evaluated</th>
                          <th>Class Mean</th>
                          <th>Pass Rate</th>
                          <th>Top Student</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.sectionComparison.map((sec) => (
                          <tr key={sec.sectionId}>
                            <td><strong>{sec.gradeName}</strong></td>
                            <td>{sec.sectionName}</td>
                            <td>{sec.evaluatedStudents} / {sec.totalStudents}</td>
                            <td>
                              <strong style={{ color: sec.averageScore >= 70 ? '#166534' : '#0f172a' }}>
                                {sec.averageScore}%
                              </strong>
                            </td>
                            <td>
                              <span className={sec.passRate >= 75 ? styles.statusPassed : styles.statusPending}>
                                {sec.passRate}%
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                              {sec.topStudent ? (
                                <span>{sec.topStudent.name} ({sec.topStudent.score}%)</span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <FaSchool className={styles.emptyStateIcon} />
                    <div className={styles.emptyStateTitle}>No Section Data Available</div>
                    <div className={styles.emptyStateText}>
                      Ensure marks have been entered for exams in this session.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SUBJECT PERFORMANCE & PASS RATES */}
          {activeTab === 'subjects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Interactive Subject Column Bar Chart */}
              <SubjectBarChart
                subjects={reportData?.subjectPerformance || []}
                title="Subject Performance & Mastery Comparison"
                subtitle="Comparative visual analysis of subject mean scores vs pass rates"
              />

              {/* Detailed Subject Cards Grid */}
              <div className={styles.subjectGrid}>
              {(reportData?.subjectPerformance || []).map((sub) => (
                <div key={sub.subjectId} className={styles.subjectCard}>
                  <div className={styles.subjectCardHeader}>
                    <div>
                      <div className={styles.subjectName}>{sub.subjectName}</div>
                      <div className={styles.subjectCode}>{sub.subjectCode || 'General'}</div>
                    </div>
                    <span
                      className={
                        sub.status === 'High Performing'
                          ? styles.healthHigh
                          : sub.status === 'Satisfactory'
                          ? styles.healthAvg
                          : styles.healthLow
                      }
                    >
                      {sub.status}
                    </span>
                  </div>

                  <div className={styles.subjectMetrics}>
                    <div className={styles.subjectMetricItem}>
                      <span className={styles.subjectMetricLabel}>Subject Mean</span>
                      <span className={styles.subjectMetricValue}>{sub.averageScore}%</span>
                    </div>

                    <div className={styles.subjectMetricItem}>
                      <span className={styles.subjectMetricLabel}>Pass Rate</span>
                      <span className={styles.subjectMetricValue} style={{ color: sub.passRate >= 80 ? '#166534' : '#0f172a' }}>
                        {sub.passRate}%
                      </span>
                    </div>

                    <div className={styles.subjectMetricItem}>
                      <span className={styles.subjectMetricLabel}>Highest Score</span>
                      <span className={styles.subjectMetricValue} style={{ color: '#166534' }}>
                        {sub.highestScore}%
                      </span>
                    </div>

                    <div className={styles.subjectMetricItem}>
                      <span className={styles.subjectMetricLabel}>Lowest Score</span>
                      <span className={styles.subjectMetricValue} style={{ color: sub.lowestScore < 50 ? '#dc2626' : '#475569' }}>
                        {sub.lowestScore}%
                      </span>
                    </div>
                  </div>

                  <div className={styles.distTrack}>
                    <div
                      className={styles.distFill}
                      style={{
                        width: `${sub.averageScore}%`,
                        background: sub.averageScore >= 75 ? '#10b981' : sub.averageScore >= 60 ? '#3b82f6' : '#f59e0b',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>{sub.assessedCount} students assessed</span>
                    <span>{sub.failCount > 0 ? `${sub.failCount} failed` : 'Zero failures'}</span>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}

          {/* TAB 3: HONOR ROLL & MERIT LIST */}
          {activeTab === 'honor_roll' && (
            <div className={styles.tableCard}>
              <div className={styles.tableHeaderBar}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <FaTrophy style={{ color: '#f59e0b' }} />
                    Academic Honors & Merit Leaderboard
                  </h3>
                  <span className={styles.cardSubtitle}>
                    Top academic achievers qualifying for dean&apos;s honors and distinction
                  </span>
                </div>
              </div>

              {reportData?.honorRoll?.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Student Name</th>
                        <th>Admission No</th>
                        <th>Grade</th>
                        <th>Section</th>
                        <th>Average Score</th>
                        <th>Grade</th>
                        <th>Academic Distinction</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.honorRoll.map((student) => (
                        <tr key={student.studentId}>
                          <td>
                            <span
                              className={`${styles.rankBadge} ${
                                student.rank === 1
                                  ? styles.rankGold
                                  : student.rank === 2
                                  ? styles.rankSilver
                                  : student.rank === 3
                                  ? styles.rankBronze
                                  : styles.rankDefault
                              }`}
                            >
                              {student.rank === 1 ? <FaTrophy /> : student.rank}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</td>
                          <td>{student.admissionNumber}</td>
                          <td>{student.gradeName}</td>
                          <td>{student.sectionName}</td>
                          <td>
                            <strong style={{ fontSize: '1.05rem', color: '#166534' }}>
                              {student.averageScore}%
                            </strong>
                          </td>
                          <td>
                            <span
                              className={styles.gradeChip}
                              style={{ background: getGradeColor(student.overallGrade) }}
                            >
                              {student.overallGrade}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <FaMedal /> {student.distinction}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={`/dashboard/results/report-card?studentId=${student.studentId}`}
                              className={styles.btnSecondary}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            >
                              Report Card
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <FaAward className={styles.emptyStateIcon} />
                  <div className={styles.emptyStateTitle}>No Honor Roll Students Found</div>
                  <div className={styles.emptyStateText}>
                    Honors recognition requires an overall average score of 75% or higher.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AT-RISK & REMEDIATION REGISTER */}
          {activeTab === 'at_risk' && (
            <div className={styles.tableCard}>
              <div className={styles.tableHeaderBar}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <FaExclamationTriangle style={{ color: '#dc2626' }} />
                    At-Risk & Academic Intervention Register
                  </h3>
                  <span className={styles.cardSubtitle}>
                    Students requiring immediate academic support or remedial tutoring
                  </span>
                </div>
              </div>

              {reportData?.atRiskRegister?.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Risk Level</th>
                        <th>Student Name</th>
                        <th>Admission No</th>
                        <th>Class</th>
                        <th>Average</th>
                        <th>Failing Subjects</th>
                        <th>Parent Contact</th>
                        <th>Phone</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.atRiskRegister.map((s) => (
                        <tr key={s.studentId}>
                          <td>
                            <span
                              className={s.riskLevel === 'Critical' ? styles.statusFailed : styles.healthLow}
                            >
                              {s.riskLevel}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                          <td>{s.admissionNumber}</td>
                          <td>{s.gradeName} - {s.sectionName}</td>
                          <td>
                            <strong style={{ color: '#dc2626' }}>{s.averageScore}%</strong>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {s.failedSubjects.map((fs) => (
                                <span
                                  key={fs.subjectId}
                                  style={{
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                  }}
                                >
                                  {fs.subjectName} ({fs.score}%)
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>{s.parentName}</td>
                          <td>
                            {s.parentPhone !== 'Not Available' ? (
                              <a
                                href={`tel:${s.parentPhone}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  color: '#4f46e5',
                                  fontWeight: 600,
                                }}
                              >
                                <FaPhoneAlt style={{ fontSize: '0.75rem' }} /> {s.parentPhone}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <Link
                              href={`/dashboard/results/report-card?studentId=${s.studentId}`}
                              className={styles.btnSecondary}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            >
                              View Card
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <FaCheckCircle className={styles.emptyStateIcon} style={{ color: '#10b981' }} />
                  <div className={styles.emptyStateTitle} style={{ color: '#166534' }}>
                    Zero Students At-Risk!
                  </div>
                  <div className={styles.emptyStateText}>
                    All evaluated students in this cohort meet or exceed passing criteria across their enrolled subjects.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: OFFICIAL MASTER BROADSHEET */}
          {activeTab === 'broadsheet' && (
            <div className={styles.tableCard}>
              <div className={styles.tableHeaderBar}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <HiOutlineClipboardDocumentList style={{ color: '#4f46e5' }} />
                    Official Examination Master Broadsheet
                  </h3>
                  <span className={styles.cardSubtitle}>
                    Master grade matrix with student score breakdowns, total points, and sectional rankings
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={handleExportCSV}
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                  >
                    <FaDownload /> CSV
                  </button>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => window.print()}
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                  >
                    <FaPrint /> Print
                  </button>
                </div>
              </div>

              {filteredBroadsheet.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>Rank</th>
                        <th>Adm No</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        {(reportData?.subjectsList || []).map((sub) => (
                          <th key={sub.id} style={{ textAlign: 'center' }}>
                            {sub.name}
                          </th>
                        ))}
                        <th style={{ textAlign: 'center' }}>Total</th>
                        <th style={{ textAlign: 'center' }}>Avg %</th>
                        <th style={{ textAlign: 'center' }}>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBroadsheet.map((student) => (
                        <tr key={student.studentId}>
                          <td style={{ textAlign: 'center' }}>
                            <strong>{student.rank}</strong>
                          </td>
                          <td>{student.admissionNumber}</td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</td>
                          <td>{student.gradeName} - {student.sectionName}</td>
                          {(reportData?.subjectsList || []).map((sub) => {
                            const mark = student.subjects?.[sub.id];
                            return (
                              <td key={sub.id} style={{ textAlign: 'center' }}>
                                {mark && mark.score !== null ? (
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: mark.score >= 50 ? '#0f172a' : '#dc2626',
                                    }}
                                  >
                                    {mark.score}
                                  </span>
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {student.totalWeightedScore}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                            {student.averageScore}%
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={styles.gradeChip}
                              style={{ background: getGradeColor(student.overallGrade) }}
                            >
                              {student.overallGrade}
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                student.status === 'PASSED'
                                  ? styles.statusPassed
                                  : student.status === 'FAILED'
                                  ? styles.statusFailed
                                  : styles.statusPending
                              }
                            >
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <HiOutlineClipboardDocumentList className={styles.emptyStateIcon} />
                  <div className={styles.emptyStateTitle}>No Students Match Query</div>
                  <div className={styles.emptyStateText}>
                    Try clearing your search query or adjusting your grade/section filter.
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
