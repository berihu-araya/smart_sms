'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';
import {
  getAttendanceSheet,
  saveBulkAttendance,
  getMonthlyAttendanceMatrix,
  getOwnAttendance,
  getMyChildrenAttendance,
} from '@/services/attendanceService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import {
  HiUsers,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiInformationCircle,
  HiSave,
  HiLightningBolt,
  HiDocumentDownload,
  HiCalendar,
  HiViewGrid,
  HiChevronDown,
} from 'react-icons/hi';

const EXCUSED_REASONS = [
  { label: '🏥 Sick Leave', value: 'Sick Leave', status: 'EXCUSED', icon: '🏥' },
  { label: '📝 Permission / Leave', value: 'Permission', status: 'EXCUSED', icon: '📝' },
  { label: '👨‍👩‍👧 Family Leave', value: 'Family Emergency', status: 'EXCUSED', icon: '👨‍👩‍👧' },
  { label: '🏆 School Event', value: 'School Activity', status: 'EXCUSED', icon: '🏆' },
  { label: '🚗 Late Transport', value: 'Late Transport', status: 'LATE', icon: '🚗' },
  { label: 'ℹ️ General Excused', value: 'Excused', status: 'EXCUSED', icon: 'ℹ️' },
];

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isStudent = (user?.role || '').toLowerCase() === 'student';
  const isParent = (user?.role || '').toLowerCase() === 'parent';
  const [studentAttendance, setStudentAttendance] = useState(null);
  const [parentChildrenAttendance, setParentChildrenAttendance] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [viewMode, setViewMode] = useState('DAILY'); // 'DAILY' | 'MONTHLY'
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Daily Roster State
  const [roster, setRoster] = useState([]);
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    sick: 0,
    permission: 0,
    other: 0,
  });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [rapidModeActive, setRapidModeActive] = useState(true);

  // Dropdown state for "Excused / Reasons"
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const [topBulkDropdownOpen, setTopBulkDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Monthly Matrix State
  const [monthlyData, setMonthlyData] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Parent-specific views state
  const [parentViewMode, setParentViewMode] = useState('CALENDAR'); // 'CALENDAR' | 'SECTION_MATRIX' | 'LOG'
  const [parentSectionMatrix, setParentSectionMatrix] = useState(null);
  const [parentMatrixLoading, setParentMatrixLoading] = useState(false);

  // Load Parent Section Matrix when in SECTION_MATRIX mode or when child/month changes
  const loadParentSectionMatrix = useCallback(async (sectionId, year, month) => {
    if (!sectionId) return;
    setParentMatrixLoading(true);
    try {
      const data = await getMonthlyAttendanceMatrix({ sectionId, year, month });
      setParentSectionMatrix(data);
    } catch (err) {
      console.warn('Could not load parent section matrix:', err.message);
      setParentSectionMatrix(null);
    } finally {
      setParentMatrixLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isParent || !selectedChildId) return;
    const activeItem = parentChildrenAttendance.find((item) => item.student?.id === selectedChildId) || parentChildrenAttendance[0];
    const sectionId = activeItem?.student?.section_id;
    if (sectionId && parentViewMode === 'SECTION_MATRIX') {
      loadParentSectionMatrix(sectionId, selectedYear, selectedMonth);
    }
  }, [isParent, selectedChildId, parentViewMode, selectedYear, selectedMonth, parentChildrenAttendance, loadParentSectionMatrix]);

  useEffect(() => {
    if (authLoading || !user || !isStudent) return;

    let mounted = true;
    setLoading(true);
    getOwnAttendance()
      .then((data) => {
        if (mounted) setStudentAttendance(data);
      })
      .catch((err) => {
        if (mounted) setAlert({ type: 'error', message: err.message || 'Failed to load your attendance' });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, isStudent, user]);

  useEffect(() => {
    if (authLoading || !user || !isParent) return;

    let mounted = true;
    setLoading(true);
    getMyChildrenAttendance()
      .then((data) => {
        if (mounted) {
          const list = Array.isArray(data) ? data : [];
          setParentChildrenAttendance(list);
          const paramStudentId = searchParams?.get('studentId');
          if (paramStudentId && list.find((item) => item.student?.id === paramStudentId)) {
            setSelectedChildId(paramStudentId);
          } else if (list.length > 0) {
            setSelectedChildId(list[0].student?.id);
          }
        }
      })
      .catch((err) => {
        if (mounted) setAlert({ type: 'error', message: err.message || 'Failed to load children attendance' });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, isParent, user, searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownIndex(null);
        setTopBulkDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Load: Grades
  useEffect(() => {
    if (authLoading || !user || isStudent || isParent) return;

    async function loadGrades() {
      try {
        const res = await listGrades({ limit: 100 });
        const items = res?.items || res || [];
        setGrades(items);
        if (items.length > 0) {
          setSelectedGrade(items[0].id);
        }
      } catch (err) {
        console.error('Failed to load grades', err);
      }
    }
    loadGrades();
  }, [authLoading, isStudent, isParent, user]);

  // When Grade changes, load Sections
  useEffect(() => {
    if (authLoading || !user || isStudent || isParent) return;

    if (!selectedGrade) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    async function loadSections() {
      try {
        const res = await listSections({ gradeId: selectedGrade, limit: 100 });
        const items = res?.items || res || [];
        setSections(items);
        if (items.length > 0) {
          setSelectedSection(items[0].id);
        } else {
          setSelectedSection('');
          setRoster([]);
        }
      } catch (err) {
        console.error('Failed to load sections', err);
      }
    }
    loadSections();
  }, [authLoading, isStudent, isParent, selectedGrade, user]);

  // Load Daily Roster
  const fetchRoster = useCallback(async () => {
    if (authLoading || !user || isStudent || isParent) return;
    if (!selectedSection || !selectedDate) return;
    setLoading(true);
    setAlert(null);
    try {
      const data = await getAttendanceSheet({
        sectionId: selectedSection,
        date: selectedDate,
      });

      const initialRoster = (data.students || []).map((s) => ({
        studentId: s.student_id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        gender: s.gender,
        status: s.current_status || 'PRESENT',
        remark: s.remark || '',
      }));

      setRoster(initialRoster);
      calculateSummary(initialRoster);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load attendance sheet' });
    } finally {
      setLoading(false);
    }
  }, [authLoading, isStudent, isParent, selectedSection, selectedDate, user]);

  // Load Monthly Matrix
  const fetchMonthlyMatrix = useCallback(async () => {
    if (authLoading || !user || isStudent || isParent) return;
    if (!selectedSection) return;
    setLoading(true);
    setAlert(null);
    try {
      const data = await getMonthlyAttendanceMatrix({
        sectionId: selectedSection,
        year: selectedYear,
        month: selectedMonth,
      });
      setMonthlyData(data);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load monthly matrix' });
    } finally {
      setLoading(false);
    }
  }, [authLoading, isStudent, isParent, selectedSection, selectedYear, selectedMonth, user]);

  // Trigger load on filter change
  useEffect(() => {
    if (authLoading || !user || isStudent || isParent) return;
    if (selectedSection) {
      if (viewMode === 'DAILY') {
        fetchRoster();
      } else {
        fetchMonthlyMatrix();
      }
    }
  }, [authLoading, isStudent, isParent, selectedSection, selectedDate, selectedYear, selectedMonth, viewMode, fetchRoster, fetchMonthlyMatrix, user]);

  // Calculate Daily Stats (5 KPIs: Total, Present, Absent, Late, Excused + Reason Breakdown)
  const calculateSummary = (currentRoster) => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      sick: 0,
      permission: 0,
      other: 0,
    };

    currentRoster.forEach((r) => {
      if (r.status === 'PRESENT') counts.present++;
      else if (r.status === 'ABSENT') counts.absent++;
      else if (r.status === 'LATE') counts.late++;
      else if (r.status === 'EXCUSED') {
        counts.excused++;
        const rem = (r.remark || '').toLowerCase();
        if (rem.includes('sick')) counts.sick++;
        else if (rem.includes('permission') || rem.includes('leave')) counts.permission++;
        else counts.other++;
      }
    });

    setSummary(counts);
  };

  // Status Change handler
  const handleStatusChange = (index, status, defaultRemark = '') => {
    const updated = [...roster];
    updated[index].status = status;
    updated[index].remark = defaultRemark;
    setRoster(updated);
    calculateSummary(updated);
    setActiveDropdownIndex(null);
  };

  const handleSelectReason = (index, preset) => {
    const updated = [...roster];
    updated[index].status = preset.status;
    updated[index].remark = preset.value;
    setRoster(updated);
    calculateSummary(updated);
    setActiveDropdownIndex(null);
  };

  const handleRemarkChange = (index, remark) => {
    const updated = [...roster];
    updated[index].remark = remark;
    setRoster(updated);
    calculateSummary(updated);
  };

  // Bulk Actions
  const handleMarkAll = (status, remark = '') => {
    const updated = roster.map((r) => ({
      ...r,
      status,
      remark: remark || (status === 'PRESENT' ? '' : r.remark),
    }));
    setRoster(updated);
    calculateSummary(updated);
    setTopBulkDropdownOpen(false);
  };

  const handleBulkReason = (preset) => {
    const updated = roster.map((r) => ({
      ...r,
      status: preset.status,
      remark: preset.value,
    }));
    setRoster(updated);
    calculateSummary(updated);
    setTopBulkDropdownOpen(false);
  };

  // Keyboard Hotkey Roll Call Handler
  useEffect(() => {
    if (viewMode !== 'DAILY' || !rapidModeActive || roster.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toUpperCase();

      if (key === 'P' || key === 'A' || key === 'L') {
        e.preventDefault();
        const statusMap = {
          P: 'PRESENT',
          A: 'ABSENT',
          L: 'LATE',
        };
        handleStatusChange(focusedIndex, statusMap[key]);
        setFocusedIndex((prev) => (prev < roster.length - 1 ? prev + 1 : prev));
      } else if (key === 'E') {
        e.preventDefault();
        setActiveDropdownIndex(focusedIndex);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < roster.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, rapidModeActive, focusedIndex, roster]);

  // Save Attendance Sheet
  const handleSaveAttendance = async () => {
    if (!selectedSection || roster.length === 0) return;
    setSaving(true);
    setAlert(null);

    try {
      const payload = {
        sectionId: selectedSection,
        date: selectedDate,
        records: roster.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          remark: r.remark,
        })),
      };

      await saveBulkAttendance(payload);
      setAlert({
        type: 'success',
        message: `Attendance for ${roster.length} students saved successfully!`,
      });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save attendance' });
    } finally {
      setSaving(false);
    }
  };

  // Export Monthly CSV
  const handleExportCSV = () => {
    if (!monthlyData || !monthlyData.matrix || monthlyData.matrix.length === 0) return;

    const daysHeader = Array.from({ length: monthlyData.daysInMonth }, (_, i) => `Day ${i + 1}`).join(',');
    let csv = `Admission No,Student Name,Gender,${daysHeader},Present Days,Absent Days,Late Days,Rate %\n`;

    monthlyData.matrix.forEach((row) => {
      const daysValues = Array.from({ length: monthlyData.daysInMonth }, (_, i) => {
        const val = row.days[i + 1];
        return val ? val.charAt(0) : '-';
      }).join(',');

      csv += `"${row.admissionNumber}","${row.name}","${row.gender}",${daysValues},${row.summary.presentCount},${row.summary.absentCount},${row.summary.lateCount},${row.summary.attendanceRate}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Section_${selectedSection}_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const attendanceRate =
    roster.length > 0 ? Math.round((summary.present / roster.length) * 100) : 0;

  if (isStudent) {
    const stats = studentAttendance?.stats || {};
    const history = studentAttendance?.history || [];
    const totalDays = Number(stats.total_days || 0);
    const presentDays = Number(stats.present_days || 0);
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>My Attendance</h1>
            <p className={styles.subtitle}>Your personal attendance record.</p>
          </div>
        </div>

        {alert && (
          <div className={`${styles.alert} ${alert.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
            {alert.message}
          </div>
        )}

        {loading ? (
          <p>Loading your attendance...</p>
        ) : (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}><div className={`${styles.statIcon} ${styles.statTotal}`}><HiCalendar /></div><div className={styles.statContent}><h4>Attendance Rate</h4><div className={styles.statValue}>{rate}%</div></div></div>
              <div className={styles.statCard}><div className={`${styles.statIcon} ${styles.statPresent}`}><HiCheckCircle /></div><div className={styles.statContent}><h4>Present</h4><div className={styles.statValue}>{stats.present_days || 0}</div></div></div>
              <div className={styles.statCard}><div className={`${styles.statIcon} ${styles.statAbsent}`}><HiXCircle /></div><div className={styles.statContent}><h4>Absent</h4><div className={styles.statValue}>{stats.absent_days || 0}</div></div></div>
              <div className={styles.statCard}><div className={`${styles.statIcon} ${styles.statLate}`}><HiClock /></div><div className={styles.statContent}><h4>Late</h4><div className={styles.statValue}>{stats.late_days || 0}</div></div></div>
              <div className={styles.statCard}><div className={`${styles.statIcon} ${styles.statExcused}`}><HiInformationCircle /></div><div className={styles.statContent}><h4>Excused</h4><div className={styles.statValue}>{stats.excused_days || 0}</div></div></div>
            </div>

            <div className={styles.rosterSection}>
              <div className={styles.rosterHeader}>
                <div className={styles.rosterTitle}>Attendance History</div>
              </div>
              {history.length === 0 ? (
                <p style={{ padding: '1rem' }}>No attendance records are available.</p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead><tr><th>Date</th><th>Status</th><th>Remark</th></tr></thead>
                    <tbody>{history.map((record) => (
                      <tr key={record.id}><td>{record.date}</td><td>{record.status}</td><td>{record.remark || '-'}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (isParent) {
    const activeItem = parentChildrenAttendance.find((item) => item.student?.id === selectedChildId) || parentChildrenAttendance[0] || {};
    const child = activeItem.student || {};
    const overallStats = activeItem.stats || {};
    const history = activeItem.history || activeItem.attendance || [];

    // Calculate specific monthly stats and day-by-day mappings for the selected child
    const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthName = monthNames[selectedMonth - 1];

    const paddedMonth = String(selectedMonth).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${paddedMonth}`;
    const monthHistory = history.filter((r) => r.date && r.date.startsWith(monthPrefix));
    
    const recordByDay = {};
    monthHistory.forEach((r) => {
      const dayNum = parseInt(r.date.split('-')[2], 10);
      recordByDay[dayNum] = r;
    });

    let monthPresent = 0;
    let monthLate = 0;
    let monthAbsent = 0;
    let monthExcused = 0;
    let monthTotal = 0;

    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const rec = recordByDay[d];
      if (rec) {
        monthTotal++;
        if (rec.status === 'PRESENT') monthPresent++;
        else if (rec.status === 'LATE') monthLate++;
        else if (rec.status === 'ABSENT') monthAbsent++;
        else if (rec.status === 'EXCUSED') monthExcused++;
      }
    }

    const monthAttendanceRate = monthTotal > 0 ? Math.round(((monthPresent + monthLate) / monthTotal) * 100) : 0;

    const handlePrevMonth = () => {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    };

    const handleNextMonth = () => {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    };

    const handleParentExportCSV = () => {
      if (!parentSectionMatrix || !parentSectionMatrix.matrix) return;
      const daysHeader = Array.from({ length: parentSectionMatrix.daysInMonth }, (_, i) => `Day ${i + 1}`).join(',');
      let csv = `Admission No,Student Name,Gender,${daysHeader},Present Days,Absent Days,Late Days,Rate %\n`;
      parentSectionMatrix.matrix.forEach((row) => {
        const daysValues = Array.from({ length: parentSectionMatrix.daysInMonth }, (_, i) => {
          const val = row.days[i + 1];
          return val ? val.charAt(0) : '-';
        }).join(',');
        csv += `"${row.admissionNumber}","${row.name}","${row.gender}",${daysValues},${row.summary.presentCount},${row.summary.absentCount},${row.summary.lateCount},${row.summary.attendanceRate}%\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Section_Attendance_${child.section_name || 'Class'}_${selectedYear}_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Child Attendance Tracker</h1>
            <p className={styles.subtitle}>
              Monitor daily presence, late arrivals, absences, and monthly class section matrix for your children.
            </p>
          </div>

          {/* View Mode Tabs for Parents */}
          <div className={styles.tabBar}>
            <button
              type="button"
              className={`${styles.tabButton} ${parentViewMode === 'CALENDAR' ? styles.activeTab : ''}`}
              onClick={() => setParentViewMode('CALENDAR')}
            >
              <HiCalendar /> Monthly Calendar
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${parentViewMode === 'SECTION_MATRIX' ? styles.activeTab : ''}`}
              onClick={() => {
                setParentViewMode('SECTION_MATRIX');
                if (child.section_id) {
                  loadParentSectionMatrix(child.section_id, selectedYear, selectedMonth);
                }
              }}
            >
              <HiViewGrid /> Section Matrix
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${parentViewMode === 'LOG' ? styles.activeTab : ''}`}
              onClick={() => setParentViewMode('LOG')}
            >
              <HiUsers /> Attendance Log
            </button>
          </div>
        </div>

        {alert && (
          <div className={`${styles.alert} ${alert.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
            {alert.message}
          </div>
        )}

        {/* Parent Header Control Bar: Multi-Child Switcher & Month Navigation */}
        <div className={styles.parentHeaderBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Select Child:</span>
            <div className={styles.childTabs}>
              {parentChildrenAttendance.map((item) => {
                const c = item.student || {};
                const isSelected = c.id === selectedChildId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedChildId(c.id);
                      if (parentViewMode === 'SECTION_MATRIX' && c.section_id) {
                        loadParentSectionMatrix(c.section_id, selectedYear, selectedMonth);
                      }
                    }}
                    className={`${styles.childTabBtn} ${isSelected ? styles.activeChildTab : ''}`}
                  >
                    <span>👤 {c.first_name} {c.last_name}</span>
                    {c.grade_name && <small style={{ opacity: 0.8 }}>({c.grade_name}{c.section_name ? ` - ${c.section_name}` : ''})</small>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month & Year Navigation */}
          <div className={styles.monthControls}>
            <button type="button" className={styles.monthNavBtn} onClick={handlePrevMonth} title="Previous Month">
              ◀ Prev
            </button>
            <select
              className={styles.monthSelect}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthNames.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className={styles.monthSelect}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" className={styles.monthNavBtn} onClick={handleNextMonth} title="Next Month">
              Next ▶
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading attendance records...</p>
        ) : parentChildrenAttendance.length === 0 ? (
          <div className={styles.emptyState}>
            <HiUsers className={styles.emptyIcon} />
            <h3>No linked student profiles found</h3>
            <p>Please contact your school administrator to link your child&apos;s enrollment record to your parent account.</p>
          </div>
        ) : (
          <>
            {/* Monthly KPI Stats Grid for Active Child */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statTotal}`}><HiCalendar /></div>
                <div className={styles.statContent}>
                  <h4>{currentMonthName} Rate</h4>
                  <div className={styles.statValue}>{monthAttendanceRate}%</div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Overall: {overallStats.total_days ? Math.round((Number(overallStats.present_days || 0) / Number(overallStats.total_days)) * 100) : 0}%</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statPresent}`}><HiCheckCircle /></div>
                <div className={styles.statContent}>
                  <h4>Present Days</h4>
                  <div className={styles.statValue}>{monthPresent}</div>
                  <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>{overallStats.present_days || 0} total present</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statLate}`}><HiClock /></div>
                <div className={styles.statContent}>
                  <h4>Late Arrivals</h4>
                  <div className={styles.statValue}>{monthLate}</div>
                  <span style={{ fontSize: '0.72rem', color: '#d97706' }}>{overallStats.late_days || 0} total late</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statAbsent}`}><HiXCircle /></div>
                <div className={styles.statContent}>
                  <h4>Absences</h4>
                  <div className={styles.statValue}>{monthAbsent}</div>
                  <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>{overallStats.absent_days || 0} total absent</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statExcused}`}><HiInformationCircle /></div>
                <div className={styles.statContent}>
                  <h4>Excused Leave</h4>
                  <div className={styles.statValue}>{monthExcused}</div>
                  <span style={{ fontSize: '0.72rem', color: '#0284c7' }}>{overallStats.excused_days || 0} total excused</span>
                </div>
              </div>
            </div>

            {/* Attendance Status Legend */}
            <div className={styles.legendBar}>
              <span style={{ fontWeight: 700, color: '#334155' }}>Legend:</span>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendPresent}`}></span>
                <span>Present (Attended)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendLate}`}></span>
                <span>Late (Arrived Late)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendAbsent}`}></span>
                <span>Absent (Unexcused)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendExcused}`}></span>
                <span>Excused (Sick / Leave)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendWeekend}`}></span>
                <span>Weekend / Holiday</span>
              </div>
            </div>

            {/* ===================== VIEW 1: MONTHLY DAY-BY-DAY CALENDAR ===================== */}
            {parentViewMode === 'CALENDAR' && (
              <div className={styles.rosterSection}>
                <div className={styles.rosterHeader}>
                  <div>
                    <div className={styles.rosterTitle}>
                      Daily Attendance Calendar — {currentMonthName} {selectedYear}
                    </div>
                    <div className={styles.subtitle}>
                      Viewing day-by-day attendance for <strong>{child.first_name} {child.last_name}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <div className={styles.parentCalendarGrid}>
                    {Array.from({ length: daysInSelectedMonth }, (_, i) => {
                      const dayNumber = i + 1;
                      const dateObj = new Date(selectedYear, selectedMonth - 1, dayNumber);
                      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObj);
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      const record = recordByDay[dayNumber];
                      const status = record?.status;

                      let cardClass = styles.parentDayUnrecorded;
                      let pillClass = styles.pillUnrecorded;
                      let statusText = '—';
                      let statusIcon = null;

                      if (status === 'PRESENT') {
                        cardClass = styles.parentDayPresent;
                        pillClass = styles.pillPresent;
                        statusText = 'Present';
                        statusIcon = <HiCheckCircle />;
                      } else if (status === 'LATE') {
                        cardClass = styles.parentDayLate;
                        pillClass = styles.pillLate;
                        statusText = 'Late';
                        statusIcon = <HiClock />;
                      } else if (status === 'ABSENT') {
                        cardClass = styles.parentDayAbsent;
                        pillClass = styles.pillAbsent;
                        statusText = 'Absent';
                        statusIcon = <HiXCircle />;
                      } else if (status === 'EXCUSED') {
                        cardClass = styles.parentDayExcused;
                        pillClass = styles.pillExcused;
                        statusText = 'Excused';
                        statusIcon = <HiInformationCircle />;
                      } else if (isWeekend) {
                        cardClass = styles.parentDayWeekend;
                        pillClass = styles.pillWeekend;
                        statusText = 'Weekend';
                      }

                      return (
                        <div key={dayNumber} className={`${styles.parentDayCard} ${cardClass}`}>
                          <div className={styles.dayCardHeader}>
                            <span className={styles.dayCardNumber}>Day {dayNumber}</span>
                            <span className={styles.dayCardWeekday}>{dayName}</span>
                          </div>

                          <div className={styles.dayCardBody}>
                            <span className={`${styles.dayStatusPill} ${pillClass}`}>
                              {statusIcon} {statusText}
                            </span>
                            {record?.remark && (
                              <div className={styles.dayRemarkNote} title={record.remark}>
                                📝 {record.remark}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ===================== VIEW 2: MONTHLY SECTION ATTENDANCE MATRIX ===================== */}
            {parentViewMode === 'SECTION_MATRIX' && (
              <div className={styles.rosterSection}>
                <div className={styles.rosterHeader}>
                  <div>
                    <div className={styles.rosterTitle}>
                      Monthly Section Matrix — {child.grade_name || 'Class'} {child.section_name || ''} ({currentMonthName} {selectedYear})
                    </div>
                    <div className={styles.subtitle}>
                      Section Average Rate: <strong>{parentSectionMatrix?.averageAttendanceRate || 0}%</strong> • Total Enrolled: <strong>{parentSectionMatrix?.totalStudents || 0} Students</strong>
                    </div>
                  </div>

                  <div className={styles.quickActions}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={handleParentExportCSV}
                      disabled={!parentSectionMatrix || !parentSectionMatrix.matrix || parentSectionMatrix.matrix.length === 0}
                    >
                      <HiDocumentDownload /> Export Section CSV
                    </button>
                  </div>
                </div>

                {parentMatrixLoading ? (
                  <div className={styles.emptyState}>Loading monthly section matrix...</div>
                ) : !parentSectionMatrix || !parentSectionMatrix.matrix || parentSectionMatrix.matrix.length === 0 ? (
                  <div className={styles.emptyState}>
                    <HiCalendar className={styles.emptyIcon} />
                    <h3>No section matrix data found for this month</h3>
                    <p>No class attendance records have been finalized for this period.</p>
                  </div>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.matrixTable}>
                      <thead>
                        <tr>
                          <th className={styles.stickyCol}>Classmates Roster</th>
                          {Array.from({ length: parentSectionMatrix.daysInMonth }, (_, i) => (
                            <th key={i + 1}>{i + 1}</th>
                          ))}
                          <th>Present</th>
                          <th>Late</th>
                          <th>Absent</th>
                          <th>Rate %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parentSectionMatrix.matrix.map((row) => {
                          const isMyChild = row.studentId === child.id;
                          return (
                            <tr key={row.studentId} className={isMyChild ? styles.parentHighlightRow : ''}>
                              <td className={styles.stickyCol}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <span>{row.name}</span>
                                  {isMyChild && <span className={styles.parentBadge}>⭐ Your Child</span>}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.admissionNumber}</div>
                              </td>
                              {Array.from({ length: parentSectionMatrix.daysInMonth }, (_, i) => {
                                const status = row.days[i + 1];
                                let cellClass = styles.matrixEmpty;
                                let label = '·';
                                if (status === 'PRESENT') {
                                  cellClass = styles.matrixP;
                                  label = 'P';
                                } else if (status === 'ABSENT') {
                                  cellClass = styles.matrixA;
                                  label = 'A';
                                } else if (status === 'LATE') {
                                  cellClass = styles.matrixL;
                                  label = 'L';
                                } else if (status === 'EXCUSED') {
                                  cellClass = styles.matrixE;
                                  label = 'E';
                                }

                                return (
                                  <td key={i + 1}>
                                    <span className={`${styles.matrixCell} ${cellClass}`}>{label}</span>
                                  </td>
                                );
                              })}
                              <td style={{ fontWeight: 700, color: '#16a34a' }}>{row.summary.presentCount}</td>
                              <td style={{ fontWeight: 700, color: '#d97706' }}>{row.summary.lateCount || 0}</td>
                              <td style={{ fontWeight: 700, color: '#dc2626' }}>{row.summary.absentCount}</td>
                              <td style={{ fontWeight: 700 }}>{row.summary.attendanceRate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ===================== VIEW 3: ATTENDANCE LOG HISTORY ===================== */}
            {parentViewMode === 'LOG' && (
              <div className={styles.rosterSection}>
                <div className={styles.rosterHeader}>
                  <div className={styles.rosterTitle}>
                    Attendance History Log for {child.first_name || 'Child'} {child.last_name || ''}
                  </div>
                </div>
                {history.length === 0 ? (
                  <p style={{ padding: '1.25rem', color: '#64748b' }}>No recorded attendance history for this student yet.</p>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Reason / Remark Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((record) => {
                          let statusColor = '#15803d';
                          let statusBg = '#dcfce7';
                          if (record.status === 'ABSENT') {
                            statusColor = '#b91c1c';
                            statusBg = '#fee2e2';
                          } else if (record.status === 'LATE') {
                            statusColor = '#b45309';
                            statusBg = '#fef3c7';
                          } else if (record.status === 'EXCUSED') {
                            statusColor = '#0369a1';
                            statusBg = '#e0f2fe';
                          }

                          return (
                            <tr key={record.id}>
                              <td style={{ fontWeight: 600 }}>{record.date}</td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 750,
                                    background: statusBg,
                                    color: statusColor,
                                  }}
                                >
                                  {record.status}
                                </span>
                              </td>
                              <td style={{ color: '#64748b' }}>{record.remark || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }


  return (
    <div className={styles.container} ref={dropdownRef}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Daily & Monthly Attendance</h1>
          <p className={styles.subtitle}>
            Class roll call, sick/permission tracking, and monthly attendance heatmap.
          </p>
        </div>

        {/* Mode Switcher Tabs (2 Modes) */}
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabButton} ${viewMode === 'DAILY' ? styles.activeTab : ''}`}
            onClick={() => setViewMode('DAILY')}
          >
            <HiCalendar /> Daily Roll Call
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${viewMode === 'MONTHLY' ? styles.activeTab : ''}`}
            onClick={() => setViewMode('MONTHLY')}
          >
            <HiViewGrid /> Monthly Matrix
          </button>
        </div>
      </div>

      {alert && (
        <div className={`${styles.alert} ${alert.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          {alert.message}
        </div>
      )}

      {/* Filter Card */}
      <div className={styles.filterCard}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Grade / Class</label>
          <select
            className={styles.select}
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Section</label>
          <select
            className={styles.select}
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={sections.length === 0}
          >
            {sections.length === 0 ? (
              <option value="">No sections found</option>
            ) : (
              sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>

        {viewMode === 'DAILY' ? (
          <div className={styles.formGroup}>
            <label className={styles.label}>Attendance Date</label>
            <input
              type="date"
              className={styles.input}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>Year</label>
              <select
                className={styles.select}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Month</label>
              <select
                className={styles.select}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* ===================== VIEW MODE 1: DAILY ROLL CALL ===================== */}
      {viewMode === 'DAILY' && (
        <>
          {/* Rapid Keyboard Roll Call Banner */}
          {roster.length > 0 && (
            <div className={styles.keyboardAssistantBanner}>
              <div className={styles.keyHint}>
                <HiLightningBolt style={{ color: '#fbbf24', fontSize: '1.25rem' }} />
                <span>
                  <strong>Rapid Roll Call Active:</strong> Press:
                </span>
                <span className={styles.keyBadge}>P (Present)</span>
                <span className={styles.keyBadge}>A (Absent)</span>
                <span className={styles.keyBadge}>L (Late)</span>
                <span className={styles.keyBadge}>E (Excused & Reasons)</span>
                <span className={styles.keyBadge}>↑ / ↓ Navigate</span>
              </div>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setRapidModeActive(!rapidModeActive)}
                style={{ color: '#ffffff', borderColor: '#475569', background: '#334155' }}
              >
                {rapidModeActive ? 'Disable Hotkeys' : 'Enable Hotkeys'}
              </button>
            </div>
          )}

          {/* Clean 5 KPI Statistics Grid */}
          <div className={styles.statsGrid}>
            {/* 1. Total */}
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statTotal}`}>
                <HiUsers />
              </div>
              <div className={styles.statContent}>
                <h4>Total Students</h4>
                <div className={styles.statValue}>{roster.length}</div>
              </div>
            </div>

            {/* 2. Present */}
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statPresent}`}>
                <HiCheckCircle />
              </div>
              <div className={styles.statContent}>
                <h4>Present ({attendanceRate}%)</h4>
                <div className={styles.statValue}>{summary.present}</div>
              </div>
            </div>

            {/* 3. Absent */}
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statAbsent}`}>
                <HiXCircle />
              </div>
              <div className={styles.statContent}>
                <h4>Absent</h4>
                <div className={styles.statValue}>{summary.absent}</div>
              </div>
            </div>

            {/* 4. Late */}
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statLate}`}>
                <HiClock />
              </div>
              <div className={styles.statContent}>
                <h4>Late</h4>
                <div className={styles.statValue}>{summary.late}</div>
              </div>
            </div>

            {/* 5. Excused (With Taken Reasons Sub-Breakdown) */}
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statExcused}`}>
                <HiInformationCircle />
              </div>
              <div className={styles.statContent}>
                <h4>Excused</h4>
                <div className={styles.statValue}>{summary.excused}</div>

                {/* Sub-breakdown of reasons taken */}
                <div className={styles.excusedSubTags}>
                  {summary.sick > 0 && (
                    <span className={styles.excusedSubChip}>
                      🏥 {summary.sick} Sick
                    </span>
                  )}
                  {summary.permission > 0 && (
                    <span className={styles.excusedSubChip}>
                      📝 {summary.permission} Permission
                    </span>
                  )}
                  {summary.other > 0 && (
                    <span className={styles.excusedSubChip}>
                      ℹ️ {summary.other} Other
                    </span>
                  )}
                  {summary.excused === 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      0 on leave
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <div className={styles.rosterSection}>
            <div className={styles.rosterHeader}>
              <div className={styles.rosterTitle}>
                Roster Sheet for {selectedDate} ({roster.length} Students)
              </div>
              <div className={styles.quickActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => handleMarkAll('PRESENT')}
                  disabled={loading || roster.length === 0}
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => handleMarkAll('ABSENT')}
                  disabled={loading || roster.length === 0}
                >
                  Mark All Absent
                </button>

                {/* Top Bulk Excused Reason Menu */}
                <div className={styles.excusedDropdownContainer}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setTopBulkDropdownOpen(!topBulkDropdownOpen)}
                    disabled={loading || roster.length === 0}
                  >
                    Mark All Excused... <HiChevronDown />
                  </button>
                  {topBulkDropdownOpen && (
                    <div className={styles.excusedMenu}>
                      {EXCUSED_REASONS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          className={styles.excusedMenuItem}
                          onClick={() => handleBulkReason(p)}
                        >
                          <span>{p.icon}</span> Mark All {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.btnSuccess}
                  onClick={handleSaveAttendance}
                  disabled={saving || loading || roster.length === 0}
                >
                  <HiSave /> {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className={styles.emptyState}>Loading class roster...</div>
            ) : roster.length === 0 ? (
              <div className={styles.emptyState}>
                <HiUsers className={styles.emptyIcon} />
                <h3>No students found</h3>
                <p>Select a grade and section with active students to take attendance.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Student</th>
                      <th>Attendance Status</th>
                      <th>Reason / Remark Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((student, idx) => {
                      const matchedPreset = EXCUSED_REASONS.find(
                        (p) => p.value === student.remark
                      );
                      const isExcused = student.status === 'EXCUSED';

                      return (
                        <tr
                          key={student.studentId}
                          className={focusedIndex === idx ? styles.focusedRow : ''}
                          onClick={() => setFocusedIndex(idx)}
                        >
                          <td style={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                          <td>
                            <div className={styles.studentInfo}>
                              <div className={styles.avatar}>
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <div className={styles.studentName}>{student.name}</div>
                                <div className={styles.admissionNumber}>
                                  {student.admissionNumber} • {student.gender}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.statusPills}>
                              <button
                                type="button"
                                className={`${styles.statusPill} ${student.status === 'PRESENT' ? styles.activePresent : ''}`}
                                onClick={() => {
                                  setFocusedIndex(idx);
                                  handleStatusChange(idx, 'PRESENT', '');
                                }}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                className={`${styles.statusPill} ${student.status === 'ABSENT' ? styles.activeAbsent : ''}`}
                                onClick={() => {
                                  setFocusedIndex(idx);
                                  handleStatusChange(idx, 'ABSENT', '');
                                }}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                className={`${styles.statusPill} ${student.status === 'LATE' ? styles.activeLate : ''}`}
                                onClick={() => {
                                  setFocusedIndex(idx);
                                  handleStatusChange(idx, 'LATE', '');
                                }}
                              >
                                Late
                              </button>

                              {/* Excused Button with Dropdown of Reasons */}
                              <div className={styles.excusedDropdownContainer}>
                                <button
                                  type="button"
                                  className={`${styles.statusPill} ${isExcused ? styles.activeExcused : ''}`}
                                  onClick={() => {
                                    setFocusedIndex(idx);
                                    setActiveDropdownIndex(
                                      activeDropdownIndex === idx ? null : idx
                                    );
                                  }}
                                >
                                  {isExcused && matchedPreset
                                    ? `${matchedPreset.icon} ${matchedPreset.label.replace(/^[^\w]+/, '')}`
                                    : 'Excused ▾'}
                                </button>

                                {activeDropdownIndex === idx && (
                                  <div className={styles.excusedMenu}>
                                    {EXCUSED_REASONS.map((preset) => (
                                      <button
                                        key={preset.value}
                                        type="button"
                                        className={`${styles.excusedMenuItem} ${student.remark === preset.value ? styles.selectedItem : ''}`}
                                        onClick={() => handleSelectReason(idx, preset)}
                                      >
                                        <span>{preset.icon}</span> {preset.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              className={styles.remarkInput}
                              placeholder="Optional reason note..."
                              value={student.remark}
                              onChange={(e) => handleRemarkChange(idx, e.target.value)}
                              onFocus={() => setFocusedIndex(idx)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {roster.length > 0 && (
              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={styles.btnSuccess}
                  onClick={handleSaveAttendance}
                  disabled={saving || loading}
                >
                  <HiSave /> {saving ? 'Saving Records...' : 'Save Attendance'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================== VIEW MODE 2: MONTHLY MATRIX ===================== */}
      {viewMode === 'MONTHLY' && (
        <div className={styles.rosterSection}>
          <div className={styles.rosterHeader}>
            <div>
              <div className={styles.rosterTitle}>
                Monthly Section Attendance Matrix ({monthlyData?.totalStudents || 0} Students)
              </div>
              <div className={styles.subtitle}>
                Average Monthly Section Attendance Rate: <strong>{monthlyData?.averageAttendanceRate || 0}%</strong>
              </div>
            </div>

            <div className={styles.quickActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleExportCSV}
                disabled={!monthlyData || !monthlyData.matrix || monthlyData.matrix.length === 0}
              >
                <HiDocumentDownload /> Export CSV Sheet
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.emptyState}>Loading monthly matrix...</div>
          ) : !monthlyData || !monthlyData.matrix || monthlyData.matrix.length === 0 ? (
            <div className={styles.emptyState}>
              <HiCalendar className={styles.emptyIcon} />
              <h3>No monthly data available</h3>
              <p>Select an active section to view the attendance heatmap matrix.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th className={styles.stickyCol}>Student Roster</th>
                    {Array.from({ length: monthlyData.daysInMonth }, (_, i) => (
                      <th key={i + 1}>{i + 1}</th>
                    ))}
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Rate %</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.matrix.map((row) => (
                    <tr key={row.studentId}>
                      <td className={styles.stickyCol}>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.admissionNumber}</div>
                      </td>
                      {Array.from({ length: monthlyData.daysInMonth }, (_, i) => {
                        const status = row.days[i + 1];
                        let cellClass = styles.matrixEmpty;
                        let label = '·';
                        if (status === 'PRESENT') {
                          cellClass = styles.matrixP;
                          label = 'P';
                        } else if (status === 'ABSENT') {
                          cellClass = styles.matrixA;
                          label = 'A';
                        } else if (status === 'LATE') {
                          cellClass = styles.matrixL;
                          label = 'L';
                        } else if (status === 'EXCUSED') {
                          cellClass = styles.matrixE;
                          label = 'E';
                        }

                        return (
                          <td key={i + 1}>
                            <span className={`${styles.matrixCell} ${cellClass}`}>{label}</span>
                          </td>
                        );
                      })}
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>{row.summary.presentCount}</td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>{row.summary.absentCount}</td>
                      <td style={{ fontWeight: 700 }}>{row.summary.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
