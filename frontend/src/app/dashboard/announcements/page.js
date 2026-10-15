'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import announcementService from '@/services/announcementService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/common/Modal';
import {
  FaBullhorn,
  FaSearch,
  FaPlus,
  FaThLarge,
  FaList,
  FaPaperclip,
  FaThumbtack,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaEdit,
  FaTrash,
  FaArchive,
  FaTimes,
  FaUsers,
  FaSpinner,
  FaBookmark,
  FaExclamationCircle,
  FaPrint,
  FaShareAlt,
  FaFileDownload,
  FaEye,
  FaRegCheckCircle,
  FaUniversity,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaFileAlt,
  FaUndo,
} from 'react-icons/fa';

const CATEGORIES = [
  { value: 'GENERAL', label: '📢 General Announcement' },
  { value: 'ACADEMIC', label: '📚 Academic & Curriculum' },
  { value: 'EXAMINATION', label: '📝 Examination & Testing' },
  { value: 'HOLIDAY', label: '🏖️ Holidays & Closures' },
  { value: 'EVENT', label: '🎪 Events & Functions' },
  { value: 'ADMINISTRATIVE', label: '🏛️ Administrative Notice' },
  { value: 'SPORTS', label: '⚽ Sports & Athletics' },
  { value: 'FEE_FINANCE', label: '💳 Fees & Finance' },
];

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal Priority' },
  { value: 'IMPORTANT', label: 'Important Notice' },
  { value: 'URGENT', label: 'Urgent Alert (Mandatory Action)' },
];

const AUDIENCES = [
  { value: 'ALL', label: 'All School (Students, Parents, Teachers, Staff)' },
  { value: 'TEACHERS', label: 'Teachers & Academic Staff' },
  { value: 'PARENTS', label: 'Parents & Guardians' },
  { value: 'STUDENTS', label: 'Students Only' },
  { value: 'STAFF', label: 'Operational & Administrative Staff' },
];

const DATE_RANGES = [
  { value: '', label: 'All Time' },
  { value: 'TODAY', label: 'Issued Today' },
  { value: 'WEEK', label: 'Past 7 Days' },
  { value: 'MONTH', label: 'Past 30 Days' },
];

const SORT_OPTIONS = [
  { value: 'NEWEST', label: 'Newest First' },
  { value: 'OLDEST', label: 'Oldest First' },
  { value: 'PRIORITY', label: 'Urgency Priority' },
  { value: 'MOST_ACKNOWLEDGED', label: 'Most Acknowledged' },
];

