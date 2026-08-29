'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import {
  listExams,
  createExam,
  togglePublishExam,
  deleteExam,
} from '@/services/examService';
import { listGrades } from '@/services/gradeService';
import { listSubjects } from '@/services/subjectService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  HiPlus,
  HiMagnifyingGlass,
  HiCheckBadge,
  HiClock,
  HiTrash,
  HiArrowPath,
} from 'react-icons/hi2';

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // New exam form state
  const [formData, setFormData] = useState({
    title: '',
    termOrSemester: 'Semester 1',
    examType: 'FINAL',
    weightPercentage: '40',
    maxMarks: '100',
    examDate: '',
    gradeId: '',
    subjectId: '',
    academicYearId: '',
    isPublished: true,
    description: '',
  });

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
        setFormData((prev) => ({ ...prev, academicYearId: activeYear.id }));
      }
    } catch (err) {
      console.error('Metadata load error:', err);
    }
  };

  const loadExamsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedGrade) params.gradeId = selectedGrade;
      if (selectedYear) params.academicYearId = selectedYear;

      const data = await listExams(params);
      setExams(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams list');
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

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createExam({
        ...formData,
        weightPercentage: Number(formData.weightPercentage),
        maxMarks: Number(formData.maxMarks),
      });
      setIsModalOpen(false);
      setFormData({
        title: '',
        termOrSemester: 'Semester 1',
        examType: 'FINAL',
        weightPercentage: '40',
        maxMarks: '100',
        examDate: '',
        gradeId: '',
        subjectId: '',
        academicYearId: selectedYear,
        isPublished: true,
        description: '',
      });
      loadExamsList();
    } catch (err) {
      setError(err.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id, currentStatus) => {
    try {
      await togglePublishExam(id, !currentStatus);
      setExams((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, is_published: !currentStatus } : ex))
      );
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDeleteExam = async (id) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((ex) => ex.id !== id));
    } catch (err) {
      alert('Delete error: ' + err.message);
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'FINAL':
        return styles.badgeFinal;
      case 'MIDTERM':
        return styles.badgeMidterm;
      case 'QUIZ':
        return styles.badgeQuiz;
      default:
        return styles.badgeAssignment;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Examinations & Assessments</h1>
          <p className={styles.subtitle}>
            Create exam cycles, configure assessment weight percentages, and publish tests.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
          <HiPlus size={18} />
          Create New Exam
        </button>
      </div>

      {error && <div style={{ color: '#dc2626', fontWeight: 500 }}>{error}</div>}

      <div className={styles.filterCard}>
        <input
          type="text"
          placeholder="Search exams by title or term..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

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

        <button className={styles.btnAction} onClick={loadExamsList}>
          <HiArrowPath size={16} />
        </button>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No Examinations Found</h3>
            <p>Get started by creating the first examination or test cycle.</p>
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
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((ex) => (
                <tr key={ex.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{ex.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {ex.term_or_semester} • {ex.academic_year_name || 'All Sessions'}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${getBadgeClass(ex.exam_type)}`}>
                      {ex.exam_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#334155' }}>
                      {ex.subject_name || 'All Subjects'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {ex.grade_name || 'All Grades'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ex.max_marks} pts</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Weight: {ex.weight_percentage}%
                    </div>
                  </td>
                  <td>{ex.exam_date || 'TBD'}</td>
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
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.btnAction}
                        onClick={() => handleTogglePublish(ex.id, ex.is_published)}
                      >
                        {ex.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        className={styles.btnAction}
                        style={{ color: '#dc2626' }}
                        onClick={() => handleDeleteExam(ex.id)}
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Examination</h2>
              <button
                className={styles.modalClose}
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Exam Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Final Semester Examination 2026"
                    className={styles.input}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Exam Type</label>
                    <select
                      className={styles.input}
                      value={formData.examType}
                      onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    >
                      <option value="MIDTERM">Midterm Exam</option>
                      <option value="FINAL">Final Exam</option>
                      <option value="QUIZ">Quiz / Continuous Test</option>
                      <option value="ASSIGNMENT">Assignment / Project</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Term / Semester</label>
                    <select
                      className={styles.input}
                      value={formData.termOrSemester}
                      onChange={(e) =>
                        setFormData({ ...formData, termOrSemester: e.target.value })
                      }
                    >
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Max Marks</label>
                    <input
                      type="number"
                      required
                      className={styles.input}
                      value={formData.maxMarks}
                      onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Weight Percentage (%)</label>
                    <input
                      type="number"
                      required
                      className={styles.input}
                      value={formData.weightPercentage}
                      onChange={(e) =>
                        setFormData({ ...formData, weightPercentage: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Grade Level</label>
                    <select
                      className={styles.input}
                      value={formData.gradeId}
                      onChange={(e) => setFormData({ ...formData, gradeId: e.target.value })}
                    >
                      <option value="">All Grade Levels</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Subject</label>
                    <select
                      className={styles.input}
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    >
                      <option value="">All Subjects</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Exam Date</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={formData.examDate}
                    onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnAction}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Save Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
