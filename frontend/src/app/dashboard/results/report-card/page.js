'use strict';
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './report-card.module.css';
import { getStudentReportCard } from '@/services/resultService';
import { listStudents } from '@/services/studentService';
import {
  HiPrinter,
  HiArrowLeft,
} from 'react-icons/hi2';

function ReportCardContent() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const termParam = searchParams.get('term') || 'Semester 1';
  const yearParam = searchParams.get('year') || '';

  const [studentId, setStudentId] = useState(studentIdParam || '');
  const [allStudents, setAllStudents] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStudentList() {
      try {
        const res = await listStudents({ limit: 100 });
        const items = res?.items || res?.data?.items || [];
        setAllStudents(items);
        if (!studentId && items.length > 0) {
          setStudentId(items[0].id);
        }
      } catch (err) {
        console.error('Failed to load student list:', err);
      }
    }
    if (!studentIdParam) {
      loadStudentList();
    }
  }, [studentIdParam, studentId]);

  useEffect(() => {
    async function fetchCard() {
      if (!studentId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentReportCard(studentId, {
          academicYearId: yearParam || null,
          term: termParam,
        });
        setReportData(data);
      } catch (err) {
        setError(err.message || 'Failed to load report card');
        setReportData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, [studentId, termParam, yearParam]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Generating official terminal report card...
        </div>
      </div>
    );
  }

  const student = reportData?.student;
  const school = reportData?.school || {};
  const academic = reportData?.academicSummary || {};
  const subjects = reportData?.subjects || [];
  const attendance = reportData?.attendance || {};

  return (
    <div className={styles.container}>
      {/* Top Action Bar (hidden when printing) */}
      <div className={styles.topBar}>
        <Link href="/dashboard/results" className={styles.backLink}>
          <HiArrowLeft size={16} /> Back to Results
        </Link>

        {!studentIdParam && allStudents.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
              Select Student:
            </span>
            <select
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
              }}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_number})
                </option>
              ))}
            </select>
          </div>
        )}

        <button className={styles.btnPrint} onClick={handlePrint}>
          <HiPrinter size={18} /> Print Official Report Card
        </button>
      </div>

      {error && (
        <div style={{ color: '#dc2626', background: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Official Report Card Printable Document */}
      {reportData && student && (
        <div className={styles.reportSheet}>
          {/* School Header */}
          <div className={styles.schoolHeader}>
            <div className={styles.schoolLogo}>
              {school.school_name ? school.school_name.charAt(0) : 'S'}
            </div>
            <div className={styles.schoolInfo}>
              <h1 className={styles.schoolName}>
                {school.school_name || 'Smart SMS International Academy'}
              </h1>
              <div className={styles.schoolMotto}>
                "{school.motto || 'Excellence in Digital Education & Character Development'}"
              </div>
              <div className={styles.schoolContact}>
                {school.address || 'Addis Ababa, Ethiopia'} • Phone: {school.phone || '+251 11 123 4567'} • Email: {school.email || 'info@smartsms.edu.et'}
              </div>
            </div>
          </div>

          <div className={styles.documentTitle}>
            Official Terminal Academic Achievement Report — {academic.term || 'Semester 1'}
          </div>

          {/* Student Profile Info Grid */}
          <div className={styles.bioGrid}>
            <div className={styles.bioItem}>
              <span className={styles.bioLabel}>Student Name:</span>
              <span className={styles.bioValue}>
                {student.first_name} {student.last_name}
              </span>
            </div>

            <div className={styles.bioItem}>
              <span className={styles.bioLabel}>Admission ID:</span>
              <span className={styles.bioValue}>{student.admission_number}</span>
            </div>

            <div className={styles.bioItem}>
              <span className={styles.bioLabel}>Gender:</span>
              <span className={styles.bioValue} style={{ textTransform: 'capitalize' }}>
                {student.gender || 'N/A'}
              </span>
            </div>

            <div className={styles.bioItem}>
              <span className={styles.bioLabel}>Grade Level:</span>
              <span className={styles.bioValue}>{student.grade_name || 'Grade 10'}</span>
            </div>

            <div className={styles.bioItem}>
              <span className={styles.bioLabel}>Section:</span>
              <span className={styles.bioValue}>{student.section_name || 'A'}</span>
            </div>

            <div className={styles.bioItem}>
              <span className={styles.bioLabel}>Attendance:</span>
              <span className={styles.bioValue}>
                {attendance.present_days || 0} / {attendance.total_days || 0} Days (
                {attendance.total_days
                  ? Math.round(((attendance.present_days || 0) / attendance.total_days) * 100)
                  : 100}
                %)
              </span>
            </div>
          </div>

          {/* Subject Performance Breakdown Table */}
          <table className={styles.academicTable}>
            <thead>
              <tr>
                <th className={styles.thLeft} style={{ width: '30%' }}>
                  Subject Name
                </th>
                <th>Continuous Assmt</th>
                <th>Final Exam</th>
                <th>Total Score (100)</th>
                <th>Letter Grade</th>
                <th>Points</th>
                <th style={{ width: '25%' }}>Teacher Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub) => {
                const quiz = sub.assessments?.find((a) => a.examType !== 'FINAL');
                const finalExam = sub.assessments?.find((a) => a.examType === 'FINAL');

                return (
                  <tr key={sub.subjectId}>
                    <td className={styles.tdLeft}>
                      {sub.subjectName} ({sub.subjectCode})
                    </td>
                    <td>{quiz ? `${quiz.score} / ${quiz.maxMarks}` : '-'}</td>
                    <td>{finalExam ? `${finalExam.score} / ${finalExam.maxMarks}` : '-'}</td>
                    <td style={{ fontWeight: 700 }}>{sub.totalScore}%</td>
                    <td>
                      <span className={styles.gradeLetter}>{sub.gradeLetter}</span>
                    </td>
                    <td>{sub.gradePoint}</td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {sub.remark || 'Satisfactory progress'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Semester Summary Box */}
          <div className={styles.summaryBox}>
            <div className={styles.summaryCol}>
              <div className={styles.summaryLabel}>Grand Total Score</div>
              <div className={styles.summaryVal}>{academic.grandTotal}</div>
            </div>

            <div className={styles.summaryCol}>
              <div className={styles.summaryLabel}>Overall Average</div>
              <div className={styles.summaryVal}>{academic.averageScore}%</div>
            </div>

            <div className={styles.summaryCol}>
              <div className={styles.summaryLabel}>Rank in Section</div>
              <div className={styles.summaryVal}>
                {academic.rankInSection}{' '}
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>
                  / {academic.totalSectionStudents}
                </span>
              </div>
            </div>

            <div className={styles.summaryCol}>
              <div className={styles.summaryLabel}>Final Letter Grade</div>
              <div className={styles.summaryVal}>{academic.finalGradeLetter}</div>
            </div>
          </div>

          {/* Conduct & Grading Key */}
          <div className={styles.conductAndKey}>
            <div className={styles.subCard}>
              <div className={styles.subCardTitle}>Behavior & Conduct Assessment</div>
              <div style={{ lineHeight: 1.6 }}>
                <strong>Conduct Rating:</strong> {academic.conduct || 'Excellent'}<br />
                <strong>Academic Status:</strong>{' '}
                <span style={{ color: '#16a34a', fontWeight: 700 }}>
                  {academic.promotionStatus}
                </span><br />
                <strong>Homeroom Comments:</strong> Active participant with consistent academic diligence.
              </div>
            </div>

            <div className={styles.subCard}>
              <div className={styles.subCardTitle}>Official 100% Grading Key</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.75rem' }}>
                <div><strong>A (80–100%):</strong> Excellent (4.0)</div>
                <div><strong>B (70–79%):</strong> Very Good (3.0)</div>
                <div><strong>C (60–69%):</strong> Pass (2.0)</div>
                <div><strong>D (50–59%):</strong> Conditional (1.0)</div>
                <div><strong>F (0–49%):</strong> Fail (0.0)</div>
                <div><strong>Pending:</strong> Total &lt; 100%</div>
              </div>
            </div>
          </div>

          {/* Official Signatures */}
          <div className={styles.signatures}>
            <div>
              <div className={styles.signatureLine}>Homeroom Teacher</div>
              <div className={styles.signatureDate}>Sign & Date</div>
            </div>

            <div>
              <div className={styles.signatureLine}>Academic Director</div>
              <div className={styles.signatureDate}>Sign & Date</div>
            </div>

            <div>
              <div className={styles.signatureLine}>School Principal / Seal</div>
              <div className={styles.signatureDate}>Official Stamp</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportCardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Loading Report Card...</div>}>
      <ReportCardContent />
    </Suspense>
  );
}
