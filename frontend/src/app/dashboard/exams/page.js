'use strict';
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';
import {
  listExams,
  togglePublishExam,
} from '@/services/examService';
import { listGrades } from '@/services/gradeService';
import { listSubjects } from '@/services/subjectService';
import { listAcademicYears } from '@/services/academicYearService';
import { ExamFormModal, ExamDeleteModal } from '@/components/exams';
import {
  HiPlus,
  HiCheckBadge,
  HiClock,
  HiTrash,
  HiPencilSquare,
  HiArrowPath,
  HiClipboardDocumentList,
  HiAcademicCap,
  HiDocumentText,
  HiSparkles,
  HiCalendar,
  HiTag,
  HiCheckCircle,
  HiExclamationTriangle,
  HiMagnifyingGlass,
  HiScale,
  HiBuildingOffice,
} from 'react-icons/hi2';

export default function ExamsPage() {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isStudentOrParent = isStudent || isParent;

  const [exams, setExams] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Search & Filter states
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load lookup metadata on mount
  const loadMetadata = async () => {
    try {
      const [gRes, sRes, yRes] = await Promise.all([
        listGrades({ limit: 100 }).catch(() => ({ items: [] })),
        listSubjects({ limit: 100 }).catch(() => ({ items: [] })),
        listAcademicYears({ limit: 100 }).catch(() => ({ items: [] })),
      ]);

      const gItems = gRes?.items || gRes?.data?.items || [];
      const sItems = sRes?.items || sRes?.data?.items || [];
      const yItems = yRes?.items || yRes?.data?.items || [];

      setGrades(gItems);
      setSubjects(sItems);
      setAcademicYears(yItems);

      const activeYear = yItems.find((y) => y.is_active);
      if (activeYear) {
        setSelectedYear(activeYear.id);
      }
    } catch (err) {
      console.error('Metadata load error:', err);
    }
  };

  // Load Exams List
  const loadExamsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedGrade) params.gradeId = selectedGrade;
      if (selectedYear) params.academicYearId = selectedYear;

      const data = await listExams(params);
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load examination schedules');
    } finally {
      setLoading(false);
    }
  }, [search, selectedGrade, selectedYear]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadExamsList();
  }, [loadExamsList]);

  // Clear toast after 4s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingExam(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (exam) => {
    setEditingExam(exam);
    setIsFormModalOpen(true);
  };

  // Toggle Publish Status
  const handleTogglePublish = async (id, currentStatus) => {
    try {
      await togglePublishExam(id, !currentStatus);
      setExams((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, is_published: !currentStatus } : ex))
      );
      setSuccessMessage(
        !currentStatus
          ? 'Assessment published and opened for marks entry'
          : 'Assessment unpublished and moved to draft mode'
      );
    } catch (err) {
      setError(err.message || 'Failed to update publication status');
    }
  };

  // Badge helpers
  const getBadgeClass = (type) => {
    switch (type) {
      case 'FINAL':
        return styles.badgeFinal;
      case 'MIDTERM':
        return styles.badgeMidterm;
      case 'QUIZ':
        return styles.badgeQuiz;
      case 'PROJECT':
        return styles.badgeProject;
      default:
        return styles.badgeAssignment;
    }
  };

  // Filter exams by Subject and Term on client side
  const displayedExams = useMemo(() => {
    return exams.filter((ex) => {
      if (selectedSubject && ex.subject_id !== selectedSubject) return false;
      if (selectedTerm && ex.term_or_semester !== selectedTerm) return false;
      return true;
    });
  }, [exams, selectedSubject, selectedTerm]);

  // KPIs
  const totalExams = exams.length;
  const publishedCount = exams.filter((e) => e.is_published).length;
  const totalMarksCount = exams.reduce(
    (acc, curr) => acc + Number(curr.marks_entered_count || 0),
    0
  );

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {isStudent
              ? 'My Examination Schedule'
              : isParent
              ? 'Children Examination Schedules'
              : 'Examinations & Assessments'}
          </h1>
          <p className={styles.subtitle}>
            {isStudent
              ? 'Upcoming tests, midterms, quizzes, and final examinations for your class.'
              : isParent
              ? 'Upcoming assessment schedules, midterms, and final exam timetables for your children.'
              : 'Plan assessment cycles, configure grading weights, schedule dates, and streamline marks entry.'}
          </p>
        </div>
        {!isStudentOrParent && (
          <div className={styles.headerActions}>
            <Link href="/dashboard/marks" className={styles.btnSecondary}>
              <HiClipboardDocumentList size={18} />
              <span>Enter Student Marks</span>
            </Link>
            <button className={styles.btnPrimary} onClick={handleOpenCreateModal}>
              <HiPlus size={18} />
              <span>Schedule New Exam</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Toast Banner */}
      {successMessage && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <HiCheckCircle style={{ fontSize: '1.2rem' }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <HiExclamationTriangle style={{ fontSize: '1.2rem' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Analytics KPI Ribbon */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiTotal}`}>
            <HiDocumentText />
          </div>
          <div>
            <div className={styles.kpiLabel}>Total Assessments</div>
            <div className={styles.kpiValue}>{totalExams}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiPublished}`}>
            <HiCheckBadge />
          </div>
          <div>
            <div className={styles.kpiLabel}>Published & Active</div>
            <div className={styles.kpiValue}>{publishedCount}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiMarks}`}>
            <HiClipboardDocumentList />
          </div>
          <div>
            <div className={styles.kpiLabel}>Student Scores Recorded</div>
            <div className={styles.kpiValue}>{totalMarksCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={styles.filterCard}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <HiMagnifyingGlass style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }} />
          <input
            type="text"
            placeholder="Search exams by title, term, or keywords..."
            className={styles.searchInput}
            style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.select}
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
        >
          <option value="">All Grade Levels</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.subject_name || s.name}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
        >
          <option value="">All Terms / Semesters</option>
          <option value="Semester 1">Semester 1</option>
          <option value="Semester 2">Semester 2</option>
          <option value="Term 1">Term 1</option>
          <option value="Term 2">Term 2</option>
          <option value="Term 3">Term 3</option>
          <option value="Quarter 1">Quarter 1</option>
          <option value="Quarter 2">Quarter 2</option>
        </select>

        <select
          className={styles.select}
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">All Academic Sessions</option>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name} {y.is_active ? '★ (Active)' : ''}
            </option>
          ))}
        </select>

        <button className={styles.btnAction} onClick={loadExamsList} title="Refresh examination list">
          <HiArrowPath size={16} className={loading ? styles.spinner : ''} />
        </button>
      </div>

      {/* Examinations Table View */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>
            <HiArrowPath className={styles.spinner} style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
            <span>Loading examination schedules...</span>
          </div>
        ) : displayedExams.length === 0 ? (
          <div className={styles.emptyState}>
            <HiAcademicCap className={styles.emptyIcon} />
            <h3>No Examinations Found</h3>
            <p>
              {search || selectedGrade || selectedSubject || selectedTerm
                ? 'No examination cycles match your search filters.'
                : 'Get started by scheduling your first midterm, quiz, or final examination.'}
            </p>
            {!isStudentOrParent && (
              <button
                className={styles.btnPrimary}
                onClick={handleOpenCreateModal}
                style={{ marginTop: '1rem' }}
              >
                <HiPlus size={16} /> Schedule First Exam
              </button>
            )}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title & Term</th>
                <th>Type</th>
                <th>Grade & Subject</th>
                <th>Max / Weight</th>
                <th>Exam Date</th>
                {!isStudentOrParent && <th>Marks Progress</th>}
                {!isStudentOrParent && <th>Status</th>}
                {!isStudentOrParent && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayedExams.map((ex) => (
                <tr key={ex.id}>
                  <td>
                    <div className={styles.examTitle}>{ex.title}</div>
                    <div className={styles.examSubtitle}>
                      {ex.term_or_semester} • {ex.academic_year_name || 'Academic Session'}
                    </div>
                  </td>

                  <td>
                    <span className={`${styles.badge} ${getBadgeClass(ex.exam_type)}`}>
                      {ex.exam_type}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: '#334155' }}>
                      {ex.subject_name || 'All Subjects'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {ex.grade_name || 'All Grades'}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{ex.max_marks} pts</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Weight: <strong>{ex.weight_percentage}%</strong>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 500 }}>
                      🗓️ {ex.exam_date || 'TBD'}
                    </div>
                  </td>

                  {!isStudentOrParent && (
                    <>
                      <td>
                        <Link
                          href={`/dashboard/marks?examId=${ex.id}`}
                          className={styles.marksProgressPill}
                        >
                          <HiClipboardDocumentList />
                          <span>{ex.marks_entered_count || 0} entered</span>
                        </Link>
                      </td>

                      <td>
                        {ex.is_published ? (
                          <span className={styles.statusPublished}>
                            <HiCheckBadge /> Published
                          </span>
                        ) : (
                          <span className={styles.statusDraft}>
                            <HiClock /> Draft
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                          <Link
                            href={`/dashboard/marks?examId=${ex.id}`}
                            className={styles.btnEnterMarks}
                            title="Enter Student Marks"
                          >
                            Enter Marks ➔
                          </Link>

                          <button
                            className={styles.btnAction}
                            onClick={() => handleOpenEditModal(ex)}
                            title="Edit Assessment Details"
                          >
                            <HiPencilSquare />
                          </button>

                          <button
                            className={styles.btnAction}
                            onClick={() => handleTogglePublish(ex.id, ex.is_published)}
                            title={ex.is_published ? 'Unpublish Assessment' : 'Publish Assessment'}
                          >
                            {ex.is_published ? 'Unpublish' : 'Publish'}
                          </button>

                          <button
                            className={`${styles.btnAction} ${styles.btnDelete}`}
                            onClick={() => setDeleteTarget(ex)}
                            title="Delete Exam"
                          >
                            <HiTrash />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE & EDIT EXAM MODAL */}
      <ExamFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingExam(null);
        }}
        exam={editingExam}
        grades={grades}
        subjects={subjects}
        academicYears={academicYears}
        defaultGradeId={selectedGrade}
        defaultYearId={selectedYear}
        onSuccess={(msg) => {
          setSuccessMessage(msg);
          loadExamsList();
        }}
      />

      {/* DELETE EXAM CONFIRMATION MODAL */}
      <ExamDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        exam={deleteTarget}
        onSuccess={(msg) => {
          setSuccessMessage(msg);
          loadExamsList();
        }}
      />
    </div>
  );
}
