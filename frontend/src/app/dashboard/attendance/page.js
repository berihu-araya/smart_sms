'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import { getAttendanceSheet, saveBulkAttendance } from '@/services/attendanceService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import {
  HiUsers,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiInformationCircle,
  HiClipboardDocumentCheck,
  HiSparkles,
} from 'react-icons/hi2';

export default function AttendancePage() {
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roster, setRoster] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Initial load: Grades & Sections
  useEffect(() => {
    async function loadMeta() {
      try {
        const [gradesRes, sectionsRes] = await Promise.all([
          listGrades({ limit: 100 }).catch(() => ({ items: [] })),
          listSections({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        const gradeItems = gradesRes?.items || gradesRes?.data?.items || [];
        const sectionItems = sectionsRes?.items || sectionsRes?.data?.items || [];

        setGrades(gradeItems);
        setSections(sectionItems);

        if (sectionItems.length > 0) {
          setSelectedSection(sectionItems[0].id);
          if (sectionItems[0].grade_id) {
            setSelectedGrade(sectionItems[0].grade_id);
          }
        }
      } catch (err) {
        console.error('Failed to load grades or sections:', err);
      }
    }
    loadMeta();
  }, []);

  // Filter sections when grade changes
  const filteredSections = selectedGrade
    ? sections.filter((s) => s.grade_id === selectedGrade)
    : sections;

  // Load roster
  const loadRosterSheet = useCallback(async () => {
    if (!selectedSection || !selectedDate) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await getAttendanceSheet({
        sectionId: selectedSection,
        date: selectedDate,
      });

      const initialRoster = (data?.students || []).map((s) => ({
        studentId: s.student_id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        gender: s.gender,
        status: s.current_status || 'PRESENT',
        remark: s.remark || '',
      }));

      setRoster(initialRoster);
    } catch (err) {
      setError(err.message || 'Failed to load attendance roster.');
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSection, selectedDate]);

  useEffect(() => {
    if (selectedSection && selectedDate) {
      loadRosterSheet();
    }
  }, [selectedSection, selectedDate, loadRosterSheet]);

  // Handle single status change
  const handleStatusChange = (studentId, newStatus) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, status: newStatus } : item
      )
    );
  };

  // Handle remark change
  const handleRemarkChange = (studentId, newRemark) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, remark: newRemark } : item
      )
    );
  };

  // Bulk actions
  const markAllAs = (status) => {
    setRoster((prev) => prev.map((item) => ({ ...item, status })));
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!selectedSection || !selectedDate || roster.length === 0) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const records = roster.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        remark: r.remark,
      }));

      await saveBulkAttendance({
        sectionId: selectedSection,
        date: selectedDate,
        records,
      });

      setMessage('Attendance successfully saved and verified!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Quick statistics
  const totalStudents = roster.length;
  const presentCount = roster.filter((r) => r.status === 'PRESENT').length;
  const absentCount = roster.filter((r) => r.status === 'ABSENT').length;
  const lateCount = roster.filter((r) => r.status === 'LATE').length;
  const excusedCount = roster.filter((r) => r.status === 'EXCUSED').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Daily Attendance Management</h1>
          <p className={styles.subtitle}>
            Mark daily attendance, manage absence remarks, and monitor section roster status.
          </p>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}>{message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      {/* Filter Card */}
      <div className={styles.filterCard}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Grade Level</label>
          <select
            className={styles.select}
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              const matching = sections.filter((s) => s.grade_id === e.target.value);
              if (matching.length > 0) setSelectedSection(matching[0].id);
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

        <div className={styles.formGroup}>
          <label className={styles.label}>Section</label>
          <select
            className={styles.select}
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            {filteredSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.room_number ? `(${s.room_number})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Date</label>
          <input
            type="date"
            className={styles.input}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div>
          <button
            className={styles.btnPrimary}
            onClick={loadRosterSheet}
            disabled={loading || !selectedSection}
          >
            <HiClipboardDocumentCheck size={18} />
            {loading ? 'Loading...' : 'Refresh Sheet'}
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statTotal}`}>
            <HiUsers />
          </div>
          <div className={styles.statContent}>
            <h4>Total Roster</h4>
            <div className={styles.statValue}>{totalStudents}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statPresent}`}>
            <HiCheckCircle />
          </div>
          <div className={styles.statContent}>
            <h4>Present</h4>
            <div className={styles.statValue}>
              {presentCount}{' '}
              <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#16a34a' }}>
                ({totalStudents ? Math.round((presentCount / totalStudents) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statAbsent}`}>
            <HiXCircle />
          </div>
          <div className={styles.statContent}>
            <h4>Absent</h4>
            <div className={styles.statValue}>{absentCount}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statLate}`}>
            <HiClock />
          </div>
          <div className={styles.statContent}>
            <h4>Late</h4>
            <div className={styles.statValue}>{lateCount}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statExcused}`}>
            <HiInformationCircle />
          </div>
          <div className={styles.statContent}>
            <h4>Excused</h4>
            <div className={styles.statValue}>{excusedCount}</div>
          </div>
        </div>
      </div>

      {/* Roster Section */}
      <div className={styles.rosterSection}>
        <div className={styles.rosterHeader}>
          <div className={styles.rosterTitle}>
            Student Attendance Roster — {selectedDate}
          </div>
          <div className={styles.quickActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => markAllAs('PRESENT')}
            >
              <HiSparkles /> Mark All Present
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => markAllAs('ABSENT')}
            >
              Mark All Absent
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <p>Loading attendance roster...</p>
          </div>
        ) : roster.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h3>No Students Found</h3>
            <p>No active students are currently enrolled in this section.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Student Details</th>
                  <th>Gender</th>
                  <th>Status</th>
                  <th>Remark / Note</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((student, idx) => (
                  <tr key={student.studentId}>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                    <td>
                      <div className={styles.studentInfo}>
                        <div className={styles.avatar}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className={styles.studentName}>{student.name}</div>
                          <div className={styles.admissionNumber}>
                            ID: {student.admissionNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize', color: '#475569' }}>
                      {student.gender || '-'}
                    </td>
                    <td>
                      <div className={styles.statusPills}>
                        <button
                          type="button"
                          className={`${styles.statusPill} ${
                            student.status === 'PRESENT' ? styles.activePresent : ''
                          }`}
                          onClick={() => handleStatusChange(student.studentId, 'PRESENT')}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`${styles.statusPill} ${
                            student.status === 'ABSENT' ? styles.activeAbsent : ''
                          }`}
                          onClick={() => handleStatusChange(student.studentId, 'ABSENT')}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          className={`${styles.statusPill} ${
                            student.status === 'LATE' ? styles.activeLate : ''
                          }`}
                          onClick={() => handleStatusChange(student.studentId, 'LATE')}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          className={`${styles.statusPill} ${
                            student.status === 'EXCUSED' ? styles.activeExcused : ''
                          }`}
                          onClick={() => handleStatusChange(student.studentId, 'EXCUSED')}
                        >
                          Excused
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Add reason or note..."
                        className={styles.remarkInput}
                        value={student.remark}
                        onChange={(e) =>
                          handleRemarkChange(student.studentId, e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {roster.length > 0 && (
          <div className={styles.footerActions}>
            <button
              className={styles.btnPrimary}
              onClick={handleSaveAttendance}
              disabled={saving}
            >
              <HiClipboardDocumentCheck size={18} />
              {saving ? 'Saving...' : 'Submit & Save Attendance'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