const INITIAL_FORM = {
  title: '',
  content: '',
  category: 'GENERAL',
  priority: 'NORMAL',
  audience: 'ALL',
  grade_id: '',
  section_id: '',
  attachment_url: '',
  attachment_name: '',
  is_pinned: false,
  requires_acknowledgement: false,
  status: 'PUBLISHED',
  expires_at: '',
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase().trim();
  const isAdmin = ['admin', 'school admin'].includes(role);
  const canManage = ['admin', 'school admin', 'teacher', 'staff'].includes(role);
  const schoolName = user?.school_name || 'Smart SMS International Academy';

  // Core Data & KPI States
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({
    totalAnnouncements: 0,
    activeAnnouncements: 0,
    urgentAlerts: 0,
    pinnedAnnouncements: 0,
    pendingAcknowledgements: 0,
    urgentUnacknowledgedNotice: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown Options
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);

  // Filtering, Sorting & Pagination
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [selectedSort, setSelectedSort] = useState('NEWEST');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Card Content Expansion
  const [expandedCards, setExpandedCards] = useState(new Set());

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewMode, setPreviewMode] = useState('card');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  // Formal Letterhead Reader Modal
  const [viewingNotice, setViewingNotice] = useState(null);

  // Acknowledgement Tracker Modal
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackNotice, setAckNotice] = useState(null);
  const [ackData, setAckData] = useState(null);
  const [ackLoading, setAckLoading] = useState(false);
  const [ackSearch, setAckSearch] = useState('');

  // Delete Confirm Dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Load Grades and Sections for form targeting
  useEffect(() => {
    if (canManage) {
      listGrades({ limit: 100 })
        .then((res) => setGrades(res?.items || res || []))
        .catch(() => {});
      listSections({ limit: 100 })
        .then((res) => setSections(res?.items || res || []))
        .catch(() => {});
    }
  }, [canManage]);

  // Deep-linking: auto-open notice if `?notice=ID` is in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const noticeId = params.get('notice');
      if (noticeId) {
        announcementService.getAnnouncementById(noticeId).then((notice) => {
          if (notice) setViewingNotice(notice);
        });
      }
    }
  }, []);

  // Fetch Announcements & Stats
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page,
        limit: 12,
        search: search.trim() || undefined,
        category: selectedCategory || undefined,
        audience: selectedAudience || undefined,
        date_range: selectedDateRange || undefined,
        sort: selectedSort,
      };

      if (activeTab === 'PUBLISHED') params.status = 'PUBLISHED';
      else if (activeTab === 'DRAFT') params.status = 'DRAFT';
      else if (activeTab === 'ARCHIVED') params.status = 'ARCHIVED';
      else if (activeTab === 'PINNED') params.is_pinned = 'true';
      else if (activeTab === 'URGENT') params.priority = 'URGENT';

      const [listRes, statsRes] = await Promise.all([
        announcementService.listAnnouncements(params),
        announcementService.getAnnouncementStats(),
      ]);

      setAnnouncements(listRes.items || []);
      setTotalPages(listRes.totalPages || 1);
      setTotalItems(listRes.total || 0);
      setStats(statsRes);
    } catch (err) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, selectedAudience, selectedDateRange, selectedSort, activeTab]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!ignore) {
        await fetchData();
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const toggleExpand = (id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAllFilters = () => {
    setSearch('');
    setSearchInput('');
    setSelectedCategory('');
    setSelectedAudience('');
    setSelectedDateRange('');
    setSelectedSort('NEWEST');
    setActiveTab('ALL');
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (selectedCategory) count++;
    if (selectedAudience) count++;
    if (selectedDateRange) count++;
    if (selectedSort !== 'NEWEST') count++;
    if (activeTab !== 'ALL') count++;
    return count;
  }, [search, selectedCategory, selectedAudience, selectedDateRange, selectedSort, activeTab]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormErrors([]);
    setPreviewMode('card');
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      category: announcement.category || 'GENERAL',
      priority: announcement.priority || 'NORMAL',
      audience: announcement.audience || 'ALL',
      grade_id: announcement.grade_id || '',
      section_id: announcement.section_id || '',
      attachment_url: announcement.attachment_url || '',
      attachment_name: announcement.attachment_name || '',
      is_pinned: Boolean(announcement.is_pinned),
      requires_acknowledgement: Boolean(announcement.requires_acknowledgement),
      status: announcement.status || 'PUBLISHED',
      expires_at: announcement.expires_at ? announcement.expires_at.slice(0, 16) : '',
    });
    setFormErrors([]);
    setShowCreateModal(true);
  };

  // Save (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    try {
      const payload = {
        ...formData,
        grade_id: formData.grade_id || null,
        section_id: formData.section_id || null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (editingId) {
        await announcementService.updateAnnouncement(editingId, payload);
        showToast('Announcement circular updated successfully!', 'success');
      } else {
        await announcementService.createAnnouncement(payload);
        showToast('Official circular published to noticeboard!', 'success');
      }

      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      setFormErrors([err.message || 'Operation failed']);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (id, currentPinned) => {
    try {
      await announcementService.togglePin(id);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_pinned: !a.is_pinned } : a))
      );
      showToast(currentPinned ? 'Notice unpinned from top' : 'Notice pinned to top of board', 'info');
      announcementService.getAnnouncementStats().then(setStats).catch(() => {});
    } catch (err) {
      showToast(err.message || 'Failed to toggle pin', 'error');
    }
  };

  // Toggle Status (Archive / Publish)
  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'ARCHIVED' ? 'PUBLISHED' : 'ARCHIVED';
    try {
      await announcementService.toggleStatus(id, nextStatus);
      showToast(nextStatus === 'ARCHIVED' ? 'Notice moved to Archive' : 'Notice restored to Published', 'info');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Acknowledge Notice
  const handleAcknowledge = async (id) => {
    try {
      await announcementService.acknowledgeAnnouncement(id, user);
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                is_acknowledged: true,
                acknowledged_at: new Date().toISOString(),
                acknowledgement_count: parseInt(a.acknowledgement_count || 0, 10) + 1,
              }
            : a
        )
      );
      if (viewingNotice && viewingNotice.id === id) {
        setViewingNotice({
          ...viewingNotice,
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledgement_count: parseInt(viewingNotice.acknowledgement_count || 0, 10) + 1,
        });
      }
      showToast('Thank you! Receipt of circular acknowledged.', 'success');
      announcementService.getAnnouncementStats().then(setStats).catch(() => {});
    } catch (err) {
      showToast(err.message || 'Failed to acknowledge notice', 'error');
    }
  };

  // Open Acknowledgement Tracker Modal
  const handleOpenAckTracker = async (announcement) => {
    setAckNotice(announcement);
    setShowAckModal(true);
    setAckLoading(true);
    setAckData(null);
    setAckSearch('');

    try {
      const data = await announcementService.getAcknowledgements(announcement.id);
      setAckData(data);
    } catch (err) {
      showToast(err.message || 'Failed to load acknowledgements', 'error');
    } finally {
      setAckLoading(false);
    }
  };

  // Filter Acknowledgements list by search keyword
  const filteredAckUsers = useMemo(() => {
    if (!ackData?.items) return [];
    if (!ackSearch.trim()) return ackData.items;
    const s = ackSearch.toLowerCase();
    return ackData.items.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.role_name?.toLowerCase().includes(s)
    );
  }, [ackData, ackSearch]);

  // Export Acknowledgement List as CSV
  const handleExportAckCSV = () => {
    if (!ackData?.items || ackData.items.length === 0) return;

    const headers = ['Full Name', 'Role', 'Email', 'Phone', 'Acknowledged Timestamp'];
    const rows = ackData.items.map((u) => [
      `"${u.full_name || ''}"`,
      `"${u.role_name || ''}"`,
      `"${u.email || ''}"`,
      `"${u.phone || ''}"`,
      `"${new Date(u.acknowledged_at).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Acknowledgements_${ackNotice?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Circular'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Acknowledgement CSV report downloaded', 'info');
  };

  // Download Formal Circular as Text
  const handleDownloadNoticeText = (notice) => {
    const textContent = `
======================================================================
${schoolName.toUpperCase()}
OFFICE OF ACADEMIC AFFAIRS & INSTITUTIONAL COMMUNICATIONS
OFFICIAL CIRCULAR: SMS-CIR-${notice.id?.slice(0, 8)?.toUpperCase()}
======================================================================
DATE ISSUED: ${new Date(notice.published_at).toLocaleDateString('en-US', { dateStyle: 'long' })}
CATEGORY:    ${notice.category?.replace('_', ' ')}
PRIORITY:    ${notice.priority}
AUDIENCE:    ${notice.audience} ${notice.grade_name ? `(${notice.grade_name})` : ''}

SUBJECT: ${notice.title}

${notice.content}

----------------------------------------------------------------------
ISSUED BY:
${notice.author_name || 'Academic Administration'}
${notice.author_role || 'Office of Communications'}, ${schoolName}
======================================================================
`.trim();

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Official_Circular_${notice.id?.slice(0, 8)?.toUpperCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Official circular text document downloaded', 'info');
  };

  // Share / Copy Link
  const handleShareNotice = (announcement) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/dashboard/announcements?notice=${announcement.id}`;
      navigator.clipboard?.writeText(url).then(() => {
        showToast('Direct link to circular copied to clipboard!', 'info');
      }).catch(() => {
        showToast('Link ready: ' + url, 'info');
      });
    }
  };

  // Delete Announcement
  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await announcementService.deleteAnnouncement(deleteConfirmId);
      setDeleteConfirmId(null);
      showToast('Announcement removed from Noticeboard', 'info');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete announcement', 'error');
    }
  };

  // Date formatting helper
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffHrs < 48) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`${styles.toast} ${
            toast.type === 'success'
              ? styles.toastSuccess
              : toast.type === 'error'
              ? styles.toastError
              : styles.toastInfo
          }`}
        >
          <FaCheckCircle style={{ color: toast.type === 'success' ? '#10b981' : '#3b82f6' }} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ================= HEADER SECTION ================= */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleIconBadge}>
            <FaBullhorn />
          </div>
          <div>
            <h1 className={styles.title}>School Announcements & Noticeboard</h1>
            <p className={styles.subtitle}>
              Institutional circulars, academic notices, and official school communications for {schoolName}.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {canManage && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleOpenCreate}
            >
              <FaPlus /> Compose Circular
            </button>
          )}
        </div>
      </header>

      {/* ================= KPI STATS CARDS ================= */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
            <FaBullhorn />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Announcements</span>
            <span className={styles.statValue}>{stats.totalAnnouncements}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
            <FaCheckCircle />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Active Published</span>
            <span className={styles.statValue}>{stats.activeAnnouncements}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconRed}`}>
            <FaExclamationCircle />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Urgent Alerts</span>
            <span className={styles.statValue}>{stats.urgentAlerts}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconAmber}`}>
            <FaBookmark />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Pinned Circulars</span>
            <span className={styles.statValue}>{stats.pinnedAnnouncements}</span>
          </div>
        </div>
      </div>

      {/* ================= URGENT ALERT BANNER ================= */}
      {stats.urgentUnacknowledgedNotice && (
        <div className={styles.urgentBanner} role="alert">
          <div className={styles.urgentBannerLeft}>
            <FaExclamationTriangle className={styles.urgentIcon} />
            <div>
              <h4 className={styles.urgentBannerTitle}>
                Action Required: Urgent Notice Pending Confirmation
              </h4>
              <p className={styles.urgentBannerText}>
                &ldquo;{stats.urgentUnacknowledgedNotice.title}&rdquo; requires your confirmation of receipt.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.urgentAckBtn}
            onClick={() => handleAcknowledge(stats.urgentUnacknowledgedNotice.id)}
          >
            <FaCheckCircle /> Acknowledge Notice
          </button>
        </div>
      )}

      {/* ================= FILTER TOOLBAR ================= */}
      <div className={styles.toolbarCard}>
        <div className={styles.toolbarTop}>
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search circulars by keywords, title, or topic..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
            />
            {searchInput && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchInput('')}
                title="Clear Search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className={styles.toolbarFilters}>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className={styles.selectInput}
              aria-label="Filter by Category"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            {isAdmin && (
              <select
                value={selectedAudience}
                onChange={(e) => {
                  setSelectedAudience(e.target.value);
                  setPage(1);
                }}
                className={styles.selectInput}
                aria-label="Filter by Audience"
              >
                <option value="">All Audiences</option>
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedDateRange}
              onChange={(e) => {
                setSelectedDateRange(e.target.value);
                setPage(1);
              }}
              className={styles.selectInput}
              aria-label="Filter by Date Range"
            >
              {DATE_RANGES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setPage(1);
              }}
              className={styles.selectInput}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className={styles.viewToggleGroup}>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid Card View"
              >
                <FaThLarge />
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <FaList />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'ALL' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('ALL')}
          >
            All Circulars <span className={styles.tabBadge}>{stats.totalAnnouncements}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'PUBLISHED' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('PUBLISHED')}
          >
            Published <span className={styles.tabBadge}>{stats.activeAnnouncements}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'URGENT' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('URGENT')}
          >
            Urgent Alerts <span className={styles.tabBadge}>{stats.urgentAlerts}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'PINNED' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('PINNED')}
          >
            Pinned <span className={styles.tabBadge}>{stats.pinnedAnnouncements}</span>
          </button>
          {canManage && (
            <>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'DRAFT' ? styles.tabBtnActive : ''}`}
                onClick={() => handleTabChange('DRAFT')}
              >
                Drafts
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'ARCHIVED' ? styles.tabBtnActive : ''}`}
                onClick={() => handleTabChange('ARCHIVED')}
              >
                Archived
              </button>
            </>
          )}
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className={styles.activeFiltersBar}>
            <span className={styles.activeFiltersLabel}>Filters:</span>
            {search && (
              <span className={styles.filterChip}>
                Search: &ldquo;{search}&rdquo;
                <button type="button" className={styles.filterChipClose} onClick={() => { setSearch(''); setSearchInput(''); }}>
                  ×
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className={styles.filterChip}>
                Category: {selectedCategory}
                <button type="button" className={styles.filterChipClose} onClick={() => setSelectedCategory('')}>
                  ×
                </button>
              </span>
            )}
            {selectedAudience && (
              <span className={styles.filterChip}>
                Audience: {selectedAudience}
                <button type="button" className={styles.filterChipClose} onClick={() => setSelectedAudience('')}>
                  ×
                </button>
              </span>
            )}
            {selectedDateRange && (
              <span className={styles.filterChip}>
                Date: {DATE_RANGES.find((d) => d.value === selectedDateRange)?.label}
                <button type="button" className={styles.filterChipClose} onClick={() => setSelectedDateRange('')}>
                  ×
                </button>
              </span>
            )}
            {selectedSort !== 'NEWEST' && (
              <span className={styles.filterChip}>
                Sort: {SORT_OPTIONS.find((s) => s.value === selectedSort)?.label}
                <button type="button" className={styles.filterChipClose} onClick={() => setSelectedSort('NEWEST')}>
                  ×
                </button>
              </span>
            )}
            {activeTab !== 'ALL' && (
              <span className={styles.filterChip}>
                Tab: {activeTab}
                <button type="button" className={styles.filterChipClose} onClick={() => setActiveTab('ALL')}>
                  ×
                </button>
              </span>
            )}
            <button type="button" className={styles.clearFiltersBtn} onClick={resetAllFilters}>
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* ================= CONTENT AREA ================= */}
      {loading ? (
        /* Shimmer Skeletons */
        <div className={styles.cardsGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonBadgeRow}>
                <div className={styles.skeletonBadge} />
                <div className={styles.skeletonBadge} style={{ width: 60 }} />
              </div>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonMeta} />
              <div className={styles.skeletonLines}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} style={{ width: '92%' }} />
                <div className={styles.skeletonLine} style={{ width: '75%' }} />
              </div>
              <div className={styles.skeletonFooter} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <p style={{ color: '#dc2626' }}>{error}</p>
          <button type="button" className={styles.secondaryBtn} onClick={fetchData}>
            Retry Loading
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className={styles.emptyState}>
          <FaBullhorn className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No Announcements Found</h3>
          <p className={styles.emptyText}>
            There are currently no circulars or notices matching your selected filters.
          </p>
          {activeFilterCount > 0 ? (
            <button type="button" className={styles.secondaryBtn} onClick={resetAllFilters}>
              <FaUndo /> Reset Filter Selection
            </button>
          ) : (
            canManage && (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleOpenCreate}
              >
                <FaPlus /> Post First Announcement
              </button>
            )
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= GRID CARDS VIEW ================= */
        <div className={styles.cardsGrid}>
          {announcements.map((a) => {
            const isExpanded = expandedCards.has(a.id);
            const isLong = a.content && a.content.length > 200;
            const displayedContent = isLong && !isExpanded ? `${a.content.slice(0, 200)}...` : a.content;

            return (
              <article
                key={a.id}
                className={`${styles.noticeCard} ${a.is_pinned ? styles.pinnedCard : ''} ${a.priority === 'URGENT' ? styles.urgentCard : ''}`}
              >
                {/* Top Badge Row */}
                <div className={styles.cardTopRow}>
                  <div className={styles.badgesGroup}>
                    <span className={`${styles.categoryBadge} ${styles[`cat${a.category}`] || styles.catGENERAL}`}>
                      {a.category?.replace('_', ' ')}
                    </span>

                    <span className={`${styles.priorityBadge} ${styles[`prio${a.priority}`] || styles.prioNORMAL}`}>
                      {a.priority === 'URGENT' && <span className={styles.prioPulseDot} />}
                      {a.priority}
                    </span>

                    {a.is_pinned && (
                      <span className={styles.pinnedTag}>
                        <FaThumbtack /> Pinned
                      </span>
                    )}
                  </div>

                  {a.status !== 'PUBLISHED' && (
                    <span className={`${styles.statusPill} ${styles[`status${a.status}`]}`}>
                      {a.status}
                    </span>
                  )}
                </div>

                {/* Title (Click opens formal letterhead view) */}
                <h3
                  className={styles.cardTitle}
                  onClick={() => setViewingNotice(a)}
                  title="Click to view formal official circular"
                >
                  {a.title}
                </h3>

                {/* Metadata Row */}
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    <FaCalendarAlt /> {formatDate(a.published_at)}
                  </span>

                  <span className={styles.audiencePill}>
                    {a.audience === 'ALL' && <FaUsers />}
                    {a.audience === 'STUDENTS' && <FaUserGraduate />}
                    {a.audience === 'TEACHERS' && <FaChalkboardTeacher />}
                    {a.audience === 'PARENTS' && <FaUsers />}
                    {a.audience}
                    {a.grade_name ? ` • ${a.grade_name}` : ''}
                    {a.section_name ? ` (${a.section_name})` : ''}
                  </span>

                  {a.author_name && (
                    <span className={styles.metaItem}>
                      By {a.author_name}
                    </span>
                  )}
                </div>

                {/* Body Content */}
                <div className={styles.cardBody}>
                  {displayedContent}
                  {isLong && (
                    <button
                      type="button"
                      className={styles.readMoreBtn}
                      onClick={() => toggleExpand(a.id)}
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>

                {/* Document Attachment */}
                {a.attachment_url && (
                  <a
                    href={a.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachmentPill}
                    title="Open document attachment"
                  >
                    <FaPaperclip /> {a.attachment_name || 'Download Attached Document'}
                  </a>
                )}

                {/* Card Footer */}
                <div className={styles.cardFooter}>
                  <div className={styles.ackStatusArea}>
                    {a.requires_acknowledgement && (
                      <>
                        {a.is_acknowledged ? (
                          <span className={styles.ackConfirmedPill}>
                            <FaCheckCircle /> Confirmed {formatDate(a.acknowledged_at)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={styles.ackActionBtn}
                            onClick={() => handleAcknowledge(a.id)}
                          >
                            <FaRegCheckCircle /> Acknowledge
                          </button>
                        )}
                      </>
                    )}

                    {canManage && a.requires_acknowledgement && (
                      <button
                        type="button"
                        className={styles.ackTrackerBtn}
                        onClick={() => handleOpenAckTracker(a)}
                        title="View list of users who acknowledged this notice"
                      >
                        <FaUsers />
                        {a.acknowledgement_count || 0} Acknowledged
                      </button>
                    )}
                  </div>

                  {/* Actions for Authorized Staff & Users */}
                  <div className={styles.cardActionBtns}>
                    <button
                      type="button"
                      className={styles.iconActionBtn}
                      onClick={() => setViewingNotice(a)}
                      title="View Official Circular Letter"
                    >
                      <FaEye />
                    </button>

                    <button
                      type="button"
                      className={styles.iconActionBtn}
                      onClick={() => handleShareNotice(a)}
                      title="Copy Direct Link to Circular"
                    >
                      <FaShareAlt />
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        className={styles.iconActionBtn}
                        onClick={() => handleTogglePin(a.id, a.is_pinned)}
                        title={a.is_pinned ? 'Unpin Notice' : 'Pin to Top of Noticeboard'}
                      >
                        <FaThumbtack style={{ transform: a.is_pinned ? 'rotate(45deg)' : 'none', color: a.is_pinned ? '#4f46e5' : undefined }} />
                      </button>
                    )}

                    {canManage && (
                      <>
                        <button
                          type="button"
                          className={styles.iconActionBtn}
                          onClick={() => handleOpenEdit(a)}
                          title="Edit Announcement"
                        >
                          <FaEdit />
                        </button>

                        <button
                          type="button"
                          className={styles.iconActionBtn}
                          onClick={() => handleToggleStatus(a.id, a.status)}
                          title={a.status === 'ARCHIVED' ? 'Restore to Published' : 'Archive Notice'}
                        >
                          <FaArchive />
                        </button>

                        <button
                          type="button"
                          className={`${styles.iconActionBtn} ${styles.iconActionBtnDanger}`}
                          onClick={() => setDeleteConfirmId(a.id)}
                          title="Delete Announcement"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE CARD WITH DEDICATED HORIZONTAL SCROLL ================= */
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ minWidth: '320px' }}>Announcement Subject</th>
                  <th style={{ width: '140px', minWidth: '140px' }}>Category</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>Priority</th>
                  <th style={{ width: '150px', minWidth: '150px' }}>Audience</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>Published</th>
                  <th style={{ width: '110px', minWidth: '110px' }}>Status</th>
                  <th style={{ width: '160px', minWidth: '160px' }}>Acknowledgement</th>
                  <th className={styles.thActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className={styles.tableTitleCell}>
                        <span
                          className={styles.tableTitleText}
                          onClick={() => setViewingNotice(a)}
                        >
                          {a.is_pinned && <FaThumbtack style={{ color: '#4f46e5', marginRight: 6 }} />}
                          {a.title}
                        </span>
                        {a.attachment_url && (
                          <a
                            href={a.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <FaPaperclip /> {a.attachment_name || 'Attached Document'}
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.categoryBadge} ${styles[`cat${a.category}`] || styles.catGENERAL}`}>
                        {a.category?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.priorityBadge} ${styles[`prio${a.priority}`] || styles.prioNORMAL}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td>
                      <span className={styles.audiencePill}>
                        {a.audience}
                        {a.grade_name ? ` • ${a.grade_name}` : ''}
                      </span>
                    </td>
                    <td>{formatDate(a.published_at)}</td>
                    <td>
                      <span className={`${styles.statusPill} ${styles[`status${a.status}`]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      {a.requires_acknowledgement ? (
                        canManage ? (
                          <button
                            type="button"
                            className={styles.ackTrackerBtn}
                            onClick={() => handleOpenAckTracker(a)}
                          >
                            <FaUsers /> {a.acknowledgement_count || 0}
                          </button>
                        ) : a.is_acknowledged ? (
                          <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.82rem' }}>
                            ✓ Confirmed
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={styles.ackActionBtn}
                            onClick={() => handleAcknowledge(a.id)}
                          >
                            Acknowledge
                          </button>
                        )
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td className={styles.tdActions}>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => setViewingNotice(a)}
                          title="View Official Circular"
                        >
                          <FaEye />
                        </button>

                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleShareNotice(a)}
                          title="Copy Link"
                        >
                          <FaShareAlt />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handleTogglePin(a.id, a.is_pinned)}
                            title="Toggle Pin"
                          >
                            <FaThumbtack style={{ color: a.is_pinned ? '#4f46e5' : undefined }} />
                          </button>
                        )}

                        {canManage && (
                          <>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleOpenEdit(a)}
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleToggleStatus(a.id, a.status)}
                              title="Toggle Status"
                            >
                              <FaArchive />
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                              onClick={() => setDeleteConfirmId(a.id)}
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Showing page {page} of {totalPages} ({totalItems} total circulars)
          </span>
          <div className={styles.pageBtns}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: FORMAL CIRCULAR LETTERHEAD ================= */}
      {viewingNotice && (
        <Modal
          isOpen={Boolean(viewingNotice)}
          onClose={() => setViewingNotice(null)}
          title="Official Institutional Circular"
          subtitle={`Ref: SMS-CIR-${viewingNotice.id?.slice(0, 8)?.toUpperCase()} • Issued by ${viewingNotice.author_name || 'Academic Administration'}`}
          icon={FaUniversity}
          size="2xl"
        >
          <div className={styles.letterheadContainer}>
            {/* School Letterhead Top */}
            <div className={styles.letterheadHeader}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <FaUniversity style={{ color: '#4f46e5', fontSize: '1.4rem' }} />
                <h2 className={styles.letterheadSchool}>{schoolName}</h2>
              </div>
              <p className={styles.letterheadSub}>
                OFFICE OF ACADEMIC AFFAIRS & INSTITUTIONAL COMMUNICATIONS
              </p>
              <span className={styles.letterheadBadge}>
                CIRCULAR REF: SMS-CIR-{viewingNotice.id?.slice(0, 8)?.toUpperCase()}
              </span>
            </div>

            {/* Metadata Grid */}
            <div className={styles.letterheadMetaGrid}>
              <div><strong>Date Issued:</strong> {new Date(viewingNotice.published_at).toLocaleDateString('en-US', { dateStyle: 'long' })}</div>
              <div><strong>Target Audience:</strong> {viewingNotice.audience} {viewingNotice.grade_name ? `(${viewingNotice.grade_name})` : ''}</div>
              <div><strong>Category:</strong> {viewingNotice.category?.replace('_', ' ')}</div>
              <div><strong>Priority:</strong> {viewingNotice.priority}</div>
            </div>

            {/* Subject */}
            <div className={styles.letterheadSubject}>
              SUBJECT: {viewingNotice.title}
            </div>

            {/* Body Text */}
            <div className={styles.letterheadText}>
              {viewingNotice.content}
            </div>

            {/* Attachment if present */}
            {viewingNotice.attachment_url && (
              <div style={{ marginBottom: '2rem' }}>
                <strong style={{ fontSize: '0.88rem', color: '#334155' }}>Attached Official Documentation:</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <a
                    href={viewingNotice.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachmentPill}
                  >
                    <FaPaperclip /> {viewingNotice.attachment_name || 'View Attached Circular File'}
                  </a>
                </div>
              </div>
            )}

            {/* Sign-off Block */}
            <div className={styles.letterheadSignBlock}>
              <div>
                <div className={styles.signRole}>{viewingNotice.author_name || 'Academic Administration'}</div>
                <div className={styles.signOrg}>{viewingNotice.author_role || 'Office of Communications'}, {schoolName}</div>
              </div>
              <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: '0.8rem' }}>
                Official Digital Notice Stamp • Verified
              </div>
            </div>
          </div>

          <div className={styles.modalFormActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => handleDownloadNoticeText(viewingNotice)}
              title="Download Plain Text Document"
            >
              <FaFileAlt /> Download Text
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => window.print()}
            >
              <FaPrint /> Print Circular
            </button>

            {viewingNotice.requires_acknowledgement && !viewingNotice.is_acknowledged && (
              <button
                type="button"
                className={styles.primaryBtn}
                style={{ background: '#059669' }}
                onClick={() => handleAcknowledge(viewingNotice.id)}
              >
                <FaCheckCircle /> Confirm & Acknowledge Receipt
              </button>
            )}

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setViewingNotice(null)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* ================= MODAL 2: COMPOSE / EDIT ANNOUNCEMENT ================= */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={editingId ? 'Edit Announcement Circular' : 'Compose Official Announcement'}
          subtitle={
            editingId
              ? 'Modify and update official circular details'
              : 'Draft and publish official institutional circular to school noticeboard'
          }
          icon={FaBullhorn}
          size="xl"
        >
          <form onSubmit={handleSave} className={styles.form}>
            {formErrors.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', padding: '0.85rem', borderRadius: 10, color: '#dc2626', fontSize: '0.86rem' }}>
                {formErrors.map((err, i) => (
                  <p key={i} style={{ margin: 0 }}>{err}</p>
                ))}
              </div>
            )}

            {/* Title */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Circular Subject / Title <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. End of Semester Examination Timetable & Regulations"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={styles.formInput}
              />
            </div>

            {/* Category & Priority */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notice Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={styles.formSelect}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Urgency Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={styles.formSelect}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Circular Body Text <span className={styles.required}>*</span>
              </label>
              <textarea
                required
                placeholder="Provide full official text, instructions, and guidance for recipients..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className={styles.formTextarea}
              />
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#94a3b8' }}>
                {formData.content.length} characters
              </div>
            </div>

            {/* Audience & Status */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Audience Scope</label>
                <select
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  className={styles.formSelect}
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Publishing Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={styles.formSelect}
                >
                  <option value="PUBLISHED">Publish to Noticeboard Immediately</option>
                  <option value="DRAFT">Save as Internal Draft</option>
                  <option value="ARCHIVED">Archived / Inactive</option>
                </select>
              </div>
            </div>

            {/* Grade & Section Selective Targeting */}
            {(formData.audience === 'ALL' || formData.audience === 'STUDENTS' || formData.audience === 'PARENTS') && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Specific Grade (Optional)</label>
                  <select
                    value={formData.grade_id}
                    onChange={(e) => setFormData({ ...formData, grade_id: e.target.value, section_id: '' })}
                    className={styles.formSelect}
                  >
                    <option value="">All Grades (School-Wide)</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Specific Section (Optional)</label>
                  <select
                    value={formData.section_id}
                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                    className={styles.formSelect}
                  >
                    <option value="">All Sections in Selected Grade</option>
                    {sections
                      .filter((sec) => !formData.grade_id || sec.grade_id === formData.grade_id)
                      .map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} {sec.grade_name ? `(${sec.grade_name})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* Attachment Fields */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Attachment Document URL</label>
                <input
                  type="url"
                  placeholder="https://smart-sms.edu.et/docs/exam-rules.pdf"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Attachment Label / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Official_Examination_Schedule.pdf"
                  value={formData.attachment_name}
                  onChange={(e) => setFormData({ ...formData, attachment_name: e.target.value })}
                  className={styles.formInput}
                />
              </div>
            </div>

            {/* Expiration Date */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Auto-Expiration Date (Optional)</label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className={styles.formInput}
              />
              <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                Notice will automatically be archived after this timestamp.
              </small>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
              {isAdmin && (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className={styles.checkboxInput}
                  />
                  <span>Pin this announcement to top of the Noticeboard</span>
                </label>
              )}

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.requires_acknowledgement}
                  onChange={(e) => setFormData({ ...formData, requires_acknowledgement: e.target.checked })}
                  className={styles.checkboxInput}
                />
                <span>Require Read Acknowledgement receipt from recipients</span>
              </label>
            </div>

            {/* Live Preview Box */}
            {formData.title && (
              <div className={styles.livePreviewBox}>
                <div className={styles.livePreviewHeader}>
                  <span>Live Preview</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('card')}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: previewMode === 'card' ? 700 : 500,
                        color: previewMode === 'card' ? '#4f46e5' : '#64748b',
                        textDecoration: previewMode === 'card' ? 'underline' : 'none',
                      }}
                    >
                      Card Mode
                    </button>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('letterhead')}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: previewMode === 'letterhead' ? 700 : 500,
                        color: previewMode === 'letterhead' ? '#4f46e5' : '#64748b',
                        textDecoration: previewMode === 'letterhead' ? 'underline' : 'none',
                      }}
                    >
                      Letterhead Mode
                    </button>
                  </div>
                </div>

                {previewMode === 'card' ? (
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '0.3rem' }}>
                      {formData.title}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                      {formData.content ? (formData.content.length > 140 ? `${formData.content.slice(0, 140)}...` : formData.content) : 'No content yet...'}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '1rem' }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{schoolName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>OFFICIAL CIRCULAR PREVIEW</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      SUBJ: {formData.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {formData.content || 'Draft content will be rendered here...'}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalFormActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={submitting}
              >
                {submitting ? <FaSpinner className="spin" /> : editingId ? 'Update Circular' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL 3: ACKNOWLEDGEMENT TRACKER ================= */}
      {showAckModal && (
        <Modal
          isOpen={showAckModal}
          onClose={() => setShowAckModal(false)}
          title="Acknowledgement Audit Log"
          subtitle={ackNotice ? `Receipt tracker for "${ackNotice.title}"` : 'Recipient confirmation tracker'}
          icon={FaUsers}
          size="lg"
        >
          {ackLoading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem' }}>
              <FaSpinner className="spin" style={{ color: '#4f46e5', fontSize: '1.75rem' }} />
            </div>
          ) : ackData ? (
            <>
              <div className={styles.ackSummaryBar}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                    Receipt Confirmation Rate
                  </span>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.25rem' }}>
                    {ackData.percentage}%
                  </span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${ackData.percentage}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', fontSize: '0.82rem', color: '#64748b' }}>
                  <span>{ackData.total} of ~{ackData.targetCount} target recipients confirmed</span>
                  <span>Target: {ackNotice?.audience}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className={styles.searchWrapper} style={{ minWidth: 200, flex: 1 }}>
                  <FaSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Filter recipients by name or role..."
                    value={ackSearch}
                    onChange={(e) => setAckSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  style={{ padding: '0.55rem 0.95rem', fontSize: '0.84rem' }}
                  onClick={handleExportAckCSV}
                >
                  <FaFileDownload /> Export CSV
                </button>
              </div>

              {filteredAckUsers.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  {ackSearch ? 'No confirmed recipients match your search.' : 'No recipients have acknowledged this notice yet.'}
                </p>
              ) : (
                <div className={styles.ackUserList}>
                  {filteredAckUsers.map((u) => (
                    <div key={u.id} className={styles.ackUserItem}>
                      <div>
                        <div className={styles.ackUserName}>{u.full_name}</div>
                        <div className={styles.ackUserMeta}>
                          <span style={{ fontWeight: 600, color: '#4f46e5' }}>{u.role_name}</span> {u.email ? `• ${u.email}` : ''}
                        </div>
                      </div>
                      <div className={styles.ackTime}>
                        ✓ {new Date(u.acknowledged_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#dc2626' }}>Could not load acknowledgement records.</p>
          )}

          <div className={styles.modalFormActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setShowAckModal(false)}
            >
              Close Audit
            </button>
          </div>
        </Modal>
      )}

      {/* ================= MODAL 4: DELETE CONFIRMATION ================= */}
      {deleteConfirmId && (
        <Modal
          isOpen={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Circular Notice"
          subtitle="Confirm removal from school noticeboard"
          icon={FaTrash}
          size="sm"
        >
          <div className={styles.deleteConfirmBody}>
            <p className={styles.deleteConfirmMessage}>
              Are you sure you want to permanently remove{' '}
              <strong style={{ color: '#0f172a' }}>
                &ldquo;{announcements.find((a) => a.id === deleteConfirmId)?.title || 'this notice'}&rdquo;
              </strong>{' '}
              from the school noticeboard? This action will archive all associated acknowledgements.
            </p>
            <div className={styles.modalFormActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
