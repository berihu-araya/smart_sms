'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { getSectionResults } from '@/services/resultService';
import { listSections } from '@/services/sectionService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  HiChartBar,
  HiAcademicCap,
  HiCheckBadge,
  HiExclamationTriangle,
  HiDocumentText,
  HiArrowTrendingUp,
} from 'react-icons/hi2';

export default function ResultsPage() {
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Semester 1');

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [secRes, yearRes] = await Promise.all([
          listSections({ limit: 100 }).catch(() => ({ items: [] })),
          listAcademicYears({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        const secItems = secRes?.items || secRes?.data?.items || [];
        const yearItems = yearRes?.items || yearRes?.data?.items || [];

        setSections(secItems);
        setAcademicYears(yearItems);

        if (secItems.length > 0) setSelectedSection(secItems[0].id);
        const activeY = yearItems.find((y) => y.is_active);
        if (activeY) setSelectedYear(activeY.id);
      } catch (err) {
        console.error('Failed to load results metadata:', err);
      }
    }
    loadMeta();
  }, []);

  const loadResults = useCallback(async () => {
    if (!selectedSection) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getSectionResults({
        sectionId: selectedSection,
        academicYearId: selectedYear,
        term: selectedTerm,
      });

      setResultData(data);
    } catch (err) {
      setError(err.message || 'Failed to calculate section results');
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
    if (grade.startsWith('A')) return styles.gradeA;
    if (grade.startsWith('B')) return styles.gradeB;
    if (grade.startsWith('C')) return styles.gradeC;
    if (grade.startsWith('D')) return styles.gradeD;
    return styles.gradeF;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Results & Academic Performance</h1>
          <p className={styles.subtitle}>
            Analyze student rankings, weighted averages, and generate official terminal transcripts.
          </p>
        </div>
      </div>

      {error && <div style={{ color: '#dc2626', fontWeight: 500 }}>{error}</div>}

      {/* Filter Row */}
      <div className={styles.filterCard}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Section *</label>
          <select
            className={styles.select}
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.room_number ? `(${s.room_number})` : ''}
              </option>
            ))}
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
            <HiArrowTrendingUp size={18} />
            {loading ? 'Computing...' : 'Calculate Results'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {resultData && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconAverage}`}>
              <HiAcademicCap />
            </div>
            <div>
              <div className={styles.statLabel}>Section Average</div>
              <div className={styles.statValue}>{resultData.sectionAverage}%</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconPass}`}>
              <HiCheckBadge />
            </div>
            <div>
              <div className={styles.statLabel}>Pass Rate</div>
              <div className={styles.statValue}>{resultData.passRate}%</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconTotal}`}>
              <HiChartBar />
            </div>
            <div>
              <div className={styles.statLabel}>Students Ranked</div>
              <div className={styles.statValue}>{resultData.totalStudents}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconFail}`}>
              <HiExclamationTriangle />
            </div>
            <div>
              <div className={styles.statLabel}>Need Remediation</div>
              <div className={styles.statValue}>{resultData.failCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings Leaderboard Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Calculating section academic results...</div>
        ) : !resultData || resultData.rankings?.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No Results Available</h3>
            <p>Make sure exams and marks are entered for students in this section.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Student Info</th>
                  <th>Admission ID</th>
                  <th>Total Score</th>
                  <th>Average %</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Report Card</th>
                </tr>
              </thead>
              <tbody>
                {resultData.rankings.map((student) => (
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
                      <strong style={{ fontSize: '1.05rem', color: '#2563eb' }}>
                        {student.averageScore}%
                      </strong>
                    </td>
                    <td>
                      <span className={`${styles.gradeBadge} ${getGradeClass(student.overallGrade)}`}>
                        {student.overallGrade}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          color: student.status === 'PROMOTED' ? '#16a34a' : '#dc2626',
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
