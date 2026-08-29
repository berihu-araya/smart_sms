'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  HiCheckBadge,
  HiClock,
  HiTrash,
  HiArrowPath,
  HiClipboardDocumentList,
  HiAcademicCap,
  HiDocumentText,
  HiSparkles,
  HiCalendar,
  HiTag,
  HiXMark,
} from 'react-icons/hi2';

const EXAM_TYPE_PRESETS = [
  {
    type: 'MIDTERM',
    title: 'Midterm Exam',
    icon: '📑',
    defaultWeight: 30,
    defaultMax: 100,
    desc: 'Formal mid-semester evaluation',
    color: '#f59e0b',
    bg: '#fef3c7',
  },
  {
    type: 'FINAL',
    title: 'Final Exam',
    icon: '📝',
    defaultWeight: 50,
    defaultMax: 100,
    desc: 'Summative semester terminal assessment',
    color: '#4f46e5',
    bg: '#e0e7ff',
  },
  {
    type: 'QUIZ',
    title: 'Quiz / Test',
    icon: '⚡',
    defaultWeight: 10,
    defaultMax: 20,
    desc: 'Short continuous assessment quiz',
    color: '#10b981',
    bg: '#d1fae5',
  },
  {
    type: 'ASSIGNMENT',
    title: 'Assignment / Homework',
    icon: '📚',
    defaultWeight: 10,
    defaultMax: 50,
    desc: 'Take-home coursework or essay',
    color: '#8b5cf6',
    bg: '#ede9fe',
  },
  {
    type: 'PROJECT',
    title: 'Project / Lab',
    icon: '🔬',
    defaultWeight: 15,
    defaultMax: 50,
    desc: 'Practical experiment or team project',
    color: '#06b6d4',
    bg: '#cffafe',
  },
];

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
    examType: 'MIDTERM',
    weightPercentage: 30,
    maxMarks: 100,
    examDate: new Date().toISOString().split('T')[0],
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

  // Smart Type Selector: Auto-populates recommended weights and max marks
  const handleSelectExamType = (preset) => {
    setFormData((prev) => ({
      ...prev,
      examType: preset.type,
      weightPercentage: preset.defaultWeight,
      maxMarks: preset.defaultMax,
      title: prev.title || `${preset.title} - ${prev.termOrSemester}`,
    }));
  };

  const handleQuickTitle = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      title: `${suggestion} (${prev.termOrSemester})`,
    }));
  };

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
        examType: 'MIDTERM',
        weightPercentage: 30,
        maxMarks: 100,
        examDate: new Date().toISOString().split('T')[0],
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
    if (!confirm('Are you sure you want to delete this examination cycle?')) return;
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
      case 'PROJECT':
        return styles.badgeProject;
      default:
        return styles.badgeAssignment;
    }
  };

  // KPIs
  const totalExams = exams.length;
  const publishedCount = exams.filter((e) => e.is_published).length;
  const totalMarksCount = exams.reduce((acc, curr) => acc + Number(curr.marks_entered_count || 0), 0);

  // Selected names for live preview
  const selectedGradeObj = grades.find((g) => g.id === formData.gradeId);
  const selectedSubjectObj = subjects.find((s) => s.id === formData.subjectId);
  const selectedTypeObj = EXAM_TYPE_PRESETS.find((p) => p.type === formData.examType) || EXAM_TYPE_PRESETS[0];

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Examinations & Assessments</h1>
          <p className={styles.subtitle}>
            Plan assessment cycles, configure grading weights, and streamline marks entry.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/marks" className={styles.btnSecondary}>
            <HiClipboardDocumentList size={18} />
            Enter Student Marks
          </Link>
          <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
            <HiPlus size={18} />
            Create New Exam
          </button>
        </div>
      </div>

      {/* Analytics KPI Bar */}
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

      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Filter Bar */}
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
          <option value="">All Academic Sessions</option>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name} {y.is_active ? '(Active)' : ''}
            </option>
          ))}
        </select>

        <button className={styles.btnAction} onClick={loadExamsList} title="Refresh">
          <HiArrowPath size={16} />
        </button>
      </div>

      {/* Exams Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading examination schedules...</div>
        ) : exams.length === 0 ? (
          <div className={styles.emptyState}>
            <HiAcademicCap className={styles.emptyIcon} />
            <h3>No Examinations Found</h3>
            <p>Get started by scheduling your first midterm, quiz, or final examination.</p>
            <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)} style={{ marginTop: '1rem' }}>
              <HiPlus size={16} /> Create First Exam
            </button>
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
                <th>Marks Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((ex) => (
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
                    <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                      {ex.exam_date || 'TBD'}
                    </div>
                  </td>
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
                  <td>
                    <div className={styles.actions}>
                      <Link
                        href={`/dashboard/marks?examId=${ex.id}`}
                        className={styles.btnEnterMarks}
                        title="Enter Marks"
                      >
                        Enter Marks ➔
                      </Link>
                      <button
                        className={styles.btnAction}
                        onClick={() => handleTogglePublish(ex.id, ex.is_published)}
                        title={ex.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {ex.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        className={`${styles.btnAction} ${styles.btnDelete}`}
                        onClick={() => handleDeleteExam(ex.id)}
                        title="Delete Exam"
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

      {/* ================= SMART & ATTRACTIVE CREATE MODAL ================= */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Schedule Assessment Cycle</h2>
                <p className={styles.modalSubtitle}>
                  Choose an assessment preset or customize weights, terms, and maximum marks.
                </p>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setIsModalOpen(false)}
              >
                <HiXMark />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className={styles.modalBody}>
                {/* 1. Assessment Type Presets */}
                <div>
                  <label className={styles.label}>
                    <HiSparkles style={{ color: '#f59e0b' }} /> Select Assessment Type Preset:
                  </label>
                  <div className={styles.presetGrid}>
                    {EXAM_TYPE_PRESETS.map((preset) => {
                      const isSelected = formData.examType === preset.type;
                      return (
                        <div
                          key={preset.type}
                          className={`${styles.presetCard} ${isSelected ? styles.presetActive : ''}`}
                          onClick={() => handleSelectExamType(preset)}
                        >
                          <div className={styles.presetIcon}>{preset.icon}</div>
                          <div className={styles.presetTitle}>{preset.title}</div>
                          <div className={styles.presetDesc}>{preset.desc}</div>
                          <div className={styles.presetBadge}>
                            {preset.defaultWeight}% Weight • {preset.defaultMax} Max
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Live Dynamic Preview Card */}
                <div className={styles.previewContainer}>
                  <div className={styles.previewHeader}>
                    <span>Live Exam Preview</span>
                    <span className={`${styles.badge} ${getBadgeClass(formData.examType)}`}>
                      {formData.examType}
                    </span>
                  </div>
                  <div className={styles.previewTitle}>
                    {formData.title || 'Untitled Assessment'}
                  </div>
                  <div className={styles.previewMeta}>
                    <span>
                      <HiCalendar /> {formData.examDate || 'Date: TBD'}
                    </span>
                    <span>
                      <HiTag /> {formData.termOrSemester}
                    </span>
                    <span>
                      <HiAcademicCap /> {selectedGradeObj?.name || 'All Grade Levels'}
                    </span>
                    <span>
                      📚 {selectedSubjectObj ? `${selectedSubjectObj.subject_name || selectedSubjectObj.name}` : 'All Subjects'}
                    </span>
                    <span>
                      ⚖️ <strong>{formData.weightPercentage}%</strong> Weight
                    </span>
                    <span>
                      🎯 <strong>{formData.maxMarks}</strong> Max Points
                    </span>
                  </div>
                </div>

                {/* 3. Title & Quick Presets */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Exam Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midterm Assessment Examination 2026"
                    className={styles.input}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <div className={styles.quickTitleRow}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      Quick Suggestions:
                    </span>
                    {['Midterm Exam', 'Final Examination', 'Quiz 1', 'Assignment 1', 'Lab Test'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={styles.quickTag}
                        onClick={() => handleQuickTitle(t)}
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Term, Weight & Max Marks */}
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Term / Semester *</label>
                    <select
                      className={styles.input}
                      value={formData.termOrSemester}
                      onChange={(e) => setFormData({ ...formData, termOrSemester: e.target.value })}
                    >
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                      <option value="Quarter 1">Quarter 1</option>
                      <option value="Quarter 2">Quarter 2</option>
                    </select>
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

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Maximum Marks (Points) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="1000"
                      className={styles.input}
                      value={formData.maxMarks}
                      onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Assessment Weight (% toward Final Grade) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      className={styles.input}
                      value={formData.weightPercentage}
                      onChange={(e) => setFormData({ ...formData, weightPercentage: e.target.value })}
                    />
                  </div>
                </div>

                {/* 5. Grade & Subject Target */}
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Target Grade Level (Optional)</label>
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
                    <label className={styles.label}>Target Subject (Optional)</label>
                    <select
                      className={styles.input}
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    >
                      <option value="">All Subjects</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject_name || s.name} ({s.subject_code || s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Academic Year & Publication */}
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Academic Session</label>
                    <select
                      className={styles.input}
                      value={formData.academicYearId}
                      onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} {y.is_active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Status on Creation</label>
                    <select
                      className={styles.input}
                      value={formData.isPublished ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.value === 'true' })}
                    >
                      <option value="true">Published (Visible to Teachers & Marks Entry)</option>
                      <option value="false">Draft Mode (Hidden)</option>
                    </select>
                  </div>
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
                  <HiSparkles /> {submitting ? 'Saving Assessment...' : 'Schedule & Save Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
