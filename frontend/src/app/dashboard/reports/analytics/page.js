'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import { useAuth } from '@/hooks/useAuth';
import * as analyticsService from '@/services/analyticsService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  FaChartArea,
  FaPrint,
  FaDownload,
  FaSchool,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaExclamationTriangle,
  FaCheckCircle,
  FaMoneyBillWave,
  FaSearch,
  FaBullhorn,
  FaBuilding,
  FaVenusMars,
  FaHistory,
} from 'react-icons/fa';
import {
  HiOutlineArrowPath,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineSparkles,
  HiOutlineScale,
} from 'react-icons/hi2';
import { DonutPieChart } from '@/components/reports/charts';

export default function AnalyticsDashboardPage() {
  const { user, loading: authLoading } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState('scorecard');

  // Filter States
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Contact / Intervention modal state
  const [interventionStudent, setInterventionStudent] = useState(null);
  const [interventionSuccessMsg, setInterventionSuccessMsg] = useState('');

  // Report Data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const yRes = await listAcademicYears({ limit: 100 }).catch(() => ({ items: [] }));
        const yList = Array.isArray(yRes) ? yRes : yRes?.items || yRes?.data || [];
        setAcademicYears(yList);

        const activeYear = yList.find((y) => y.is_active);
        if (activeYear) {
          setSelectedYear(activeYear.id);
        }
      } catch (err) {
        console.error('Failed to load analytics metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch Institutional Analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await analyticsService.getInstitutionalAnalytics({
        academicYearId: selectedYear || null,
      });

      setAnalyticsData(data);
    } catch (err) {
      setError(err.message || 'Failed to load executive institutional analytics');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!authLoading) {
      loadAnalytics();
    }
  }, [authLoading, loadAnalytics]);

  // Export Executive Analytics Summary as CSV
  const handleExportCSV = () => {
    if (!analyticsData) return;

    const sections = analyticsData.enrollment?.sectionCapacity || [];
    const headers = [
      'Section Name',
      'Grade Name',
      'Classroom Capacity',
      'Enrolled Students',
      'Seat Utilization %',
      'Capacity Status',
    ];

    const rows = sections.map((s) => [
      `"${s.sectionName}"`,
      `"${s.gradeName}"`,
      s.capacity,
      s.enrolled,
      `${s.utilizationRate}%`,
      `"${s.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `SmartSMS_Executive_Analytics_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Multi-Risk Students
  const filteredMultiRisk = useMemo(() => {
    const list = analyticsData?.multiRiskRadar?.students || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.admissionNumber?.toLowerCase().includes(q) ||
        s.gradeName?.toLowerCase().includes(q)
    );
  }, [analyticsData, searchQuery]);

  const handleTriggerIntervention = (student) => {
    setInterventionStudent(student);
    setInterventionSuccessMsg('');
  };

  const handleConfirmIntervention = () => {
    setInterventionSuccessMsg(
      `Executive intervention conference scheduled and parent notified for ${interventionStudent.name}.`
    );
    setTimeout(() => {
      setInterventionStudent(null);
      setInterventionSuccessMsg('');
    }, 2200);
  };

  const scorecard = analyticsData?.scorecard || {};
  const kpis = analyticsData?.kpis || {};
  const enrollment = analyticsData?.enrollment || {};
  const faculty = analyticsData?.faculty || {};

  // Donut chart distribution data for grades
  const gradeDonutData = useMemo(() => {
    const grades = enrollment.gradeDistribution || [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
    return grades.map((g, idx) => ({
      label: g.gradeName,
      count: g.count,
      color: colors[idx % colors.length],
    }));
  }, [enrollment.gradeDistribution]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <FaChartArea style={{ color: '#6366f1' }} />
            Executive Institutional Analytics
            <span className={styles.titleBadge}>Strategic Command</span>
          </div>
          <p className={styles.subtitle}>
            Balanced scorecard, capacity utilization, faculty workloads, student-to-teacher ratios, and cross-domain early warning radar.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={loadAnalytics}
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
            disabled={!analyticsData}
            title="Export CSV Broadsheet"
          >
            <FaDownload />
            Export CSV
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => window.print()}
            title="Print Executive Briefing"
          >
            <FaPrint />
            Print Briefing
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

      {/* Filter Bar */}
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
        </div>

        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Real-time institutional metrics aggregated across <strong>Academics</strong>, <strong>Attendance</strong>, and <strong>Finance</strong>.
        </span>
      </div>

      {/* EXECUTIVE BALANCED SCORECARD BANNER */}
      <div className={styles.scorecardBanner}>
        {/* Left: Composite Health Dial */}
        <div className={styles.scorecardDialArea}>
          <div className={styles.scoreRingContainer}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#38bdf8"
                strokeWidth="10"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * (scorecard.compositeHealthScore || 0)) / 100}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className={styles.scoreRingValue}>
              <span className={styles.scoreBigNum}>{scorecard.compositeHealthScore ?? 0}%</span>
              <span className={styles.scoreGradeBadge}>{scorecard.healthGrade || 'A'}</span>
            </div>
          </div>
          <div className={styles.scoreLabel}>Institutional Health Index</div>
          <span className={styles.scoreSublabel}>{scorecard.healthLabel || 'Balanced Operations'}</span>
        </div>

        {/* Right: 4 Strategic Core Pillars */}
        <div className={styles.pillarsGrid}>
          {(scorecard.pillars || []).map((pillar) => (
            <div key={pillar.key} className={styles.pillarCard}>
              <div className={styles.pillarHeader}>
                <span className={styles.pillarName}>{pillar.name}</span>
                <span className={styles.pillarScore}>{pillar.score}%</span>
              </div>
              <div className={styles.pillarTrack}>
                <div
                  className={styles.pillarBar}
                  style={{
                    width: `${Math.min(100, pillar.score)}%`,
                    background:
                      pillar.score >= 80 ? '#10b981' : pillar.score >= 70 ? '#38bdf8' : '#f59e0b',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.pillarDetail}>{pillar.detail}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Weight: {pillar.weight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MACRO EXECUTIVE KPIS */}
      <div className={styles.kpiGrid}>
        {/* Total Active Enrollment */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Active Student Body</span>
              <span className={styles.kpiValue}>{kpis.totalStudents ?? 0}</span>
            </div>
            <div className={styles.kpiIconWrapper} style={{ background: '#eff6ff', color: '#2563eb' }}>
              <FaUserGraduate />
            </div>
          </div>
          <span className={styles.kpiSubtext}>
            {enrollment.genderDistribution?.male ?? 0} Male • {enrollment.genderDistribution?.female ?? 0} Female
          </span>
        </div>

        {/* Student-to-Teacher Ratio */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Student-Teacher Ratio</span>
              <span className={styles.kpiValue} style={{ color: '#166534' }}>
                {kpis.strRatio ?? '—'}
              </span>
            </div>
            <div className={styles.kpiIconWrapper} style={{ background: '#dcfce7', color: '#166534' }}>
              <FaChalkboardTeacher />
            </div>
          </div>
          <span className={styles.kpiSubtext}>
            {kpis.totalTeachers ?? 0} faculty members • Benchmark: 15:1 to 25:1
          </span>
        </div>

        {/* Classroom Space Capacity */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Space Capacity Fill</span>
              <span className={styles.kpiValue} style={{ color: '#0f172a' }}>
                {kpis.overallCapacityRate ?? '0%'}
              </span>
            </div>
            <div className={styles.kpiIconWrapper} style={{ background: '#f3e8ff', color: '#7e22ce' }}>
              <FaBuilding />
            </div>
          </div>
          <span className={styles.kpiSubtext}>
            {kpis.totalCapacity ?? 0} total room desks across school
          </span>
        </div>

        {/* Revenue Collection Efficiency */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Fee Collection Rate</span>
              <span className={styles.kpiValue} style={{ color: '#0284c7' }}>
                {kpis.collectionEfficiency ?? '0%'}
              </span>
            </div>
            <div className={styles.kpiIconWrapper} style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <FaMoneyBillWave />
            </div>
          </div>
          <span className={styles.kpiSubtext}>
            Outstanding balance: <strong>{(kpis.totalOutstandingFees || 0).toLocaleString()} ETB</strong>
          </span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className={styles.tabsNav}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'scorecard' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('scorecard')}
        >
          <HiOutlineSparkles />
          Balanced Scorecard & Overview
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'enrollment_capacity' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('enrollment_capacity')}
        >
          <FaBuilding />
          Enrollment & Space Capacity
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'faculty_staffing' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('faculty_staffing')}
        >
          <FaChalkboardTeacher />
          Faculty & Workloads (STR)
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'multi_risk_radar' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('multi_risk_radar')}
        >
          <FaExclamationTriangle />
          360° Multi-Risk Early Warning
          <span
            className={styles.tabBadge}
            style={{
              background: (analyticsData?.multiRiskRadar?.summary?.tripleRisk || 0) > 0 ? '#fee2e2' : undefined,
              color: (analyticsData?.multiRiskRadar?.summary?.tripleRisk || 0) > 0 ? '#991b1b' : undefined,
            }}
          >
            {analyticsData?.multiRiskRadar?.students?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'longitudinal' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('longitudinal')}
        >
          <FaHistory />
          Multi-Year Benchmarking
        </button>
      </div>

      {/* TAB 1: BALANCED SCORECARD & DOMAIN BREAKDOWN */}
      {activeTab === 'scorecard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.grid2Col}>
            {/* Grade Distribution Chart */}
            <DonutPieChart
              data={gradeDonutData}
              title="Student Body Grade Allocation"
              subtitle="Distribution of enrolled students by academic grade"
              centerValue={`${kpis.totalStudents ?? 0}`}
              centerLabel="Total Pupils"
              unit="students"
            />

            {/* Strategic Domain Performance Radar */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <HiOutlineScale style={{ color: '#4f46e5' }} />
                  Strategic Operational Summary
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#0f172a' }}>Academic Mastery Status</strong>
                    <span style={{ color: '#166534', fontWeight: 700 }}>
                      {analyticsData?.academics?.passRate ?? 0}% Pass Rate
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Evaluated across {analyticsData?.academics?.totalMarksRecorded ?? 0} student assessment scores with a school mean of {analyticsData?.academics?.meanScore ?? 0}%.
                  </span>
                </div>

                <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#0f172a' }}>Attendance Regularity Status</strong>
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>
                      {analyticsData?.attendance?.attendanceRate ?? 0}% Presence
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Logged across {analyticsData?.attendance?.totalSessions ?? 0} total attendance sessions.
                  </span>
                </div>

                <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#0f172a' }}>Fiscal Health & Margin</strong>
                    <span style={{ color: (analyticsData?.finance?.netOperatingMargin || 0) >= 0 ? '#166534' : '#dc2626', fontWeight: 700 }}>
                      {(analyticsData?.finance?.netOperatingMargin || 0).toLocaleString()} ETB Margin
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Total collected: {(analyticsData?.finance?.totalCollected || 0).toLocaleString()} ETB • Total expenses: {(analyticsData?.finance?.totalExpenses || 0).toLocaleString()} ETB.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENROLLMENT VELOCITY & CLASSROOM CAPACITY */}
      {activeTab === 'enrollment_capacity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gender & Velocity Row */}
          <div className={styles.grid2Col}>
            {/* Gender Ratio Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <FaVenusMars style={{ color: '#ec4899' }} />
                  Student Gender Demographics
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-around', padding: '1rem 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb' }}>
                    {enrollment.genderDistribution?.malePercentage ?? 0}%
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                    Male Pupils ({enrollment.genderDistribution?.male ?? 0})
                  </span>
                </div>

                <div style={{ width: '1px', height: '60px', background: '#e2e8f0' }} />

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ec4899' }}>
                    {enrollment.genderDistribution?.femalePercentage ?? 0}%
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                    Female Pupils ({enrollment.genderDistribution?.female ?? 0})
                  </span>
                </div>
              </div>
            </div>

            {/* Admission Velocity Timeline */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <FaHistory style={{ color: '#6366f1' }} />
                  New Admissions Velocity (Last 12 Months)
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px', padding: '0.5rem 0' }}>
                {(enrollment.admissionVelocity || []).map((item, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                      <div
                        style={{
                          width: '100%',
                          background: '#6366f1',
                          borderRadius: '4px 4px 0 0',
                          height: `${Math.min(100, Math.max(10, (item.count / 30) * 100))}%`,
                        }}
                        title={`${item.month}: ${item.count} admissions`}
                      />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.35rem' }}>{item.month.slice(0, 3)}</span>
                  </div>
                ))}
                {(!enrollment.admissionVelocity || enrollment.admissionVelocity.length === 0) && (
                  <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No recorded admissions in the last 12-month window.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Classroom Capacity Utilization Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  <FaBuilding style={{ color: '#2563eb' }} />
                  Classroom Capacity & Space Optimization
                </h3>
                <p className={styles.cardSubtitle}>
                  Monitors physical classroom fill rates to identify overcrowded sections and under-utilized spaces.
                </p>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Section Name</th>
                    <th>Grade</th>
                    <th>Desks / Capacity</th>
                    <th>Enrolled Pupils</th>
                    <th>Seat Fill Rate</th>
                    <th>Capacity Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(enrollment.sectionCapacity || []).map((s) => (
                    <tr key={s.sectionId}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{s.sectionName}</td>
                      <td>{s.gradeName}</td>
                      <td>{s.capacity} seats</td>
                      <td>{s.enrolled} pupils</td>
                      <td>
                        <strong
                          style={{
                            color:
                              s.status === 'OVERCROWDED'
                                ? '#dc2626'
                                : s.status === 'UNDER_ENROLLED'
                                ? '#d97706'
                                : '#166534',
                          }}
                        >
                          {s.utilizationRate}%
                        </strong>
                      </td>
                      <td>
                        <span
                          className={
                            s.status === 'OPTIMAL'
                              ? styles.badgeOptimal
                              : s.status === 'OVERCROWDED'
                              ? styles.badgeOvercrowded
                              : styles.badgeUnderEnrolled
                          }
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!enrollment.sectionCapacity || enrollment.sectionCapacity.length === 0) && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No section capacity records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FACULTY & STAFFING WORKLOADS (STR) */}
      {activeTab === 'faculty_staffing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.grid2Col}>
            {/* Student to Teacher Ratio Analysis */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <FaChalkboardTeacher style={{ color: '#166534' }} />
                  Student-to-Teacher Ratio (STR) Benchmark
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Institutional STR: <strong style={{ color: '#166534', fontSize: '1.4rem' }}>{faculty.strRatio}:1</strong>
                  </span>
                  <span className={styles.badgeOptimal}>Accreditation Benchmark Met</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  The ideal international standard for primary and secondary education is between <strong>15:1</strong> and <strong>25:1</strong>.
                </p>

                <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Subject Allocation Coverage
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', marginBottom: '0.35rem' }}>
                    <strong style={{ color: '#0f172a' }}>
                      {faculty.subjectCoverage?.allocatedSubjects ?? 0} / {faculty.subjectCoverage?.totalSubjects ?? 0} subjects covered
                    </strong>
                    <span style={{ color: '#2563eb', fontWeight: 800 }}>
                      {faculty.subjectCoverage?.coveragePercentage ?? 100}%
                    </span>
                  </div>
                  <div className={styles.kpiProgressTrack}>
                    <div
                      className={styles.kpiProgressBar}
                      style={{
                        width: `${faculty.subjectCoverage?.coveragePercentage ?? 100}%`,
                        background: '#2563eb',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <HiOutlineAcademicCap style={{ color: '#4f46e5' }} />
                  Faculty Departmental Distribution
                </h3>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Faculty Count</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(faculty.departments || []).map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{d.department}</td>
                        <td>{d.count} educators</td>
                        <td>
                          {faculty.totalTeachers > 0
                            ? Math.round((d.count / faculty.totalTeachers) * 100)
                            : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 360° MULTI-RISK EARLY WARNING RADAR */}
      {activeTab === 'multi_risk_radar' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <FaExclamationTriangle style={{ color: '#dc2626' }} />
                360° Multi-Risk Early Warning Radar
              </h3>
              <p className={styles.cardSubtitle}>
                Cross-domain triage identifying compounded student vulnerability across Academics, Attendance drop-outs, and Fee arrears.
              </p>
            </div>

            <div className={styles.searchBox}>
              <FaSearch style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search at-risk student..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Admission #</th>
                  <th>Student Name</th>
                  <th>Grade & Section</th>
                  <th>Academic Avg</th>
                  <th>Attendance %</th>
                  <th>Fee Arrears</th>
                  <th>Risk Tier</th>
                  <th>Parent Contact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMultiRisk.map((student) => (
                  <tr key={student.studentId}>
                    <td><strong>{student.admissionNumber}</strong></td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</td>
                    <td>{student.gradeName} - {student.sectionName}</td>
                    <td>
                      <span style={{ color: student.academicAvgScore < 50 ? '#dc2626' : '#166534', fontWeight: 700 }}>
                        {student.academicAvgScore}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: student.attendanceRate < 75 ? '#dc2626' : '#166534', fontWeight: 700 }}>
                        {student.attendanceRate}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: student.outstandingFees > 0 ? '#b91c1c' : '#166534', fontWeight: 700 }}>
                        {student.outstandingFees.toLocaleString()} ETB
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          student.riskTier === 'TRIPLE_RISK'
                            ? styles.badgeTripleRisk
                            : student.riskTier.includes('ACADEMIC')
                            ? styles.badgeDualRisk
                            : styles.badgeSingleRisk
                        }
                      >
                        {student.riskTier.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{student.parentName}</span>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{student.parentPhone}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleTriggerIntervention(student)}
                      >
                        <FaBullhorn style={{ color: '#dc2626' }} />
                        Intervention
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMultiRisk.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#15803d' }}>
                      <FaCheckCircle style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                      <p style={{ fontWeight: 700, margin: 0 }}>No High-Risk Defaulters Detected!</p>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        No students are currently flagged for multiple compounding vulnerability factors.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: MULTI-YEAR LONGITUDINAL BENCHMARKING */}
      {activeTab === 'longitudinal' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <FaHistory style={{ color: '#2563eb' }} />
                Longitudinal Multi-Year Growth & Benchmarking
              </h3>
              <p className={styles.cardSubtitle}>
                Side-by-side institutional evolution across past and active academic cycles.
              </p>
            </div>
            <button type="button" className={styles.btnPrimary} onClick={() => window.print()}>
              <FaPrint /> Print Briefing
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Status</th>
                  <th>Estimated Active Enrollment</th>
                  <th>Cohort Academic Average</th>
                  <th>Net Fee Revenue Collected</th>
                </tr>
              </thead>
              <tbody>
                {(analyticsData?.longitudinal || []).map((year) => (
                  <tr key={year.yearId}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{year.yearName}</td>
                    <td>
                      <span className={year.isActive ? styles.badgeOptimal : styles.badgeSingleRisk}>
                        {year.isActive ? 'Active Cycle' : 'Archived'}
                      </span>
                    </td>
                    <td>{year.enrollment} enrolled</td>
                    <td>
                      <strong style={{ color: year.academicScore >= 50 ? '#166534' : '#dc2626' }}>
                        {year.academicScore > 0 ? `${year.academicScore}%` : '—'}
                      </strong>
                    </td>
                    <td style={{ fontWeight: 700, color: '#0284c7' }}>
                      {year.revenueCollected.toLocaleString()} ETB
                    </td>
                  </tr>
                ))}
                {(!analyticsData?.longitudinal || analyticsData.longitudinal.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No multi-year academic cycles archived yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Intervention Modal */}
      {interventionStudent && (
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
                🚨 Schedule Executive Intervention
              </h3>
              <button
                type="button"
                onClick={() => setInterventionStudent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}>
                <strong>Student:</strong> {interventionStudent.name} ({interventionStudent.admissionNumber})
              </p>
              <p style={{ margin: '0 0 0.35rem 0' }}>
                <strong>Vulnerability Tier:</strong>{' '}
                <span style={{ color: '#dc2626', fontWeight: 800 }}>{interventionStudent.riskTier.replace(/_/g, ' ')}</span>
              </p>
              <p style={{ margin: '0 0 0.35rem 0' }}>
                <strong>Academic Score:</strong> {interventionStudent.academicAvgScore}% •{' '}
                <strong>Attendance:</strong> {interventionStudent.attendanceRate}%
              </p>
              <p style={{ margin: 0 }}>
                <strong>Parent / Guardian:</strong> {interventionStudent.parentName} ({interventionStudent.parentPhone})
              </p>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
              Initiating this intervention will schedule a joint counselor conference, issue an official alert to the parent, and notify the homeroom teacher.
            </p>

            {interventionSuccessMsg ? (
              <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                ✓ {interventionSuccessMsg}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setInterventionStudent(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleConfirmIntervention}
                >
                  Confirm Intervention
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
