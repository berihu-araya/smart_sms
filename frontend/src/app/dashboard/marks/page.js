'use strict';
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { getMarksSheet, saveBatchMarks } from '@/services/markService';
import { listExams } from '@/services/examService';
import { listSubjects } from '@/services/subjectService';
import { listSections } from '@/services/sectionService';
import {
  HiDocumentText,
  HiCheckCircle,
  HiClipboardDocumentList,
  HiAcademicCap,
  HiSparkles,
} from 'react-icons/hi2';

function MarksEntryContent() {
  const searchParams = useSearchParams();
  const initialExamId = searchParams.get('examId') || '';

  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedExam, setSelectedExam] = useState(initialExamId);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [sheetData, setSheetData] = useState(null);
  const [marksList, setMarksList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Load dropdown filters
  useEffect(() => {
    async function loadMeta() {
      try {
        const [eRes, subRes, secRes] = await Promise.all([
          listExams({ limit: 100 }).catch(() => []),
          listSubjects({ limit: 100 }).catch(() => ({ items: [] })),
          listSections({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        const examItems = eRes || [];
        const subjectItems = subRes?.items || subRes?.data?.items || [];
        const sectionItems = secRes?.items || secRes?.data?.items || [];

        setExams(examItems);
        setSubjects(subjectItems);
        setSections(sectionItems);

        if (initialExamId) {
          setSelectedExam(initialExamId);
        } else if (examItems.length > 0) {
          setSelectedExam(examItems[0].id);
        }

        if (subjectItems.length > 0) setSelectedSubject(subjectItems[0].id);
        if (sectionItems.length > 0) setSelectedSection(sectionItems[0].id);
      } catch (err) {
        console.error('Failed to load marks entry metadata:', err);
      }
    }
    loadMeta();
  }, [initialExamId]);

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
        score: s.score || 0,
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

  useEffect(() => {
    if (selectedExam && selectedSubject && selectedSection) {
      loadMarksSheet();
    }
  }, [selectedExam, selectedSubject, selectedSection, loadMarksSheet]);

  const handleScoreChange = (studentId, value) => {
    const num = Number(value);
    setMarksList((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? { ...item, score: isNaN(num) ? '' : num }
          : item
      )
    );
  };

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

  const handleSaveMarks = async () => {
    if (!selectedExam || !selectedSubject || !selectedSection || marksList.length === 0) return;

    const maxAllowed = sheetData?.exam?.maxMarks || 100;
    const hasInvalidScore = marksList.some((m) => !m.isAbsent && (m.score < 0 || m.score > maxAllowed));

    if (hasInvalidScore) {
      setError(`Some scores are out of bounds. Must be between 0 and ${maxAllowed}.`);
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
          score: Number(m.score || 0),
          isAbsent: m.isAbsent,
          remarks: m.remarks,
        })),
      });

      setMessage('All student marks have been saved and calculated!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save batch marks');
    } finally {
      setSaving(false);
    }
  };

  const maxMarks = sheetData?.exam?.maxMarks || 100;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Marks & Assessment Entry</h1>
          <p className={styles.subtitle}>
            Enter exam scores, continuous assessments, and grade evaluations in batch mode.
          </p>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}>{message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      {/* Filter Row */}
      <div className={styles.filterCard}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Examination Assessment *</label>
          <select
            className={styles.select}
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.term_or_semester} • {ex.max_marks} pts • {ex.weight_percentage}%)
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Subject *</label>
          <select
            className={styles.select}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.subject_name || sub.name} ({sub.subject_code || sub.code})
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
          >
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            className={styles.btnPrimary}
            onClick={loadMarksSheet}
            disabled={loading || !selectedExam || !selectedSubject || !selectedSection}
          >
            <HiDocumentText size={18} />
            {loading ? 'Loading...' : 'Refresh Sheet'}
          </button>
        </div>
      </div>

      {sheetData?.exam && (
        <div className={styles.examBanner}>
          <div>
            <h3>{sheetData.exam.title}</h3>
            <p>
              Type: <strong>{sheetData.exam.examType}</strong> | Weight in Final Grade: <strong>{sheetData.exam.weightPercentage}%</strong>
            </p>
          </div>
          <div className={styles.maxBadge}>
            Maximum Score: {sheetData.exam.maxMarks} Points
          </div>
        </div>
      )}

      {/* Marks Sheet Table */}
      <div className={styles.sheetCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading marks spreadsheet...</div>
        ) : marksList.length === 0 ? (
          <div className={styles.emptyState}>
            <HiAcademicCap className={styles.emptyIcon} />
            <h3>No Students in Selected Section</h3>
            <p>Select an exam, subject, and active section above to begin recording scores.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Student Details</th>
                  <th>Gender</th>
                  <th>Absent?</th>
                  <th>Score (Max {maxMarks})</th>
                  <th>Remarks / Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {marksList.map((row, idx) => {
                  const isInvalid = !row.isAbsent && (row.score < 0 || row.score > maxMarks);
                  return (
                    <tr key={row.studentId}>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{row.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          ID: {row.admissionNumber}
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize', color: '#475569' }}>
                        {row.gender || '-'}
                      </td>
                      <td>
                        <label className={styles.absentToggle}>
                          <input
                            type="checkbox"
                            checked={row.isAbsent}
                            onChange={(e) => handleAbsentToggle(row.studentId, e.target.checked)}
                          />
                          Absent
                        </label>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={maxMarks}
                          disabled={row.isAbsent}
                          className={`${styles.scoreInput} ${isInvalid ? styles.invalid : ''}`}
                          value={row.isAbsent ? '' : row.score}
                          placeholder={row.isAbsent ? 'ABS' : '0'}
                          onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Remark / comment..."
                          className={styles.remarksInput}
                          value={row.remarks}
                          onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
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
            <button
              className={styles.btnPrimary}
              onClick={handleSaveMarks}
              disabled={saving}
            >
              <HiCheckCircle size={18} />
              {saving ? 'Submitting...' : 'Save & Calculate Marks'}
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
