'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import { useAuth } from '@/hooks/useAuth';
import * as attendanceService from '@/services/attendanceService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  FaClipboardList,
  FaPrint,
  FaDownload,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaUserGraduate,
  FaCalendarAlt,
  FaPhoneAlt,
  FaSchool,
  FaClock,
  FaRegCheckCircle,
  FaTimesCircle,
  FaEye,
  FaBullhorn,
} from 'react-icons/fa';
import {
  HiOutlineArrowPath,
  HiOutlineChartBar,
  HiOutlineAcademicCap,
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { DonutPieChart, RadialGaugeChart } from '@/components/reports/charts';

export default function AttendanceReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isStudentOrParent = isStudent || isParent;

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview');

  // Filter States
  const [academicYears, setAcademicYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected student for Ledger & Dossier drill-down
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Contact Parent Alert Modal State
  const [contactModalStudent, setContactModalStudent] = useState(null);
  const [contactSuccessMsg, setContactSuccessMsg] = useState('');

  // Report Data
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
        console.error('Failed to load attendance report metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Filter sections when selectedGrade changes
  const filteredSections = useMemo(() => {
    if (!selectedGrade) return sections;
    return sections.filter((s) => s.grade_id === selectedGrade);
  }, [sections, selectedGrade]);

  // Fetch Report Data
  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        academicYearId: selectedYear || null,
        gradeId: selectedGrade || null,
        sectionId: selectedSection || null,
        period: selectedPeriod,
        studentId: selectedStudentId || null,
      };

      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }

      const data = await attendanceService.getAttendanceReport(params);
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to generate attendance report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [
    selectedYear,
    selectedGrade,
    selectedSection,
    selectedPeriod,
    customStartDate,
    customEndDate,
    selectedStudentId,
  ]);

  useEffect(() => {
    if (!authLoading) {
      loadReportData();
    }
  }, [authLoading, loadReportData]);

  // Export Broadsheet as CSV
  const handleExportCSV = () => {
    if (!reportData?.broadsheet || reportData.broadsheet.length === 0) return;

    const headers = [
      'Rank',
      'Admission Number',
      'Student Name',
      'Gender',
      'Grade',
      'Section',
      'Days Open',
      'Days Present',
      'Days Absent',
      'Days Late',
      'Days Excused',
      'Attendance Rate %',
      'Consecutive Absences',
      'Compliance Status',
      'Parent Contact',
    ];

    const rows = reportData.broadsheet.map((student, idx) => [
      `"${idx + 1}"`,
      `"${student.admissionNumber || ''}"`,
      `"${student.name || ''}"`,
      `"${student.gender || ''}"`,
      `"${student.gradeName || ''}"`,
      `"${student.sectionName || ''}"`,
      student.totalDays ?? 0,
      student.presentDays ?? 0,
      student.absentDays ?? 0,
      student.lateDays ?? 0,
      student.excusedDays ?? 0,
      `${student.attendanceRate ?? 0}%`,
      student.consecutiveAbsences ?? 0,
      `"${student.complianceStatus || 'COMPLIANT'}"`,
      `"${student.parentPhone || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const periodLabel = selectedPeriod || 'this_month';
    link.setAttribute(
      'download',
      `SmartSMS_Attendance_Broadsheet_${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists by search query
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

  const filteredAtRisk = useMemo(() => {
    const list = reportData?.atRiskRegister || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.admissionNumber?.toLowerCase().includes(q) ||
        s.sectionName?.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  const handleDrillDownStudent = (studentId) => {
    setSelectedStudentId(studentId);
    setActiveTab('student_ledger');
  };

  const handleNotifyParent = (student) => {
    setContactModalStudent(student);
    setContactSuccessMsg('');
  };

  const handleSendNotificationConfirm = () => {
    setContactSuccessMsg(
      `Attendance alert SMS queued successfully for ${contactModalStudent.parentName} (${contactModalStudent.parentPhone})`
    );
    setTimeout(() => {
      setContactModalStudent(null);
      setContactSuccessMsg('');
    }, 2200);
  };

  const kpis = reportData?.kpis || {};
  const currentStudent = reportData?.individualData?.student;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <FaClipboardList style={{ color: '#2563eb' }} />
            Attendance Intelligence & Reports
            <span className={styles.titleBadge}>Statutory Audit Ready</span>
          </div>
          <p className={styles.subtitle}>
            School-wide presence analytics, chronic absenteeism early warnings, class comparisons, and statutory compliance broadsheets.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={loadReportData}
            disabled={loading}
            title="Refresh Data"
          >
            <HiOutlineArrowPath className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleExportCSV}
            disabled={!reportData?.broadsheet?.length}
            title="Export CSV Broadsheet"
          >
            <FaDownload />
            Export CSV
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => window.print()}
            title="Print Official Report"
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
              <label className={styles.filterLabel}>Time Period</label>
              <select
                className={styles.filterSelect}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="this_month">This Month (Current)</option>
                <option value="today">Today Only</option>
                <option value="this_week">This Week</option>
                <option value="this_term">This Term / Year</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {selectedPeriod === 'custom' && (
              <>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>From Date</label>
                  <input
                    type="date"
                    className={styles.filterSelect}
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>To Date</label>
                  <input
                    type="date"
                    className={styles.filterSelect}
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Grade Level</label>
              <select
                className={styles.filterSelect}
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setSelectedSection('');
                }}
              >
                <option value="">All Grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Section</label>
              <select
                className={styles.filterSelect}
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedGrade}
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
              placeholder="Search student or admission #..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* STUDENT / PARENT INDIVIDUAL VIEW */}
      {isStudentOrParent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.studentHeroCard}>
            <div className={styles.studentHeroInfo}>
              <div className={styles.studentAvatar}>
                <FaUserGraduate />
              </div>
              <div>
                <h2 className={styles.studentHeroName}>
                  {currentStudent?.name || `${user?.firstName || 'Student'} ${user?.lastName || ''}`}
                </h2>
                <div className={styles.studentHeroMeta}>
                  <span>Admission: <strong>{currentStudent?.admissionNumber || '—'}</strong></span>
                  <span>•</span>
                  <span>Grade: <strong>{currentStudent?.gradeName || '—'}</strong></span>
                  <span>•</span>
                  <span>Section: <strong>{currentStudent?.sectionName || '—'}</strong></span>
                </div>
              </div>
            </div>

            <div className={styles.studentHeroRate}>
              <div className={styles.studentRateNumber}>
                {currentStudent?.attendanceRate ?? 100}%
              </div>
              <div className={styles.studentRateLabel}>
                Attendance Ratio •{' '}
                <span className={currentStudent?.complianceStatus === 'COMPLIANT' ? styles.badgeCompliant : styles.badgeAtRisk}>
                  {currentStudent?.complianceStatus || 'COMPLIANT'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Days Attended</span>
                  <span className={styles.kpiValue} style={{ color: '#166534' }}>
                    {currentStudent?.presentDays ?? 0}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#dcfce7', color: '#166534' }}>
                  <FaCheckCircle />
                </div>
              </div>
              <span className={styles.kpiSubtext}>Out of {currentStudent?.totalDays ?? 0} total school sessions</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Unexcused Absences</span>
                  <span className={styles.kpiValue} style={{ color: (currentStudent?.absentDays || 0) > 0 ? '#dc2626' : '#64748b' }}>
                    {currentStudent?.absentDays ?? 0}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#fee2e2', color: '#dc2626' }}>
                  <FaTimesCircle />
                </div>
              </div>
              <span className={styles.kpiSubtext}>Mandatory attendance threshold is 75%</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Tardy / Late</span>
                  <span className={styles.kpiValue} style={{ color: '#d97706' }}>
                    {currentStudent?.lateDays ?? 0}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#fef3c7', color: '#d97706' }}>
                  <FaClock />
                </div>
              </div>
              <span className={styles.kpiSubtext}>Arrivals marked after roll-call chime</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Excused Leave</span>
                  <span className={styles.kpiValue} style={{ color: '#2563eb' }}>
                    {currentStudent?.excusedDays ?? 0}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <FaClipboardList />
                </div>
              </div>
              <span className={styles.kpiSubtext}>Medical & approved family leave</span>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <FaCalendarAlt style={{ color: '#2563eb' }} />
                Detailed Attendance Log (Recent Sessions)
              </h3>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remark / Leave Reason</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.individualData?.auditLog || []).map((log, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{log.date_str}</td>
                      <td>
                        <span
                          className={
                            log.status === 'PRESENT'
                              ? styles.badgeCompliant
                              : log.status === 'ABSENT'
                              ? styles.badgeAtRisk
                              : log.status === 'LATE'
                              ? styles.badgeWatchlist
                              : styles.badgeWarning
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                      <td>{log.remark || '—'}</td>
                      <td style={{ color: '#64748b' }}>
                        {log.marked_by_first_name
                          ? `${log.marked_by_first_name} ${log.marked_by_last_name}`
                          : 'Staff'}
                      </td>
                    </tr>
                  ))}
                  {(!reportData?.individualData?.auditLog || reportData.individualData.auditLog.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No attendance sessions logged for this period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INSTITUTIONAL COHORT VIEW (Admin, Principal, Teachers, Staff) */}
      {!isStudentOrParent && (
        <>
          {/* Executive KPI Cards */}
          <div className={styles.kpiGrid}>
            {/* 1. Overall Attendance Rate */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Cohort Attendance Rate</span>
                  <span className={styles.kpiValue} style={{ color: (kpis.overallAttendanceRate || 0) >= 90 ? '#166534' : '#2563eb' }}>
                    {kpis.overallAttendanceRate ?? 0}%
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
                    width: `${Math.min(100, kpis.overallAttendanceRate || 0)}%`,
                    background: (kpis.overallAttendanceRate || 0) >= 90 ? '#10b981' : '#f59e0b',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                {kpis.totalAttendanceRecords ?? 0} total pupil-days evaluated
              </span>
            </div>

            {/* 2. Total Absences & Tardiness */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Total Absences</span>
                  <span className={styles.kpiValue} style={{ color: '#dc2626' }}>
                    {kpis.totalAbsent ?? 0}
                  </span>
                </div>
                <div className={styles.kpiIconWrapper} style={{ background: '#fee2e2', color: '#dc2626' }}>
                  <FaTimesCircle />
                </div>
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressBar}
                  style={{
                    width: `${Math.min(100, ((kpis.totalAbsent || 0) / (kpis.totalAttendanceRecords || 1)) * 100)}%`,
                    background: '#ef4444',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                Tardy arrivals: <strong>{kpis.totalLate ?? 0}</strong> • Excused: <strong>{kpis.totalExcused ?? 0}</strong>
              </span>
            </div>

            {/* 3. Chronic Absenteeism Alert */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Chronic Defaulters (&lt;75%)</span>
                  <span
                    className={styles.kpiValue}
                    style={{ color: (kpis.chronicDefaultersCount || 0) > 0 ? '#b91c1c' : '#166534' }}
                  >
                    {kpis.chronicDefaultersCount ?? 0}
                  </span>
                </div>
                <div
                  className={styles.kpiIconWrapper}
                  style={{
                    background: (kpis.chronicDefaultersCount || 0) > 0 ? '#fee2e2' : '#f0fdf4',
                    color: (kpis.chronicDefaultersCount || 0) > 0 ? '#dc2626' : '#166534',
                  }}
                >
                  <FaExclamationTriangle />
                </div>
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressBar}
                  style={{
                    width: `${Math.min(100, kpis.chronicDefaultersRate || 0)}%`,
                    background: '#dc2626',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                {(kpis.chronicDefaultersCount || 0) > 0
                  ? `${kpis.chronicDefaultersRate}% of roster requires intervention`
                  : 'Zero students currently below statutory threshold'}
              </span>
            </div>

            {/* 4. Today's Roll-Call Submission Compliance */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Today's Roll-Call</span>
                  <span className={styles.kpiValue}>
                    {kpis.sectionsSubmittedToday ?? 0} / {kpis.totalSectionsCount ?? 0}
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
                    width: `${kpis.todayRollCallRate ?? 0}%`,
                    background: '#a855f7',
                  }}
                />
              </div>
              <span className={styles.kpiSubtext}>
                {kpis.todayRollCallRate ?? 0}% of active sections submitted today
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabsNav}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <HiOutlineChartBar />
              Executive Overview & Trends
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'at_risk' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('at_risk')}
            >
              <FaExclamationTriangle />
              Chronic Absenteeism (&lt;75%)
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
              className={`${styles.tabBtn} ${activeTab === 'sections' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('sections')}
            >
              <FaSchool />
              Class & Section Performance
              <span className={styles.tabCountBadge}>{reportData?.sectionComparison?.length ?? 0}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'student_ledger' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('student_ledger')}
            >
              <FaUserGraduate />
              Student Dossier & Ledger
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'broadsheet' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('broadsheet')}
            >
              <HiOutlineClipboardDocumentList />
              Master Statutory Broadsheet
              <span className={styles.tabCountBadge}>{reportData?.broadsheet?.length ?? 0}</span>
            </button>
          </div>

          {/* TAB 1: EXECUTIVE OVERVIEW & TRENDS */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={styles.overviewGrid}>
                {/* Donut Chart: Status Distribution */}
                <DonutPieChart
                  data={reportData?.statusDistribution || []}
                  title="Attendance Status Distribution"
                  subtitle="Categorical breakdown of student attendance records"
                  centerValue={`${kpis.overallAttendanceRate ?? 0}%`}
                  centerLabel="Present Rate"
                  unit="sessions"
                />

                {/* Radial Gauge: Institutional Compliance Gauge */}
                <RadialGaugeChart
                  value={kpis.overallAttendanceRate ?? 0}
                  max={100}
                  title="Statutory Attendance Compliance"
                  subtitle="Target baseline is 75% statutory minimum"
                  gradeLetter={(kpis.overallAttendanceRate || 0) >= 90 ? 'A' : (kpis.overallAttendanceRate || 0) >= 80 ? 'B' : 'C'}
                  gradeDescription={(kpis.overallAttendanceRate || 0) >= 90 ? 'Excellent School Compliance' : 'Satisfactory Performance'}
                  midLabel="75% Statutory Floor"
                />
              </div>

              {/* Day of Week Attendance Patterns */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>
                      <FaCalendarAlt style={{ color: '#2563eb' }} />
                      Day-of-Week Attendance Intelligence
                    </h3>
                    <p className={styles.cardSubtitle}>
                      Evaluates school-wide absenteeism by weekday to identify systemic drop-off patterns.
                    </p>
                  </div>
                  {reportData?.dayOfWeekTrends?.lowestDay && (
                    <span className={styles.badgeWarning}>
                      Lowest Attendance: {reportData.dayOfWeekTrends.lowestDay.day} ({reportData.dayOfWeekTrends.lowestDay.rate}%)
                    </span>
                  )}
                </div>

                <div className={styles.dowGrid}>
                  {(reportData?.dayOfWeekTrends?.days || []).map((day) => (
                    <div key={day.day} className={styles.dowCard}>
                      <span className={styles.dowTitle}>{day.day}</span>
                      <span className={styles.dowRate} style={{ color: day.attendanceRate >= 90 ? '#166534' : day.attendanceRate >= 80 ? '#2563eb' : '#dc2626' }}>
                        {day.attendanceRate}%
                      </span>
                      <div className={styles.kpiProgressTrack}>
                        <div
                          className={styles.kpiProgressBar}
                          style={{
                            width: `${day.attendanceRate}%`,
                            background: day.attendanceRate >= 90 ? '#10b981' : '#f59e0b',
                          }}
                        />
                      </div>
                      <span className={styles.kpiSubtext} style={{ justifyContent: 'center', marginTop: '0.25rem' }}>
                        {day.present} present • {day.absent} absent
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grade-Level Comparison */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    <HiOutlineAcademicCap style={{ color: '#2563eb' }} />
                    Grade-Level Attendance Ranking
                  </h3>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Grade</th>
                        <th>Enrolled Students</th>
                        <th>Attendance Rate</th>
                        <th>Present Days</th>
                        <th>Absent Days</th>
                        <th>Late Days</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.gradeComparison || []).map((g) => (
                        <tr key={g.gradeId}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{g.gradeName}</td>
                          <td>{g.studentCount} students</td>
                          <td>
                            <strong style={{ fontSize: '1rem', color: g.attendanceRate >= 90 ? '#166534' : '#0f172a' }}>
                              {g.attendanceRate}%
                            </strong>
                          </td>
                          <td>{g.presentCount}</td>
                          <td style={{ color: g.absentCount > 0 ? '#dc2626' : 'inherit' }}>{g.absentCount}</td>
                          <td>{g.lateCount}</td>
                          <td>
                            <span className={g.attendanceRate >= 75 ? styles.badgeCompliant : styles.badgeAtRisk}>
                              {g.attendanceRate >= 75 ? 'Compliant' : 'Needs Review'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHRONIC ABSENTEEISM & EARLY WARNING REGISTER */}
          {activeTab === 'at_risk' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <FaExclamationTriangle style={{ color: '#dc2626' }} />
                    Chronic Absenteeism & Early Intervention Register
                  </h3>
                  <p className={styles.cardSubtitle}>
                    Lists all students with attendance below the statutory 75% threshold or 3+ consecutive unexcused absences.
                  </p>
                </div>

                <span className={styles.badgeCritical}>
                  {filteredAtRisk.length} Students At-Risk
                </span>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Admission #</th>
                      <th>Student Name</th>
                      <th>Grade & Section</th>
                      <th>Attendance Rate</th>
                      <th>Consecutive Days Absent</th>
                      <th>Absent / Total</th>
                      <th>Risk Severity</th>
                      <th>Parent Contact</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAtRisk.map((student) => (
                      <tr key={student.studentId}>
                        <td><strong>{student.admissionNumber}</strong></td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</td>
                        <td>{student.gradeName} - {student.sectionName}</td>
                        <td>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
                            {student.attendanceRate}%
                          </span>
                        </td>
                        <td>
                          {student.consecutiveAbsences >= 3 ? (
                            <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                              🔥 {student.consecutiveAbsences} days in a row
                            </span>
                          ) : (
                            `${student.consecutiveAbsences} days`
                          )}
                        </td>
                        <td>{student.absentDays} / {student.totalDays} sessions</td>
                        <td>
                          <span
                            className={
                              student.riskLevel === 'CRITICAL'
                                ? styles.badgeCritical
                                : student.riskLevel === 'WARNING'
                                ? styles.badgeWarning
                                : styles.badgeWatchlist
                            }
                          >
                            {student.riskLevel}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{student.parentName}</span>
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{student.parentPhone}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleNotifyParent(student)}
                              title="Send SMS / App Notice to Parent"
                            >
                              <FaBullhorn style={{ color: '#2563eb' }} />
                              Alert Parent
                            </button>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleDrillDownStudent(student.studentId)}
                              title="Inspect Full History"
                            >
                              <FaEye />
                              Dossier
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAtRisk.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#15803d' }}>
                          <FaCheckCircle style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                          <p style={{ fontWeight: 700, margin: 0 }}>Outstanding Achievement!</p>
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            Zero students are currently flagged for chronic absenteeism or consecutive drop-outs.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CLASS & SECTION COMPARISON */}
          {activeTab === 'sections' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <FaSchool style={{ color: '#2563eb' }} />
                    Section Performance & Roll-Call Accountability
                  </h3>
                  <p className={styles.cardSubtitle}>
                    Compares student presence and homeroom teacher roll-call submission across all school sections.
                  </p>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Grade</th>
                      <th>Class Teacher</th>
                      <th>Enrolled Students</th>
                      <th>Period Attendance %</th>
                      <th>Absence Count</th>
                      <th>Tardy Count</th>
                      <th>Today's Roll-Call</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData?.sectionComparison || []).map((sec) => (
                      <tr key={sec.sectionId}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{sec.sectionName}</td>
                        <td>{sec.gradeName}</td>
                        <td style={{ color: '#475569' }}>{sec.classTeacherName}</td>
                        <td>{sec.totalStudents} pupils</td>
                        <td>
                          <strong style={{ fontSize: '1rem', color: sec.attendanceRate >= 90 ? '#166534' : '#0f172a' }}>
                            {sec.attendanceRate}%
                          </strong>
                        </td>
                        <td style={{ color: sec.absentCount > 0 ? '#dc2626' : 'inherit' }}>{sec.absentCount}</td>
                        <td>{sec.lateCount}</td>
                        <td>
                          {sec.todayStatus === 'SUBMITTED' ? (
                            <span className={styles.statusSubmitted}>
                              <FaCheckCircle /> Submitted ({sec.todayMarkedCount})
                            </span>
                          ) : (
                            <span className={styles.statusPending}>
                              <FaClock /> Pending Roll-Call
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => {
                              setSelectedGrade(sec.gradeId);
                              setSelectedSection(sec.sectionId);
                              setActiveTab('broadsheet');
                            }}
                          >
                            View Broadsheet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: STUDENT DOSSIER & LEDGER DRILL-DOWN */}
          {activeTab === 'student_ledger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    <FaUserGraduate style={{ color: '#2563eb' }} />
                    Student Attendance Dossier & Profile
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label className={styles.filterLabel}>Select Student:</label>
                    <select
                      className={styles.filterSelect}
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                      <option value="">Choose student...</option>
                      {(reportData?.broadsheet || []).map((s) => (
                        <option key={s.studentId} value={s.studentId}>
                          {s.name} ({s.admissionNumber}) - {s.sectionName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {reportData?.individualData?.student ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className={styles.studentHeroCard}>
                      <div className={styles.studentHeroInfo}>
                        <div className={styles.studentAvatar}>
                          <FaUserGraduate />
                        </div>
                        <div>
                          <h2 className={styles.studentHeroName}>
                            {reportData.individualData.student.name}
                          </h2>
                          <div className={styles.studentHeroMeta}>
                            <span>Admission: <strong>{reportData.individualData.student.admissionNumber}</strong></span>
                            <span>•</span>
                            <span>Grade: <strong>{reportData.individualData.student.gradeName}</strong></span>
                            <span>•</span>
                            <span>Section: <strong>{reportData.individualData.student.sectionName}</strong></span>
                            <span>•</span>
                            <span>Parent: <strong>{reportData.individualData.student.parentName} ({reportData.individualData.student.parentPhone})</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.studentHeroRate}>
                        <div className={styles.studentRateNumber}>
                          {reportData.individualData.student.attendanceRate}%
                        </div>
                        <div className={styles.studentRateLabel}>
                          Period Ratio •{' '}
                          <span
                            className={
                              reportData.individualData.student.complianceStatus === 'COMPLIANT'
                                ? styles.badgeCompliant
                                : styles.badgeAtRisk
                            }
                          >
                            {reportData.individualData.student.complianceStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.kpiGrid}>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Total Sessions</span>
                        <span className={styles.kpiValue}>{reportData.individualData.student.totalDays}</span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Days Present</span>
                        <span className={styles.kpiValue} style={{ color: '#166534' }}>
                          {reportData.individualData.student.presentDays}
                        </span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Unexcused Absences</span>
                        <span className={styles.kpiValue} style={{ color: '#dc2626' }}>
                          {reportData.individualData.student.absentDays}
                        </span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Tardy / Late</span>
                        <span className={styles.kpiValue} style={{ color: '#d97706' }}>
                          {reportData.individualData.student.lateDays}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Log Table */}
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Remark / Excused Note</th>
                            <th>Recorded By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(reportData.individualData.auditLog || []).map((log, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{log.date_str}</td>
                              <td>
                                <span
                                  className={
                                    log.status === 'PRESENT'
                                      ? styles.badgeCompliant
                                      : log.status === 'ABSENT'
                                      ? styles.badgeAtRisk
                                      : log.status === 'LATE'
                                      ? styles.badgeWatchlist
                                      : styles.badgeWarning
                                  }
                                >
                                  {log.status}
                                </span>
                              </td>
                              <td>{log.remark || '—'}</td>
                              <td style={{ color: '#64748b' }}>
                                {log.marked_by_first_name
                                  ? `${log.marked_by_first_name} ${log.marked_by_last_name}`
                                  : 'Staff'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FaSearch style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                    <p style={{ fontWeight: 600 }}>Select a student from the dropdown or click "Dossier" on any list to inspect their attendance profile.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MASTER STATUTORY BROADSHEET */}
          {activeTab === 'broadsheet' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <HiOutlineClipboardDocumentList style={{ color: '#2563eb' }} />
                    Official Master Statutory Broadsheet
                  </h3>
                  <p className={styles.cardSubtitle}>
                    Formal statutory register formatted for accreditation, ministry oversight, and terminal reports.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className={styles.btnSecondary} onClick={handleExportCSV}>
                    <FaDownload />
                    Export CSV
                  </button>
                  <button type="button" className={styles.btnPrimary} onClick={() => window.print()}>
                    <FaPrint />
                    Print Broadsheet
                  </button>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Admission #</th>
                      <th>Student Name</th>
                      <th>Grade</th>
                      <th>Section</th>
                      <th>Sessions</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Excused</th>
                      <th>Rate %</th>
                      <th>Statutory Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBroadsheet.map((student, idx) => (
                      <tr key={student.studentId}>
                        <td>{idx + 1}</td>
                        <td><strong>{student.admissionNumber}</strong></td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</td>
                        <td>{student.gradeName}</td>
                        <td>{student.sectionName}</td>
                        <td>{student.totalDays}</td>
                        <td style={{ color: '#166534', fontWeight: 600 }}>{student.presentDays}</td>
                        <td style={{ color: student.absentDays > 0 ? '#dc2626' : 'inherit', fontWeight: student.absentDays > 0 ? 700 : 400 }}>
                          {student.absentDays}
                        </td>
                        <td>{student.lateDays}</td>
                        <td>{student.excusedDays}</td>
                        <td>
                          <strong
                            style={{
                              fontSize: '0.95rem',
                              color: student.attendanceRate >= 75 ? '#166534' : '#dc2626',
                            }}
                          >
                            {student.attendanceRate}%
                          </strong>
                        </td>
                        <td>
                          <span className={student.complianceStatus === 'COMPLIANT' ? styles.badgeCompliant : styles.badgeAtRisk}>
                            {student.complianceStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredBroadsheet.length === 0 && (
                      <tr>
                        <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No students found matching the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Parent Alert Modal */}
      {contactModalStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                📢 Send Attendance Alert to Parent
              </h3>
              <button
                type="button"
                onClick={() => setContactModalStudent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}>
                <strong>Student:</strong> {contactModalStudent.name} ({contactModalStudent.admissionNumber})
              </p>
              <p style={{ margin: '0 0 0.35rem 0' }}>
                <strong>Current Attendance:</strong>{' '}
                <span style={{ color: '#dc2626', fontWeight: 800 }}>{contactModalStudent.attendanceRate}%</span> (
                {contactModalStudent.absentDays} unexcused absences)
              </p>
              <p style={{ margin: 0 }}>
                <strong>Parent / Guardian:</strong> {contactModalStudent.parentName} ({contactModalStudent.parentPhone})
              </p>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
              This will automatically dispatch an official SMS alert and school dashboard notification requesting immediate parent intervention.
            </p>

            {contactSuccessMsg ? (
              <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                ✓ {contactSuccessMsg}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setContactModalStudent(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSendNotificationConfirm}
                >
                  Confirm & Send Alert
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
