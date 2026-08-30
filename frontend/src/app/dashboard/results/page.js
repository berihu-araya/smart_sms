'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { getSectionResults } from '@/services/resultService';
import { listSections } from '@/services/sectionService';
import { listGrades } from '@/services/gradeService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  HiTrophy,
  HiAcademicCap,
  HiArrowPath,
  HiDocumentText,
  HiChartBar,
  HiUserGroup,
  HiCheckBadge,
  HiClock,
} from 'react-icons/hi2';

export default function ResultsPage() {
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Semester 1');

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [gRes, secRes, yRes] = await Promise.all([
          listGrades({ limit: 100 }).catch(() => ({ items: [] })),
          listSections({ limit: 100 }).catch(() => ({ items: [] })),
          listAcademicYears({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        const gItems = gRes?.items || gRes?.data?.items || [];
        const secItems = secRes?.items || secRes?.data?.items || [];
        const yItems = yRes?.items || yRes?.data?.items || [];

        setGrades(gItems);
        setAcademicYears(yItems);

        if (gItems.length > 0) {
          const firstGrade = gItems[0].id;
          setSelectedGrade((current) => current || firstGrade);
        }

        setSections(secItems);

        if (secItems.length > 0) {
          setSelectedSection((current) => current || secItems[0].id);
        } else {
          setSelectedSection('');
        }

        const activeYear = yItems.find((y) => y.is_active);
        if (activeYear) setSelectedYear(activeYear.id);
      } catch (err) {
        console.error('Failed to load results metadata:', err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    async function loadSectionsForGrade() {
      try {
        const secRes = await listSections({
          gradeId: selectedGrade || '',
          limit: 100,
        }).catch(() => ({ items: [] }));

        const secItems = secRes?.items || secRes?.data?.items || [];
        setSections(secItems);

        if (secItems.length === 0) {
          setSelectedSection('');
          return;
        }

        setSelectedSection((current) => {
          if (current && secItems.some((section) => section.id === current)) {
            return current;
          }
          return secItems[0].id;
        });
      } catch (err) {
        console.error('Failed to load sections for grade:', err);
        setSections([]);
        setSelectedSection('');
      }
    }

    loadSectionsForGrade();
  }, [selectedGrade]);

  const loadResults = useCallback(async () => {
    if (!selectedSection) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSectionResults({
        sectionId: selectedSection,
        academicYearId: selectedYear || null,
        term: selectedTerm,
      });
      setResultData(data);
    } catch (err) {
      setError(err.message || 'Failed to calculate results');
      setResultData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedSection, selectedYear, selectedTerm]);

  useEffect(() => {
    if (selectedSection) {
      loadResults();
    }
  }, [selectedSection, selectedYear, selectedTerm, loadResults]);

  const getRankClass = (rank) => {
    if (rank === 1) return styles.rank1;
    if (rank === 2) return styles.rank2;
    if (rank === 3) return styles.rank3;
    return styles.rankOther;
  };

  const getGradeClass = (grade) => {
    if (!grade || grade === 'INCOMPLETE' || grade === 'PENDING') return styles.gradePending;
    if (grade === 'A') return styles.gradeA;
    if (grade === 'B') return styles.gradeB;
    if (grade === 'C') return styles.gradeC;
    if (grade === 'D') return styles.gradeD;
    return styles.gradeF;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Results & Academic Performance</h1>
          <p className={styles.subtitle}>
            Student rankings, weighted 100% grade evaluations (A, B, C, D, F), and official terminal report cards.
          </p>
        </div>
      </div>

      {error && <div style={{ color: '#dc2626', fontWeight: 500 }}>{error}</div>}

      {/* Filter Row */}
      <div className={styles.filterCard}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Grade Level</label>
          <select
            className={styles.select}
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <option value="">All Grades</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Class Section *</label>
          <select
            className={styles.select}
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={sections.length === 0}
          >
            {sections.length === 0 ? (
              <option value="">No sections in this grade</option>
            ) : (
              sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.room_number ? `(${s.room_number})` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Academic Session</label>
          <select
            className={styles.select}
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

        <div className={styles.formGroup}>
          <label className={styles.label}>Semester / Term</label>
          <select
            className={styles.select}
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 2">Semester 2</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>

        <div>
          <button
            className={styles.btnPrimary}
            onClick={loadResults}
            disabled={loading || !selectedSection}
          >
            <HiArrowPath size={16} />
            {loading ? 'Calculating...' : 'Recalculate Ranks'}
          </button>
        </div>
      </div>

      {/* Overview Analytics Bar */}
      {resultData && (
        <div className={styles.analyticsGrid}>
          <div className={styles.analyticsCard}>
            <div className={`${styles.cardIcon} ${styles.iconTotal}`}>
              <HiUserGroup />
            </div>
            <div>
              <div className={styles.cardLabel}>Students Evaluated</div>
              <div className={styles.cardValue}>
                {resultData.completedStudentsCount || 0} / {resultData.totalStudents}
              </div>
            </div>
          </div>

          <div className={styles.analyticsCard}>
            <div className={`${styles.cardIcon} ${styles.iconAverage}`}>
              <HiChartBar />
            </div>
            <div>
              <div className={styles.cardLabel}>Class Average Score</div>
              <div className={styles.cardValue}>{resultData.sectionAverage}%</div>
            </div>
          </div>

          <div className={styles.analyticsCard}>
            <div className={`${styles.cardIcon} ${styles.iconPass}`}>
              <HiCheckBadge />
            </div>
            <div>
              <div className={styles.cardLabel}>Overall Pass Rate</div>
              <div className={styles.cardValue}>{resultData.passRate}%</div>
            </div>
          </div>

          <div className={styles.analyticsCard}>
            <div className={`${styles.cardIcon} ${styles.iconTop}`}>
              <HiTrophy />
            </div>
            <div>
              <div className={styles.cardLabel}>Grading System</div>
              <div className={styles.cardValue} style={{ fontSize: '1.1rem' }}>
                A, B, C, D, F (100% Max)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings Leaderboard Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Calculating class results and letter grades...</div>
        ) : !resultData || resultData.rankings.length === 0 ? (
          <div className={styles.emptyState}>
            <HiAcademicCap className={styles.emptyIcon} />
            <h3>No Results Available</h3>
            <p>Make sure exams and student marks are recorded for this section.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Student Info</th>
                  <th>Admission ID</th>
                  <th>Evaluated Score</th>
                  <th>Average %</th>
                  <th>Letter Grade</th>
                  <th>Assessment Status</th>
                  <th>Official Report Card</th>
                </tr>
              </thead>
              <tbody>
                {resultData.rankings.map((student) => {
                  const isComplete = student.isComplete;
                  return (
                    <tr key={student.studentId}>
                      <td>
                        <span className={`${styles.rankBadge} ${getRankClass(student.rank)}`}>
                          {student.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {student.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {student.gender || 'Student'}
                        </div>
                      </td>
                      <td style={{ color: '#475569', fontWeight: 500 }}>
                        {student.admissionNumber}
                      </td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>
                        {student.totalWeightedScore} pts
                      </td>
                      <td>
                        <strong style={{ fontSize: '1.05rem', color: isComplete ? '#2563eb' : '#64748b' }}>
                          {student.averageScore}%
                        </strong>
                      </td>
                      <td>
                        {isComplete ? (
                          <span className={`${styles.gradeBadge} ${getGradeClass(student.overallGrade)}`}>
                            {student.overallGrade}
                          </span>
                        ) : (
                          <span className={styles.gradePending}>
                            <HiClock size={14} /> Pending 100%
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: !isComplete
                              ? '#d97706'
                              : student.status.includes('PASSED')
                              ? '#16a34a'
                              : '#dc2626',
                          }}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/results/report-card?studentId=${student.studentId}&term=${encodeURIComponent(
                            selectedTerm
                          )}&year=${selectedYear}`}
                          className={styles.btnReportCard}
                        >
                          <HiDocumentText size={16} />
                          View Report
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
