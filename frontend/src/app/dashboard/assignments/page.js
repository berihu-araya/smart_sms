'use strict';
'use client';

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import styles from './page.module.css';
import { AuthContext } from '@/context/AuthContext';
import {
  listAssignments,
  getAssignmentStats,
  createAssignment,
  updateAssignment,
  toggleAssignmentStatus,
  deleteAssignment,
  listSubmissions,
  submitAssignment,
  gradeSubmission,
} from '@/services/assignmentService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import { listSubjects } from '@/services/subjectService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  HiPlus,
  HiMagnifyingGlass,
  HiCheckBadge,
  HiClock,
  HiTrash,
  HiPencilSquare,
  HiDocumentCheck,
  HiDocumentText,
  HiAcademicCap,
  HiSparkles,
  HiCalendar,
  HiTag,
  HiXMark,
  HiArrowPath,
  HiArrowDownTray,
  HiEye,
  HiPaperAirplane,
  HiFolderArrowDown,
  HiInformationCircle,
  HiCheckCircle,
  HiExclamationTriangle,
  HiUserGroup,
  HiChartBar,
  HiSquares2X2,
  HiListBullet,
} from 'react-icons/hi2';

export default function AssignmentsPage() {
  const { user } = useContext(AuthContext);

  // Determine user roles
  const userRole = (user?.role || user?.role_name || '').toLowerCase();
  const isStudent = userRole.includes('student');
  const isTeacher = userRole.includes('teacher') && !userRole.includes('admin');
  const isParent = userRole.includes('parent');
  const isAdminOrStaff = userRole.includes('admin') || userRole.includes('staff');

  // View Mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid');

  // Core data states
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({});
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeTab, setActiveTab] = useState(isStudent ? 'TODO' : 'ALL'); // For student: TODO vs COMPLETED

  // UI & Loading states
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submittingAssignmentForm, setSubmittingAssignmentForm] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Submissions Roster Drawer (Teacher/Admin view)
  const [activeAssignmentForRoster, setActiveAssignmentForRoster] = useState(null);
  const [rosterData, setRosterData] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterStatusFilter, setRosterStatusFilter] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');

  // Grading Modal / State
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Student Submission Workspace Modal
  const [activeAssignmentForSubmission, setActiveAssignmentForSubmission] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionAttachmentUrl, setSubmissionAttachmentUrl] = useState('');
  const [submissionAttachments, setSubmissionAttachments] = useState([]);
  const [submittingStudentWork, setSubmittingStudentWork] = useState(false);

  // Assignment Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    gradeId: '',
    sectionId: '',
    subjectId: '',
    academicYearId: '',
    dueDate: '',
    maxMarks: 100,
    passMarks: 50,
    allowLateSubmissions: true,
    submissionType: 'ONLINE_TEXT_AND_FILE',
    status: 'PUBLISHED',
    attachmentUrls: [],
  });

  const [newAttachmentTitle, setNewAttachmentTitle] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  // Load lookup data on mount
  useEffect(() => {
    async function loadLookups() {
      try {
        const [gradesRes, sectionsRes, subjectsRes, yearsRes] = await Promise.all([
          listGrades({ limit: 100 }).catch(() => ({ items: [] })),
          listSections({ limit: 100 }).catch(() => ({ items: [] })),
          listSubjects({ limit: 100 }).catch(() => ({ items: [] })),
          listAcademicYears({ limit: 50 }).catch(() => ({ items: [] })),
        ]);

        const gItems = gradesRes?.items || gradesRes || [];
        const secItems = sectionsRes?.items || sectionsRes || [];
        const subItems = subjectsRes?.items || subjectsRes || [];
        const yrItems = yearsRes?.items || yearsRes || [];

        setGrades(Array.isArray(gItems) ? gItems : []);
        setSections(Array.isArray(secItems) ? secItems : []);
        setSubjects(Array.isArray(subItems) ? subItems : []);
        setAcademicYears(Array.isArray(yrItems) ? yrItems : []);

        // Default to active year if available
        const activeYr = yrItems.find?.((y) => y.is_active || y.status === 'ACTIVE');
        if (activeYr) {
          setSelectedYear(activeYr.id);
        }
      } catch (err) {
        console.warn('Failed to load lookup data:', err);
      }
    }

    loadLookups();
  }, []);

  // Filter sections by selected grade
  const availableSections = useMemo(() => {
    if (!selectedGrade && !formData.gradeId) return sections;
    const targetGrade = formData.gradeId || selectedGrade;
    return sections.filter((s) => s.grade_id === targetGrade);
  }, [sections, selectedGrade, formData.gradeId]);

  // Load assignments
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        search: search.trim(),
        gradeId: selectedGrade || undefined,
        sectionId: selectedSection || undefined,
        subjectId: selectedSubject || undefined,
        academicYearId: selectedYear || undefined,
        status: selectedStatus || undefined,
        limit: 100,
      };

      const res = await listAssignments(params);
      setAssignments(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [search, selectedGrade, selectedSection, selectedSubject, selectedYear, selectedStatus]);

  // Load KPI stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsRes = await getAssignmentStats();
      setStats(statsRes || {});
    } catch (err) {
      console.warn('Failed to load assignment stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchStats();
  }, [fetchAssignments, fetchStats]);

  // Clear toast message after 4s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Open Create Modal
  function handleOpenCreateModal() {
    setEditingAssignment(null);
    setFormData({
      title: '',
      description: '',
      gradeId: selectedGrade || (grades[0]?.id || ''),
      sectionId: '',
      subjectId: selectedSubject || (subjects[0]?.id || ''),
      academicYearId: selectedYear || (academicYears[0]?.id || ''),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      maxMarks: 100,
      passMarks: 50,
      allowLateSubmissions: true,
      submissionType: 'ONLINE_TEXT_AND_FILE',
      status: 'PUBLISHED',
      attachmentUrls: [],
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  }

  // Open Edit Modal
  function handleOpenEditModal(assignment) {
    setEditingAssignment(assignment);
    const dueDateFormatted = assignment.due_date
      ? new Date(assignment.due_date).toISOString().slice(0, 16)
      : '';

    let attachments = assignment.attachment_urls || [];
    if (typeof attachments === 'string') {
      try {
        attachments = JSON.parse(attachments);
      } catch {
        attachments = [];
      }
    }

    setFormData({
      title: assignment.title || '',
      description: assignment.description || '',
      gradeId: assignment.grade_id || '',
      sectionId: assignment.section_id || '',
      subjectId: assignment.subject_id || '',
      academicYearId: assignment.academic_year_id || '',
      dueDate: dueDateFormatted,
      maxMarks: Number(assignment.max_marks || 100),
      passMarks: Number(assignment.pass_marks || 50),
      allowLateSubmissions: assignment.allow_late_submissions !== false,
      submissionType: assignment.submission_type || 'ONLINE_TEXT_AND_FILE',
      status: assignment.status || 'PUBLISHED',
      attachmentUrls: attachments,
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  }

  // Handle Attachment Add
  function handleAddAttachment() {
    if (!newAttachmentUrl.trim()) return;
    const newItem = {
      title: newAttachmentTitle.trim() || 'Reference Material',
      url: newAttachmentUrl.trim(),
    };
    setFormData((prev) => ({
      ...prev,
      attachmentUrls: [...prev.attachmentUrls, newItem],
    }));
    setNewAttachmentTitle('');
    setNewAttachmentUrl('');
  }

  function handleRemoveAttachment(index) {
    setFormData((prev) => ({
      ...prev,
      attachmentUrls: prev.attachmentUrls.filter((_, i) => i !== index),
    }));
  }

  // Submit Assignment Form (Create / Update)
  async function handleSubmitAssignmentForm(e) {
    e.preventDefault();
    setSubmittingAssignmentForm(true);
    setFormErrors({});

    try {
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, formData);
        setSuccessMessage('Assignment updated successfully');
      } else {
        await createAssignment(formData);
        setSuccessMessage('Assignment created and published successfully');
      }

      setIsCreateModalOpen(false);
      fetchAssignments();
      fetchStats();
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to save assignment' });
    } finally {
      setSubmittingAssignmentForm(false);
    }
  }

  // Toggle Status (Published / Closed)
  async function handleToggleStatus(assignment) {
    const nextStatus = assignment.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    try {
      await toggleAssignmentStatus(assignment.id, nextStatus);
      setSuccessMessage(`Assignment marked as ${nextStatus}`);
      fetchAssignments();
      fetchStats();
    } catch (err) {
      setError(err.message || 'Failed to update assignment status');
    }
  }

  // Delete Assignment
  async function handleDeleteAssignment(id, title) {
    if (!window.confirm(`Are you sure you want to delete assignment "${title}"? This will also remove student submissions.`)) {
      return;
    }

    try {
      await deleteAssignment(id);
      setSuccessMessage('Assignment deleted');
      fetchAssignments();
      fetchStats();
    } catch (err) {
      setError(err.message || 'Failed to delete assignment');
    }
  }

  // --- SUBMISSIONS ROSTER MANAGEMENT (TEACHER / ADMIN) ---
  const fetchRoster = useCallback(async (assignmentId) => {
    setRosterLoading(true);
    try {
      const res = await listSubmissions(assignmentId, {
        status: rosterStatusFilter || undefined,
        search: rosterSearch || undefined,
      });
      setRosterData(res.submissions || []);
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setRosterLoading(false);
    }
  }, [rosterStatusFilter, rosterSearch]);

  function handleOpenRoster(assignment) {
    setActiveAssignmentForRoster(assignment);
    setRosterStatusFilter('');
    setRosterSearch('');
    fetchRoster(assignment.id);
  }

  useEffect(() => {
    if (activeAssignmentForRoster) {
      fetchRoster(activeAssignmentForRoster.id);
    }
  }, [activeAssignmentForRoster, rosterStatusFilter, rosterSearch, fetchRoster]);

  // Open Grading Modal
  function handleOpenGrading(studentEntry) {
    setGradingSubmission(studentEntry);
    setGradeScore(studentEntry.obtained_marks !== null && studentEntry.obtained_marks !== undefined ? String(studentEntry.obtained_marks) : '');
    setGradeFeedback(studentEntry.feedback || '');
  }

  // Save Grade
  async function handleSaveGrade(status = 'GRADED') {
    if (!gradingSubmission?.submission_id) return;
    setSavingGrade(true);

    try {
      await gradeSubmission(gradingSubmission.submission_id, {
        obtainedMarks: Number(gradeScore),
        feedback: gradeFeedback.trim(),
        status,
        maxMarks: activeAssignmentForRoster?.max_marks || 100,
      });

      setSuccessMessage('Grade saved successfully');
      setGradingSubmission(null);
      if (activeAssignmentForRoster) {
        fetchRoster(activeAssignmentForRoster.id);
      }
      fetchAssignments();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to grade submission');
    } finally {
      setSavingGrade(false);
    }
  }

  // Export Roster to CSV
  function handleExportRosterCSV() {
    if (!rosterData || rosterData.length === 0) return;

    const headers = ['Student Name', 'Admission No', 'Section', 'Status', 'Score', 'Max Marks', 'Submitted At', 'Feedback'];
    const rows = rosterData.map((s) => [
      `"${s.first_name} ${s.last_name}"`,
      `"${s.admission_number}"`,
      `"${s.section_name || ''}"`,
      `"${s.submission_status}"`,
      `"${s.obtained_marks ?? 'N/A'}"`,
      `"${activeAssignmentForRoster?.max_marks || 100}"`,
      `"${s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'N/A'}"`,
      `"${(s.feedback || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeAssignmentForRoster?.title || 'Assignment'}_Submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- STUDENT SUBMISSION WORKSPACE ---
  function handleOpenStudentSubmission(assignment) {
    setActiveAssignmentForSubmission(assignment);
    const mySub = assignment.my_submission;
    setSubmissionText(mySub?.submission_text || '');

    let attachments = mySub?.attachment_urls || [];
    if (typeof attachments === 'string') {
      try {
        attachments = JSON.parse(attachments);
      } catch {
        attachments = [];
      }
    }
    setSubmissionAttachments(Array.isArray(attachments) ? attachments : []);
    setSubmissionAttachmentUrl('');
  }

  function handleAddStudentAttachment() {
    if (!submissionAttachmentUrl.trim()) return;
    setSubmissionAttachments((prev) => [...prev, submissionAttachmentUrl.trim()]);
    setSubmissionAttachmentUrl('');
  }

  function handleRemoveStudentAttachment(idx) {
    setSubmissionAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmitStudentWork(isDraft = false) {
    if (!activeAssignmentForSubmission) return;
    setSubmittingStudentWork(true);

    try {
      await submitAssignment(activeAssignmentForSubmission.id, {
        submissionText: submissionText.trim(),
        attachmentUrls: submissionAttachments,
        isDraft,
      });

      setSuccessMessage(isDraft ? 'Draft saved' : 'Homework submitted successfully!');
      setActiveAssignmentForSubmission(null);
      fetchAssignments();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to submit assignment');
    } finally {
      setSubmittingStudentWork(false);
    }
  }

  // Filtered assignments for Student tab
  const displayedAssignments = useMemo(() => {
    if (!isStudent) return assignments;

    if (activeTab === 'TODO') {
      return assignments.filter((a) => {
        const status = a.my_submission?.status;
        return !status || status === 'DRAFT' || status === 'RESUBMIT_REQUESTED';
      });
    } else if (activeTab === 'COMPLETED') {
      return assignments.filter((a) => {
        const status = a.my_submission?.status;
        return status === 'SUBMITTED' || status === 'LATE' || status === 'GRADED';
      });
    }
    return assignments;
  }, [assignments, isStudent, activeTab]);

  // Helper function for deadline badge
  function formatDueDateStatus(dueDateStr) {
    if (!dueDateStr) return { label: 'No Due Date', className: styles.dueNormal };
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return { label: `Overdue (${due.toLocaleDateString()})`, className: styles.dueOverdue };
    }
    if (diffDays === 0) {
      return { label: 'Due Today', className: styles.dueSoon };
    }
    if (diffDays === 1) {
      return { label: 'Due Tomorrow', className: styles.dueSoon };
    }
    if (diffDays <= 3) {
      return { label: `Due in ${diffDays} days`, className: styles.dueSoon };
    }
    return { label: `Due ${due.toLocaleDateString()}`, className: styles.dueNormal };
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <HiAcademicCap style={{ color: '#4f46e5' }} />
            <span>Assignments & Homework</span>
            <span className={styles.roleBadge}>
              {isAdminOrStaff ? 'Admin' : isTeacher ? 'Teacher' : isStudent ? 'Student' : isParent ? 'Parent' : 'Portal'}
            </span>
          </div>
          <p className={styles.subtitle}>
            {isStudent
              ? 'View your homework assignments, submit your coursework, and check teacher feedback.'
              : isParent
              ? 'Monitor your children’s homework, due dates, submission statuses, and grades.'
              : 'Create, assign, collect digital submissions, and evaluate classroom coursework.'}
          </p>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => { fetchAssignments(); fetchStats(); }}>
            <HiArrowPath className={loading ? styles.spinner : ''} />
            Refresh
          </button>

          {(isAdminOrStaff || isTeacher) && (
            <button className={styles.btnPrimary} onClick={handleOpenCreateModal}>
              <HiPlus />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
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

      {/* KPI Stats Ribbon */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIndigo}`}>
            <HiDocumentText />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Assignments</span>
            <span className={styles.kpiValue}>{stats.total_assignments || assignments.length || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiEmerald}`}>
            <HiSparkles />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Active & Upcoming</span>
            <span className={styles.kpiValue}>{stats.active_assignments || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiCyan}`}>
            <HiDocumentCheck />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Submissions Collected</span>
            <span className={styles.kpiValue}>{stats.total_submissions || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiAmber}`}>
            <HiClock />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Pending Evaluation</span>
            <span className={styles.kpiValue}>{stats.pending_grading_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter & View Bar */}
      <div className={styles.filterBar}>
        {/* Student Mode Tabs and View Toggle */}
        <div className={styles.viewTabs}>
          {isStudent ? (
            <div className={styles.tabBtnGroup}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'TODO' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('TODO')}
              >
                <HiClock />
                <span>To-Do / Upcoming</span>
                <span className={styles.tabCount}>
                  {assignments.filter((a) => !a.my_submission?.status || a.my_submission?.status === 'DRAFT' || a.my_submission?.status === 'RESUBMIT_REQUESTED').length}
                </span>
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'COMPLETED' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('COMPLETED')}
              >
                <HiCheckBadge />
                <span>Submitted & Graded</span>
                <span className={styles.tabCount}>
                  {assignments.filter((a) => a.my_submission?.status && a.my_submission?.status !== 'DRAFT' && a.my_submission?.status !== 'RESUBMIT_REQUESTED').length}
                </span>
              </button>
            </div>
          ) : (
            <div className={styles.tabBtnGroup}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                Coursework & Homework ({displayedAssignments.length})
              </span>
            </div>
          )}

          <div className={styles.viewToggleGroup}>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.viewToggleBtnActive : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              <HiSquares2X2 /> Grid
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`}
              onClick={() => setViewMode('list')}
              title="Table List View"
            >
              <HiListBullet /> List
            </button>
          </div>
        </div>

        <div className={styles.searchRow}>
          <div className={styles.searchInputWrapper}>
            <HiMagnifyingGlass className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search assignments by title, description, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterControls}>
            {/* Academic Year */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">All Academic Years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? '★ (Active)' : ''}
                </option>
              ))}
            </select>

            {/* Grade */}
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedSection('');
              }}
              className={styles.selectInput}
            >
              <option value="">All Grades</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {/* Section */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">All Sections</option>
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>

            {/* Subject */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.subject_name}
                </option>
              ))}
            </select>

            {/* Status (For Staff / Teacher) */}
            {!isStudent && (
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.selectInput}
              >
                <option value="">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Assignments Content */}
      {loading ? (
        <div className={styles.loadingBox}>
          <HiArrowPath className={`${styles.spinner}`} style={{ fontSize: '1.8rem' }} />
          <span>Loading assignments...</span>
        </div>
      ) : displayedAssignments.length === 0 ? (
        <div className={styles.emptyState}>
          <HiDocumentText className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No Assignments Found</h3>
          <p className={styles.emptyText}>
            {search || selectedGrade || selectedSubject
              ? 'No assignments match your active search filters.'
              : isStudent
              ? 'You do not have any assignments assigned to your class at the moment.'
              : 'Get started by creating your first homework or coursework assignment.'}
          </p>
          {(isAdminOrStaff || isTeacher) && (
            <button className={styles.btnPrimary} onClick={handleOpenCreateModal}>
              <HiPlus /> Create Assignment
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className={styles.assignmentsGrid}>
          {displayedAssignments.map((a) => {
            const dueInfo = formatDueDateStatus(a.due_date);
            const totalEnrolled = Number(a.total_enrolled_students || 0);
            const subCount = Number(a.submissions_count || 0);
            const gradedCount = Number(a.graded_count || 0);
            const progressPercent = totalEnrolled > 0 ? Math.round((subCount / totalEnrolled) * 100) : 0;

            let parsedAttachments = a.attachment_urls || [];
            if (typeof parsedAttachments === 'string') {
              try {
                parsedAttachments = JSON.parse(parsedAttachments);
              } catch {
                parsedAttachments = [];
              }
            }

            const mySub = a.my_submission;

            return (
              <div key={a.id} className={styles.assignmentCard}>
                <div>
                  <div className={styles.cardHeader}>
                    <span className={styles.subjectBadge}>
                      <HiTag /> {a.subject_name || 'General Subject'}
                    </span>
                    <span
                      className={`${styles.statusPill} ${
                        a.status === 'PUBLISHED'
                          ? styles.statusPublished
                          : a.status === 'DRAFT'
                          ? styles.statusDraft
                          : a.status === 'CLOSED'
                          ? styles.statusClosed
                          : styles.statusArchived
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  <h4 className={styles.cardTitle}>{a.title}</h4>

                  {a.description && <p className={styles.cardDesc}>{a.description}</p>}

                  <div className={styles.metaRow} style={{ marginTop: '0.65rem' }}>
                    <span className={styles.metaItem}>
                      <HiAcademicCap /> {a.grade_name || 'All Grades'} {a.section_name ? `• Sec ${a.section_name}` : ''}
                    </span>
                    <span className={styles.metaItem}>
                      <HiSparkles /> Max {a.max_marks} pts
                    </span>
                    {a.teacher_first_name && (
                      <span className={styles.metaItem}>
                        👨‍🏫 {a.teacher_first_name} {a.teacher_last_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Due Date Indicator */}
                <div className={styles.dueSection}>
                  <span className={styles.dueLabel}>Deadline:</span>
                  <span className={`${styles.dueValue} ${dueInfo.className}`}>
                    <HiClock /> {dueInfo.label}
                  </span>
                </div>

                {/* Teacher Materials Links */}
                {parsedAttachments.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {parsedAttachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.metaItem}
                        style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}
                      >
                        <HiFolderArrowDown /> {att.title || 'Attachment'}
                      </a>
                    ))}
                  </div>
                )}

                {/* Student Personal Submission Banner */}
                {isStudent && (
                  <div className={styles.mySubBanner}>
                    <div>
                      <span className={styles.mySubStatus}>
                        {mySub?.status === 'GRADED' ? (
                          <>
                            <HiCheckCircle /> Graded
                          </>
                        ) : mySub?.status === 'SUBMITTED' || mySub?.status === 'LATE' ? (
                          <>
                            <HiCheckBadge /> {mySub.status === 'LATE' ? 'Submitted Late' : 'Submitted'}
                          </>
                        ) : mySub?.status === 'RESUBMIT_REQUESTED' ? (
                          <>
                            <HiExclamationTriangle style={{ color: '#dc2626' }} /> Resubmission Requested
                          </>
                        ) : (
                          <>
                            <HiClock style={{ color: '#d97706' }} /> Not Submitted Yet
                          </>
                        )}
                      </span>
                    </div>
                    {mySub?.obtained_marks !== null && mySub?.obtained_marks !== undefined && (
                      <span className={styles.mySubScore}>
                        Score: {mySub.obtained_marks} / {a.max_marks}
                      </span>
                    )}
                  </div>
                )}

                {/* Teacher / Admin Submission Progress Bar */}
                {!isStudent && (
                  <div className={styles.progressSection}>
                    <div className={styles.progressMeta}>
                      <span>Submissions: {subCount}/{totalEnrolled} ({progressPercent}%)</span>
                      <span>{gradedCount} Graded</span>
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className={styles.cardFooter}>
                  {isStudent ? (
                    <button
                      className={styles.btnPrimary}
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => handleOpenStudentSubmission(a)}
                    >
                      <HiPaperAirplane />
                      <span>{mySub ? 'View / Update Submission' : 'Submit Homework'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        className={styles.btnPrimary}
                        onClick={() => handleOpenRoster(a)}
                      >
                        <HiUserGroup />
                        <span>Submissions ({subCount})</span>
                      </button>

                      <div className={styles.cardActions}>
                        <button
                          className={styles.btnActionIcon}
                          title="Edit Assignment"
                          onClick={() => handleOpenEditModal(a)}
                        >
                          <HiPencilSquare />
                        </button>

                        <button
                          className={styles.btnActionIcon}
                          title={a.status === 'PUBLISHED' ? 'Close Submissions' : 'Publish Assignment'}
                          onClick={() => handleToggleStatus(a)}
                        >
                          {a.status === 'PUBLISHED' ? <HiClock /> : <HiCheckBadge />}
                        </button>

                        <button
                          className={`${styles.btnActionIcon} ${styles.btnActionIconDanger}`}
                          title="Delete Assignment"
                          onClick={() => handleDeleteAssignment(a.id, a.title)}
                        >
                          <HiTrash />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className={styles.tableViewWrapper}>
          <table className={styles.assignmentsTable}>
            <thead>
              <tr>
                <th>Assignment & Details</th>
                <th>Class / Section</th>
                <th>Teacher</th>
                <th>Deadline</th>
                <th>Points</th>
                {!isStudent ? <th>Submissions</th> : <th>My Status</th>}
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedAssignments.map((a) => {
                const dueInfo = formatDueDateStatus(a.due_date);
                const totalEnrolled = Number(a.total_enrolled_students || 0);
                const subCount = Number(a.submissions_count || 0);
                const progressPercent = totalEnrolled > 0 ? Math.round((subCount / totalEnrolled) * 100) : 0;

                let parsedAttachments = a.attachment_urls || [];
                if (typeof parsedAttachments === 'string') {
                  try {
                    parsedAttachments = JSON.parse(parsedAttachments);
                  } catch {
                    parsedAttachments = [];
                  }
                }

                const mySub = a.my_submission;

                return (
                  <tr key={a.id}>
                    <td>
                      <div className={styles.tableTitleCell}>
                        <span className={styles.tableTitleText}>{a.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span className={styles.subjectBadge}>
                            <HiTag /> {a.subject_name || 'General Subject'}
                          </span>
                          {parsedAttachments.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <HiFolderArrowDown /> {parsedAttachments.length} file{parsedAttachments.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {a.description && <span className={styles.tableDescSnippet}>{a.description}</span>}
                      </div>
                    </td>

                    <td>
                      <span className={styles.metaItem}>
                        <HiAcademicCap /> {a.grade_name || 'All Grades'} {a.section_name ? `• Sec ${a.section_name}` : ''}
                      </span>
                    </td>

                    <td>
                      {a.teacher_first_name ? (
                        <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                          👨‍🏫 {a.teacher_first_name} {a.teacher_last_name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>School Admin</span>
                      )}
                    </td>

                    <td>
                      <span className={`${styles.dueValue} ${dueInfo.className}`} style={{ fontSize: '0.82rem' }}>
                        <HiClock /> {dueInfo.label}
                      </span>
                    </td>

                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {a.max_marks} pts
                    </td>

                    {!isStudent ? (
                      <td>
                        <div style={{ minWidth: '120px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
                            <span>{subCount}/{totalEnrolled}</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className={styles.progressBarTrack} style={{ height: '5px' }}>
                            <div className={styles.progressBarFill} style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                    ) : (
                      <td>
                        <span
                          className={`${styles.statusPill} ${
                            mySub?.status === 'GRADED'
                              ? styles.badgeGraded
                              : mySub?.status === 'SUBMITTED' || mySub?.status === 'LATE'
                              ? styles.badgeSubmitted
                              : mySub?.status === 'RESUBMIT_REQUESTED'
                              ? styles.badgeResubmit
                              : styles.badgeNotSubmitted
                          }`}
                        >
                          {mySub?.status ? mySub.status.replace('_', ' ') : 'Not Submitted'}
                        </span>
                        {mySub?.obtained_marks !== null && mySub?.obtained_marks !== undefined && (
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', marginTop: '0.2rem' }}>
                            Score: {mySub.obtained_marks} / {a.max_marks}
                          </div>
                        )}
                      </td>
                    )}

                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          a.status === 'PUBLISHED'
                            ? styles.statusPublished
                            : a.status === 'DRAFT'
                            ? styles.statusDraft
                            : a.status === 'CLOSED'
                            ? styles.statusClosed
                            : styles.statusArchived
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {isStudent ? (
                        <button
                          className={styles.btnPrimary}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                          onClick={() => handleOpenStudentSubmission(a)}
                        >
                          <HiPaperAirplane />
                          <span>{mySub ? 'View / Edit' : 'Submit'}</span>
                        </button>
                      ) : (
                        <div className={styles.cardActions} style={{ justifyContent: 'flex-end' }}>
                          <button
                            className={styles.btnPrimary}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                            onClick={() => handleOpenRoster(a)}
                          >
                            <HiUserGroup />
                            <span>({subCount})</span>
                          </button>

                          <button
                            className={styles.btnActionIcon}
                            title="Edit Assignment"
                            onClick={() => handleOpenEditModal(a)}
                          >
                            <HiPencilSquare />
                          </button>

                          <button
                            className={styles.btnActionIcon}
                            title={a.status === 'PUBLISHED' ? 'Close Submissions' : 'Publish Assignment'}
                            onClick={() => handleToggleStatus(a)}
                          >
                            {a.status === 'PUBLISHED' ? <HiClock /> : <HiCheckBadge />}
                          </button>

                          <button
                            className={`${styles.btnActionIcon} ${styles.btnActionIconDanger}`}
                            title="Delete Assignment"
                            onClick={() => handleDeleteAssignment(a.id, a.title)}
                          >
                            <HiTrash />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE & EDIT ASSIGNMENT MODAL */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <HiPencilSquare style={{ color: '#4f46e5' }} />
                <span>{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</span>
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setIsCreateModalOpen(false)}>
                <HiXMark />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignmentForm} className={styles.modalForm}>
              <div className={styles.modalBody}>
                {formErrors.submit && (
                  <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.65rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                    {formErrors.submit}
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Assignment Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 4 Trigonometry Problem Set"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGrid}>
                  {/* Academic Year */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Academic Year *</label>
                    <select
                      required
                      value={formData.academicYearId}
                      onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                      className={styles.formSelect}
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Subject *</label>
                    <select
                      required
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      className={styles.formSelect}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject_name} ({s.subject_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Grade */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Target Grade / Class *</label>
                    <select
                      required
                      value={formData.gradeId}
                      onChange={(e) => setFormData({ ...formData, gradeId: e.target.value, sectionId: '' })}
                      className={styles.formSelect}
                    >
                      <option value="">Select Grade</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Section (Optional)</label>
                    <select
                      value={formData.sectionId}
                      onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                      className={styles.formSelect}
                    >
                      <option value="">All Sections in Grade</option>
                      {availableSections.map((s) => (
                        <option key={s.id} value={s.id}>
                          Section {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  {/* Due Date */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Due Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Max Marks */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Max Marks / Score *</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      required
                      value={formData.maxMarks}
                      onChange={(e) => setFormData({ ...formData, maxMarks: Number(e.target.value) })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Pass Marks */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Pass Marks</label>
                    <input
                      type="number"
                      min="0"
                      max={formData.maxMarks}
                      value={formData.passMarks}
                      onChange={(e) => setFormData({ ...formData, passMarks: Number(e.target.value) })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Status */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Initial Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={styles.formSelect}
                    >
                      <option value="PUBLISHED">Published (Visible to Students)</option>
                      <option value="DRAFT">Draft (Hidden)</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Description & Instructions */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Instructions & Requirements</label>
                  <textarea
                    rows={4}
                    placeholder="Provide clear homework directions, reading materials, formatting requirements, and rubric details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={styles.formTextarea}
                  />
                </div>

                {/* Late Submission Switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="checkbox"
                    id="allowLate"
                    checked={formData.allowLateSubmissions}
                    onChange={(e) => setFormData({ ...formData, allowLateSubmissions: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                  />
                  <label htmlFor="allowLate" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    Allow late submissions after due date (will be automatically flagged as LATE)
                  </label>
                </div>

                {/* Reference Material / Attachment Links */}
                <div className={styles.attachmentManager}>
                  <label className={styles.formLabel}>Reference Files & External Material Links</label>
                  
                  {formData.attachmentUrls.length > 0 && (
                    <div className={styles.attachmentList}>
                      {formData.attachmentUrls.map((att, idx) => (
                        <div key={idx} className={styles.attachmentItem}>
                          <a href={att.url} target="_blank" rel="noreferrer" className={styles.attachmentLink}>
                            <HiFolderArrowDown /> {att.title}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className={styles.btnDangerOutline}
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <HiTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.addAttachmentRow}>
                    <input
                      type="text"
                      placeholder="Resource title (e.g. Worksheet PDF)"
                      value={newAttachmentTitle}
                      onChange={(e) => setNewAttachmentTitle(e.target.value)}
                      className={styles.formInput}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="url"
                      placeholder="URL link (Google Drive, Doc, PDF link)"
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      className={styles.formInput}
                      style={{ flex: 1.5 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      className={styles.btnSecondary}
                    >
                      <HiPlus /> Add Link
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssignmentForm}
                  className={styles.btnPrimary}
                >
                  {submittingAssignmentForm ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMISSIONS ROSTER DRAWER (TEACHER / ADMIN) */}
      {activeAssignmentForRoster && (
        <div className={styles.modalOverlay} onClick={() => setActiveAssignmentForRoster(null)}>
          <div className={styles.drawerBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  <HiUserGroup style={{ color: '#4f46e5' }} />
                  <span>Submissions: {activeAssignmentForRoster.title}</span>
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Grade: {activeAssignmentForRoster.grade_name} {activeAssignmentForRoster.section_name ? `• Section ${activeAssignmentForRoster.section_name}` : ''} | Max Marks: {activeAssignmentForRoster.max_marks}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className={styles.btnSecondary} onClick={handleExportRosterCSV}>
                  <HiArrowDownTray /> Export CSV
                </button>
                <button className={styles.modalCloseBtn} onClick={() => setActiveAssignmentForRoster(null)}>
                  <HiXMark />
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              {/* Roster Controls */}
              <div className={styles.rosterSummary}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className={`${styles.tabBtn} ${!rosterStatusFilter ? styles.tabBtnActive : ''}`}
                    onClick={() => setRosterStatusFilter('')}
                  >
                    All ({rosterData.length})
                  </button>
                  <button
                    className={`${styles.tabBtn} ${rosterStatusFilter === 'SUBMITTED' ? styles.tabBtnActive : ''}`}
                    onClick={() => setRosterStatusFilter('SUBMITTED')}
                  >
                    Submitted ({rosterData.filter((r) => r.submission_status === 'SUBMITTED').length})
                  </button>
                  <button
                    className={`${styles.tabBtn} ${rosterStatusFilter === 'GRADED' ? styles.tabBtnActive : ''}`}
                    onClick={() => setRosterStatusFilter('GRADED')}
                  >
                    Graded ({rosterData.filter((r) => r.submission_status === 'GRADED').length})
                  </button>
                  <button
                    className={`${styles.tabBtn} ${rosterStatusFilter === 'LATE' ? styles.tabBtnActive : ''}`}
                    onClick={() => setRosterStatusFilter('LATE')}
                  >
                    Late ({rosterData.filter((r) => r.submission_status === 'LATE').length})
                  </button>
                  <button
                    className={`${styles.tabBtn} ${rosterStatusFilter === 'NOT_SUBMITTED' ? styles.tabBtnActive : ''}`}
                    onClick={() => setRosterStatusFilter('NOT_SUBMITTED')}
                  >
                    Not Submitted ({rosterData.filter((r) => r.submission_status === 'NOT_SUBMITTED').length})
                  </button>
                </div>

                <div className={styles.searchInputWrapper} style={{ maxWidth: '280px' }}>
                  <HiMagnifyingGlass className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              {/* Roster Table */}
              {rosterLoading ? (
                <div className={styles.loadingBox}>
                  <HiArrowPath className={styles.spinner} />
                  <span>Loading class roster submissions...</span>
                </div>
              ) : rosterData.length === 0 ? (
                <div className={styles.emptyState}>
                  <HiDocumentText className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>No students matching criteria</p>
                </div>
              ) : (
                <div className={styles.rosterTableWrapper}>
                  <table className={styles.rosterTable}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Adm No</th>
                        <th>Section</th>
                        <th>Status</th>
                        <th>Submitted At</th>
                        <th>Score</th>
                        <th>Submission / Files</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterData.map((row) => {
                        let studentAttachments = row.attachment_urls || [];
                        if (typeof studentAttachments === 'string') {
                          try {
                            studentAttachments = JSON.parse(studentAttachments);
                          } catch {
                            studentAttachments = [];
                          }
                        }

                        return (
                          <tr key={row.student_id}>
                            <td style={{ fontWeight: 600 }}>
                              {row.first_name} {row.last_name}
                            </td>
                            <td style={{ color: '#64748b' }}>{row.admission_number}</td>
                            <td>{row.section_name || 'N/A'}</td>
                            <td>
                              <span
                                className={`${styles.statusPill} ${
                                  row.submission_status === 'GRADED'
                                    ? styles.badgeGraded
                                    : row.submission_status === 'SUBMITTED'
                                    ? styles.badgeSubmitted
                                    : row.submission_status === 'LATE'
                                    ? styles.badgeLate
                                    : row.submission_status === 'RESUBMIT_REQUESTED'
                                    ? styles.badgeResubmit
                                    : styles.badgeNotSubmitted
                                }`}
                              >
                                {row.submission_status.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                              {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {row.obtained_marks !== null && row.obtained_marks !== undefined ? (
                                <span style={{ color: '#059669' }}>
                                  {row.obtained_marks} / {activeAssignmentForRoster.max_marks}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {row.submission_text && (
                                <div style={{ fontSize: '0.82rem', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.submission_text}>
                                  📝 {row.submission_text}
                                </div>
                              )}
                              {Array.isArray(studentAttachments) && studentAttachments.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                  {studentAttachments.map((url, uIdx) => (
                                    <a
                                      key={uIdx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}
                                    >
                                      🔗 File {uIdx + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                              {!row.submission_text && (!studentAttachments || studentAttachments.length === 0) && (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No submission</span>
                              )}
                            </td>
                            <td>
                              {row.submission_id ? (
                                <button
                                  className={styles.btnPrimary}
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                  onClick={() => handleOpenGrading(row)}
                                >
                                  {row.submission_status === 'GRADED' ? 'Edit Grade' : 'Grade'}
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Awaiting</span>
                              )}
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
        </div>
      )}

      {/* INLINE GRADING MODAL */}
      {gradingSubmission && (
        <div className={styles.modalOverlay} onClick={() => setGradingSubmission(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <HiSparkles style={{ color: '#4f46e5' }} />
                <span>Grade Submission: {gradingSubmission.first_name} {gradingSubmission.last_name}</span>
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setGradingSubmission(null)}>
                <HiXMark />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Submission review summary */}
              {gradingSubmission.submission_text && (
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                  <strong style={{ display: 'block', marginBottom: '0.3rem', color: '#334155' }}>Student Answer / Notes:</strong>
                  <p style={{ whiteSpace: 'pre-wrap', color: '#475569' }}>{gradingSubmission.submission_text}</p>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Marks Obtained (out of {activeAssignmentForRoster?.max_marks || 100}) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={activeAssignmentForRoster?.max_marks || 100}
                  step="0.5"
                  required
                  placeholder={`0 - ${activeAssignmentForRoster?.max_marks || 100}`}
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Teacher Feedback & Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Provide constructive feedback, praise, or areas for improvement..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className={styles.formTextarea}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setGradingSubmission(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnDangerOutline}
                onClick={() => handleSaveGrade('RESUBMIT_REQUESTED')}
                disabled={savingGrade}
              >
                Request Resubmission
              </button>
              <button
                type="button"
                className={styles.btnSuccess}
                onClick={() => handleSaveGrade('GRADED')}
                disabled={savingGrade || gradeScore === ''}
              >
                {savingGrade ? 'Saving...' : 'Save Grade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT SUBMISSION WORKSPACE MODAL */}
      {activeAssignmentForSubmission && (
        <div className={styles.modalOverlay} onClick={() => setActiveAssignmentForSubmission(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  <HiPaperAirplane style={{ color: '#4f46e5' }} />
                  <span>Submit: {activeAssignmentForSubmission.title}</span>
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Subject: {activeAssignmentForSubmission.subject_name} • Max Marks: {activeAssignmentForSubmission.max_marks}
                </p>
              </div>
              <button className={styles.modalCloseBtn} onClick={() => setActiveAssignmentForSubmission(null)}>
                <HiXMark />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Teacher instructions */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Assignment Instructions:</strong>
                <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {activeAssignmentForSubmission.description || 'Complete the assignment as instructed.'}
                </p>

                {/* Attached teacher reference materials */}
                {activeAssignmentForSubmission.attachment_urls?.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reference Files:</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                      {activeAssignmentForSubmission.attachment_urls.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <HiFolderArrowDown /> {att.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Prior Teacher Grade / Feedback if available */}
              {activeAssignmentForSubmission.my_submission?.obtained_marks !== null &&
                activeAssignmentForSubmission.my_submission?.obtained_marks !== undefined && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <HiCheckCircle /> Evaluation Grade
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>
                        {activeAssignmentForSubmission.my_submission.obtained_marks} / {activeAssignmentForSubmission.max_marks}
                      </span>
                    </div>
                    {activeAssignmentForSubmission.my_submission.feedback && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: '#14532d' }}>
                        <strong>Teacher Remarks:</strong> {activeAssignmentForSubmission.my_submission.feedback}
                      </p>
                    )}
                  </div>
                )}

              {/* Student Submission Text */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Your Work / Submission Text</label>
                <textarea
                  rows={4}
                  placeholder="Type your answer, essay response, or submission notes here..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className={styles.formTextarea}
                />
              </div>

              {/* Student Submission Attachments */}
              <div className={styles.attachmentManager}>
                <label className={styles.formLabel}>Attached Files & Links (Google Drive, Docs, GitHub, PDF URL)</label>
                
                {submissionAttachments.length > 0 && (
                  <div className={styles.attachmentList}>
                    {submissionAttachments.map((url, i) => (
                      <div key={i} className={styles.attachmentItem}>
                        <a href={url} target="_blank" rel="noreferrer" className={styles.attachmentLink}>
                          🔗 {url}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveStudentAttachment(i)}
                          className={styles.btnDangerOutline}
                          style={{ padding: '0.2rem 0.4rem' }}
                        >
                          <HiTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.addAttachmentRow}>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... or document URL"
                    value={submissionAttachmentUrl}
                    onChange={(e) => setSubmissionAttachmentUrl(e.target.value)}
                    className={styles.formInput}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddStudentAttachment}
                    className={styles.btnSecondary}
                  >
                    <HiPlus /> Add File Link
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setActiveAssignmentForSubmission(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => handleSubmitStudentWork(true)}
                disabled={submittingStudentWork}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => handleSubmitStudentWork(false)}
                disabled={submittingStudentWork || (!submissionText.trim() && submissionAttachments.length === 0)}
              >
                {submittingStudentWork ? 'Submitting...' : 'Submit Homework'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
