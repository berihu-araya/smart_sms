'use strict';
'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { getMarksSheet, saveBatchMarks } from '@/services/markService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import { listSubjects } from '@/services/subjectService';
import { listGradeSubjects } from '@/services/gradeSubjectService';
import { listExams } from '@/services/examService';
import {
  HiDocumentText,
  HiCheckCircle,
  HiAcademicCap,
  HiClipboardDocumentList,
  HiSparkles,
  HiArrowPath,
  HiArrowDown,
  HiArrowUp,
  HiCheck,
  HiXMark,
} from 'react-icons/hi2';

function MarksEntryContent() {
  const searchParams = useSearchParams();
  const urlExamId = searchParams.get('examId') || '';

  // Cascading Selection Hierarchy: Grade -> Section -> Subject -> Exam
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);

  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExam, setSelectedExam] = useState(urlExamId);

  // Roster & Entry State
  const [sheetData, setSheetData] = useState(null);
  const [marksList, setMarksList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Input refs for rapid keyboard navigation (Enter / Down / Up)
  const inputRefs = useRef({});

  // 1. Initial Load: Grades and grade-scoped exams
  useEffect(() => {
    async function loadInitial() {
      try {
        const gRes = await listGrades({ limit: 100 }).catch(() => ({ items: [] }));
        const gradeItems = gRes?.items || gRes?.data?.items || [];

        setGrades(gradeItems);

        if (gradeItems.length > 0) {
          setSelectedGrade((current) => current || gradeItems[0].id);
        }
      } catch (err) {
        console.error('Failed to load grades:', err);
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    async function loadExamsForGrade() {
      if (!selectedGrade) {
        setExams([]);
        setSelectedExam('');
        return;
      }

      try {
        const eRes = await listExams({ gradeId: selectedGrade, limit: 100 }).catch(() => []);
        const examItems = eRes || [];

        setExams(examItems);

        if (urlExamId && examItems.some((exam) => exam.id === urlExamId)) {
          setSelectedExam(urlExamId);
          return;
        }

        setSelectedExam(examItems[0]?.id || '');
      } catch (err) {
        console.error('Failed to load exams for grade:', err);
        setExams([]);
        setSelectedExam('');
      }
    }

    loadExamsForGrade();
  }, [selectedGrade, urlExamId]);

  // 2. When Grade Changes: Load Sections and Grade-specific Subjects
  useEffect(() => {
    if (!selectedGrade) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    async function loadSectionsAndSubjects() {
      try {
        const [secRes, gsRes, allSubRes] = await Promise.all([
          listSections({ gradeId: selectedGrade, limit: 100 }).catch(() => ({ items: [] })),
          listGradeSubjects({ grade_id: selectedGrade, limit: 100 }).catch(() => ({ items: [] })),
          listSubjects({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        const sectionItems = secRes?.items || secRes?.data?.items || [];
        const gsItems = gsRes?.items || gsRes?.data?.items || [];
        const allSubjects = allSubRes?.items || allSubRes?.data?.items || [];

        setSections(sectionItems);
        if (sectionItems.length > 0) {
          setSelectedSection(sectionItems[0].id);
        } else {
          setSelectedSection('');
        }

        // Use grade-specific subjects if mapped, otherwise fallback to all subjects
        let availableSubjects = [];
        if (gsItems.length > 0) {
          availableSubjects = gsItems.map((gs) => ({
            id: gs.subject_id || gs.subject?.id,
            subject_name: gs.subject_name || gs.subject?.subject_name || gs.name,
            subject_code: gs.subject_code || gs.subject?.subject_code || gs.code,
          }));
        } else {
          availableSubjects = allSubjects;
        }

        setSubjects(availableSubjects);
        if (availableSubjects.length > 0) {
          setSelectedSubject(availableSubjects[0].id);
        } else {
          setSelectedSubject('');
        }
      } catch (err) {
        console.error('Failed to load sections and subjects for grade:', err);
      }
    }

    loadSectionsAndSubjects();
  }, [selectedGrade]);

  // 3. Load Marks Sheet Roster for the Selected Hierarchy
  const loadMarksSheet = useCallback(async () => {
    if (!selectedExam || !selectedSubject || !selectedSection) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await getMarksSheet({
        examId: selectedExam,
        subjectId: selectedSubject,
        sectionId: selectedSection,
      });

      setSheetData(data);
      const rows = (data?.students || []).map((s) => ({
        studentId: s.student_id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        gender: s.gender,
        score: s.score !== null && s.score !== undefined ? Number(s.score) : '',
        isAbsent: Boolean(s.is_absent),
        remarks: s.remarks || '',
      }));
      setMarksList(rows);
    } catch (err) {
      setError(err.message || 'Failed to load marks sheet');
      setSheetData(null);
      setMarksList([]);
    } finally {
      setLoading(false);
    }
  }, [selectedExam, selectedSubject, selectedSection]);

  // Auto-fetch whenever the complete hierarchy is selected
  useEffect(() => {
    if (selectedExam && selectedSubject && selectedSection) {
      loadMarksSheet();
    }
  }, [selectedExam, selectedSubject, selectedSection, loadMarksSheet]);

  const maxMarks = sheetData?.exam?.maxMarks || 100;

  // Handle Score Input
  const handleScoreChange = (studentId, value) => {
    if (value === '') {
      setMarksList((prev) =>
        prev.map((item) => (item.studentId === studentId ? { ...item, score: '' } : item))
      );
      return;
    }

    const num = Number(value);
    setMarksList((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? { ...item, score: isNaN(num) ? '' : num }
          : item
      )
    );
  };

  // Absent Toggle (auto-clears score and disables input)
  const handleAbsentToggle = (studentId, isAbsent) => {
    setMarksList((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? { ...item, isAbsent, score: isAbsent ? 0 : item.score }
          : item
      )
    );
  };

  const handleRemarksChange = (studentId, remarks) => {
    setMarksList((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, remarks } : item
      )
    );
  };

  // Keyboard navigation: Enter or Down Arrow moves to the next student row
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
        inputRefs.current[nextIndex].select?.();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = index - 1;
      if (inputRefs.current[prevIndex]) {
        inputRefs.current[prevIndex].focus();
        inputRefs.current[prevIndex].select?.();
      }
    }
  };

  // Bulk Quick Actions
  const handleFillAllMax = () => {
    if (!confirm(`Set score to maximum (${maxMarks}) for all non-absent students?`)) return;
    setMarksList((prev) =>
      prev.map((item) => (item.isAbsent ? item : { ...item, score: maxMarks }))
    );
  };

  const handleClearAllScores = () => {
    if (!confirm('Clear all entered scores for this class?')) return;
    setMarksList((prev) =>
      prev.map((item) => ({ ...item, score: '', isAbsent: false, remarks: '' }))
    );
  };

  // Save Batch Marks
  const handleSaveMarks = async () => {
    if (!selectedExam || !selectedSubject || !selectedSection || marksList.length === 0) return;

    const hasInvalidScore = marksList.some(
      (m) => !m.isAbsent && m.score !== '' && (m.score < 0 || m.score > maxMarks)
    );

    if (hasInvalidScore) {
      setError(`Some scores exceed boundaries. All scores must be between 0 and ${maxMarks}.`);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveBatchMarks({
        examId: selectedExam,
        subjectId: selectedSubject,
        sectionId: selectedSection,
        marks: marksList.map((m) => ({
          studentId: m.studentId,
          score: m.isAbsent ? 0 : Number(m.score || 0),
          isAbsent: m.isAbsent,
          remarks: m.remarks,
        })),
      });

      setMessage(`Marks successfully saved for ${marksList.length} students!`);
      setTimeout(() => setMessage(null), 4500);
    } catch (err) {
      setError(err.message || 'Failed to save batch marks');
    } finally {
      setSaving(false);
    }
  };

  // Calculate live helper grade for display
  const getLiveGradeBadge = (score, isAbsent) => {
    if (isAbsent) return { label: 'ABS', cls: styles.badgeAbsent };
    if (score === '' || score === null || score === undefined) return { label: '—', cls: styles.badgeEmpty };

    const percentage = (Number(score) / maxMarks) * 100;
    if (percentage >= 80) return { label: `${Math.round(percentage)}% (A)`, cls: styles.badgeA };
    if (percentage >= 70) return { label: `${Math.round(percentage)}% (B)`, cls: styles.badgeB };
    if (percentage >= 60) return { label: `${Math.round(percentage)}% (C)`, cls: styles.badgeC };
    if (percentage >= 50) return { label: `${Math.round(percentage)}% (D)`, cls: styles.badgeD };
    return { label: `${Math.round(percentage)}% (F)`, cls: styles.badgeF };
  };

  // KPIs
  const enteredCount = marksList.filter((m) => m.isAbsent || m.score !== '').length;
  const absentCount = marksList.filter((m) => m.isAbsent).length;
  const totalCount = marksList.length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Teacher Marks & Evaluation Entry</h1>
          <p className={styles.subtitle}>
            Select <strong>Grade ➔ Section ➔ Subject ➔ Examination</strong> to record and grade student assessments.
          </p>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}><HiCheck /> {message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}><HiXMark /> {error}</div>}

      {/* ================= CASCADING ACADEMIC SELECTOR ================= */}
      <div className={styles.cascadeCard}>
        <div className={styles.stepHeader}>
          <div className={styles.stepTitle}>
            <HiSparkles style={{ color: '#2563eb' }} /> Select Target Academic Class & Assessment:
          </div>
          <button
            className={styles.btnRefresh}
            onClick={loadMarksSheet}
            disabled={loading || !selectedExam || !selectedSubject || !selectedSection}
            title="Refresh Roster"
          >
            <HiArrowPath size={16} /> Refresh
          </button>
        </div>

        <div className={styles.cascadeGrid}>
          {/* Step 1: Grade Level */}
          <div className={styles.selectorGroup}>
            <label className={styles.selectorLabel}>
              <span className={styles.stepNum}>1</span> Grade Level *
            </label>
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

          {/* Step 2: Class Section */}
          <div className={styles.selectorGroup}>
            <label className={styles.selectorLabel}>
              <span className={styles.stepNum}>2</span> Class Section *
            </label>
            <select
              className={styles.select}
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={sections.length === 0}
            >
              {sections.length === 0 ? (
                <option value="">No sections in grade</option>
              ) : (
                sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} {sec.room_number ? `(${sec.room_number})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Step 3: Subject */}
          <div className={styles.selectorGroup}>
            <label className={styles.selectorLabel}>
              <span className={styles.stepNum}>3</span> Subject *
            </label>
            <select
              className={styles.select}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={subjects.length === 0}
            >
              {subjects.length === 0 ? (
                <option value="">No subjects found</option>
              ) : (
                subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subject_name || sub.name} ({sub.subject_code || sub.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Step 4: Examination */}
          <div className={styles.selectorGroup}>
            <label className={styles.selectorLabel}>
              <span className={styles.stepNum}>4</span> Examination / Assessment *
            </label>
            <select
              className={styles.select}
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              disabled={exams.length === 0}
            >
              {exams.length === 0 ? (
                <option value="">No active exams scheduled</option>
              ) : (
                exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.term_or_semester} • {ex.max_marks} pts • {ex.weight_percentage}% wt)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ================= EXAM CONTEXT & SUMMARY BANNER ================= */}
      {sheetData?.exam && (
        <div className={styles.examBanner}>
          <div className={styles.examBannerLeft}>
            <div className={styles.examBannerTitle}>{sheetData.exam.title}</div>
            <div className={styles.examBannerMeta}>
              <span>Type: <strong>{sheetData.exam.examType}</strong></span>
              <span>•</span>
              <span>Weight: <strong>{sheetData.exam.weightPercentage}%</strong> of Total Grade</span>
              <span>•</span>
              <span>Max Possible Score: <strong>{sheetData.exam.maxMarks} Points</strong></span>
            </div>
          </div>

          <div className={styles.examBannerRight}>
            <div className={styles.statPill}>
              <span>Progress:</span>
              <strong>{enteredCount} / {totalCount} Recorded</strong>
            </div>
            {absentCount > 0 && (
              <div className={`${styles.statPill} ${styles.statAbsent}`}>
                <strong>{absentCount} Absent</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MARKS SPREADSHEET CARD ================= */}
      <div className={styles.sheetCard}>
        {/* Sheet Top Actions */}
        <div className={styles.sheetHeader}>
          <div className={styles.sheetHeaderTitle}>
            Student Roster Score Sheet ({marksList.length} Students)
          </div>

          {marksList.length > 0 && (
            <div className={styles.quickTools}>
              <span className={styles.keyboardHint}>
                💡 <strong>Tip:</strong> Press <strong>Enter</strong> or <strong>↓/↑</strong> to jump between rows quickly!
              </span>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleFillAllMax}
                disabled={loading}
              >
                Set All Full Marks ({maxMarks})
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleClearAllScores}
                disabled={loading}
              >
                Clear All
              </button>
              <button
                type="button"
                className={styles.btnSave}
                onClick={handleSaveMarks}
                disabled={saving || loading}
              >
                <HiCheckCircle size={18} />
                {saving ? 'Saving Records...' : 'Save & Calculate Marks'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading class score spreadsheet...</div>
        ) : marksList.length === 0 ? (
          <div className={styles.emptyState}>
            <HiAcademicCap className={styles.emptyIcon} />
            <h3>No Students in Selected Class</h3>
            <p>Select a grade, section, subject, and examination cycle above to load the student list.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Student Info</th>
                  <th>Gender</th>
                  <th style={{ width: '110px' }}>Absent?</th>
                  <th style={{ width: '180px' }}>Score (Max {maxMarks})</th>
                  <th style={{ width: '120px' }}>Live % Grade</th>
                  <th>Teacher Remarks / Observations</th>
                </tr>
              </thead>
              <tbody>
                {marksList.map((row, idx) => {
                  const isInvalid =
                    !row.isAbsent &&
                    row.score !== '' &&
                    (Number(row.score) < 0 || Number(row.score) > maxMarks);

                  const liveGrade = getLiveGradeBadge(row.score, row.isAbsent);

                  return (
                    <tr key={row.studentId}>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div className={styles.studentName}>{row.name}</div>
                        <div className={styles.studentId}>ID: {row.admissionNumber}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize', color: '#475569', fontSize: '0.85rem' }}>
                        {row.gender || '—'}
                      </td>
                      <td>
                        <label className={styles.absentToggle}>
                          <input
                            type="checkbox"
                            checked={row.isAbsent}
                            onChange={(e) => handleAbsentToggle(row.studentId, e.target.checked)}
                          />
                          <span style={{ color: row.isAbsent ? '#dc2626' : '#64748b' }}>
                            {row.isAbsent ? 'Absent' : 'Present'}
                          </span>
                        </label>
                      </td>
                      <td>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            ref={(el) => (inputRefs.current[idx] = el)}
                            type="number"
                            step="0.5"
                            min="0"
                            max={maxMarks}
                            disabled={row.isAbsent}
                            className={`${styles.scoreInput} ${isInvalid ? styles.invalid : ''}`}
                            value={row.isAbsent ? '' : row.score}
                            placeholder={row.isAbsent ? 'ABS' : '0.0'}
                            onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                          />
                          <span className={styles.maxMarksSuffix}>/ {maxMarks}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.liveBadge} ${liveGrade.cls}`}>
                          {liveGrade.label}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Optional feedback..."
                          className={styles.remarksInput}
                          value={row.remarks}
                          onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {marksList.length > 0 && (
          <div className={styles.footerActions}>
            <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
              Recording marks for <strong>{marksList.length}</strong> students.
            </div>
            <button
              className={styles.btnSave}
              onClick={handleSaveMarks}
              disabled={saving || loading}
            >
              <HiCheckCircle size={18} />
              {saving ? 'Saving...' : 'Save & Calculate All Marks'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarksEntryPage() {
  return (
    <Suspense fallback={<div className={styles.emptyState}>Loading Marks Entry...</div>}>
      <MarksEntryContent />
    </Suspense>
  );
}
