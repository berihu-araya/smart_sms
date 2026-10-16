'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FaBell,
  FaSearch,
  FaPlus,
  FaCheckCircle,
  FaCheckDouble,
  FaGraduationCap,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaBus,
  FaBullhorn,
  FaTrash,
  FaExclamationCircle,
  FaBolt,
  FaSpinner,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaPaperPlane,
} from 'react-icons/fa';
import notificationService from '@/services/notificationService';
import { listGrades } from '@/services/gradeService';
import { listSections } from '@/services/sectionService';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/common/Modal';
import styles from './page.module.css';

const TABS = [
  { id: 'ALL', label: 'All Alerts', icon: <FaBell /> },
  { id: 'ACADEMIC', label: 'Academic', icon: <FaGraduationCap /> },
  { id: 'ATTENDANCE', label: 'Attendance', icon: <FaCalendarAlt /> },
  { id: 'EXAM', label: 'Exams & Marks', icon: <FaGraduationCap /> },
  { id: 'FINANCE', label: 'Fees & Finance', icon: <FaFileInvoiceDollar /> },
  { id: 'TRANSPORT', label: 'Transport', icon: <FaBus /> },
  { id: 'GENERAL', label: 'General Notices', icon: <FaBullhorn /> },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'UNREAD', label: 'Unread Only' },
  { value: 'READ', label: 'Read Only' },
];

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
];

const DATE_RANGES = [
  { value: '', label: 'All Time' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'Past 7 Days' },
  { value: 'MONTH', label: 'Past 30 Days' },
];

const AUDIENCES = [
  { value: 'ALL', label: 'Entire School (All Roles)' },
  { value: 'STUDENTS', label: 'Students' },
  { value: 'PARENTS', label: 'Parents & Guardians' },
  { value: 'TEACHERS', label: 'Teachers' },
  { value: 'STAFF', label: 'Staff & Admins' },
];

const INITIAL_FORM = {
  title: '',
  body: '',
  type: 'GENERAL',
  priority: 'NORMAL',
  audience: 'ALL',
  gradeId: '',
  sectionId: '',
  actionUrl: '',
  actionLabel: '',
  channel: 'IN_APP',
};

function formatFullDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCategoryConfig(type) {
  switch (type) {
    case 'ACADEMIC':
      return { icon: <FaGraduationCap />, className: styles.typeAcademic };
    case 'ATTENDANCE':
      return { icon: <FaCalendarAlt />, className: styles.typeAttendance };
    case 'EXAM':
      return { icon: <FaGraduationCap />, className: styles.typeExam };
    case 'FINANCE':
      return { icon: <FaFileInvoiceDollar />, className: styles.typeFinance };
    case 'TRANSPORT':
      return { icon: <FaBus />, className: styles.typeTransport };
    default:
      return { icon: <FaBullhorn />, className: styles.typeGeneral };
  }
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    urgentUnread: 0,
    academicTotal: 0,
    attendanceTotal: 0,
    financeTotal: 0,
    transportTotal: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters & Pagination state
  const [activeTab, setActiveTab] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dispatcher Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [gradesList, setGradesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  const userRole = (user?.role || user?.role_name || '').toLowerCase();
  const canDispatch = ['admin', 'school admin', 'staff', 'teacher'].includes(userRole);

  // Load KPI Stats
  const loadStats = useCallback(async () => {
    try {
      const data = await notificationService.getStats();
      setStats(data);
    } catch {
      // Ignore
    }
  }, []);

  // Load Notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationService.listNotifications({
        page,
        limit: 15,
        type: activeTab,
        status: statusFilter,
        priority: priorityFilter,
        dateRange: dateRangeFilter,
        search: searchQuery,
      });

      setNotifications(res?.items || []);
      setTotalPages(res?.totalPages || 1);
      setTotalCount(res?.total || 0);
    } catch (err) {
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, priorityFilter, dateRangeFilter, searchQuery, page]);

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [loadNotifications, loadStats]);

  // Listen for background updates
  useEffect(() => {
    const handleSync = () => {
      loadNotifications();
      loadStats();
    };

    window.addEventListener('smart-sms-notification-change', handleSync);
    return () => {
      window.removeEventListener('smart-sms-notification-change', handleSync);
    };
  }, [loadNotifications, loadStats]);

  // Load Grades and Sections for Dispatcher modal
  useEffect(() => {
    if (canDispatch && isModalOpen) {
      listGrades({ limit: 100 })
        .then((res) => setGradesList(res?.grades || res?.items || []))
        .catch(() => {});
      listSections({ limit: 100 })
        .then((res) => setSectionsList(res?.sections || res?.items || []))
        .catch(() => {});
    }
  }, [canDispatch, isModalOpen]);

  // Mark single as read
  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      loadStats();
    } catch {
      // Ignore
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      loadStats();
      setActionSuccess('All notifications marked as read.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch {
      // Ignore
    }
  };

  // Archive / dismiss notification
  const handleArchive = async (id) => {
    try {
      await notificationService.archiveNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      loadStats();
    } catch {
      // Ignore
    }
  };

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Dispatch Submit
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await notificationService.createNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        priority: form.priority,
        audience: form.audience,
        gradeId: form.gradeId || null,
        sectionId: form.sectionId || null,
        actionUrl: form.actionUrl?.trim() || null,
        actionLabel: form.actionLabel?.trim() || null,
        channel: form.channel,
      });

      setIsModalOpen(false);
      setForm(INITIAL_FORM);
      setActionSuccess('Notification successfully broadcast and dispatched!');
      setTimeout(() => setActionSuccess(''), 5000);
      loadNotifications();
      loadStats();
    } catch (err) {
      setError(err?.message || 'Failed to dispatch notification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* ================= HEADER ================= */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.headerIconWrapper}>
            <FaBell />
          </div>
          <div>
            <h1 className={styles.mainTitle}>Notification Center</h1>
            <p className={styles.subtitle}>
              Actionable alerts, academic releases, attendance notices, and school communications.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleMarkAllRead}
            disabled={stats.unread === 0}
            title="Mark all notifications as read"
          >
            <FaCheckDouble />
            <span>Mark All as Read</span>
          </button>

          {canDispatch && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setIsModalOpen(true)}
            >
              <FaPlus />
              <span>Send Notification</span>
            </button>
          )}
        </div>
      </header>

      {/* Success / Error Alerts */}
      {actionSuccess && (
        <div style={{ padding: '0.85rem 1.25rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <FaCheckCircle />
          <span>{actionSuccess}</span>
        </div>
      )}
      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <FaExclamationCircle />
          <span>{error}</span>
        </div>
      )}

      {/* ================= TOP KPI STATS ================= */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconBlue}`}>
            <FaBell />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statValue}>{stats.total}</p>
            <span className={styles.statLabel}>Total Alerts</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconRed}`}>
            <FaExclamationCircle />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statValue}>{stats.unread}</p>
            <span className={styles.statLabel}>Unread Alerts</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconAmber}`}>
            <FaBolt />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statValue}>{stats.urgentUnread}</p>
            <span className={styles.statLabel}>Urgent Priority</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconPurple}`}>
            <FaGraduationCap />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statValue}>{stats.academicTotal}</p>
            <span className={styles.statLabel}>Academic & Exams</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconEmerald}`}>
            <FaCalendarAlt />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statValue}>{stats.attendanceTotal}</p>
            <span className={styles.statLabel}>Attendance Notices</span>
          </div>
        </div>
      </section>

      {/* ================= FILTER TOOLBAR ================= */}
      <section className={styles.toolbarCard}>
        {/* Category Tabs */}
        <div className={styles.tabsRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Select Filters */}
        <div className={styles.filtersRow}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search notifications by keyword or title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={styles.selectInput}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className={styles.selectInput}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={dateRangeFilter}
            onChange={(e) => {
              setDateRangeFilter(e.target.value);
              setPage(1);
            }}
            className={styles.selectInput}
          >
            {DATE_RANGES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ================= FEED LIST ================= */}
      <section className={styles.feedList}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <FaSpinner className="spin" style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 1s linear infinite' }} />
            <p>Loading notification feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyContainer}>
            <FaBell className={styles.emptyBigIcon} />
            <h3 className={styles.emptyTitle}>No notifications found</h3>
            <p className={styles.emptySubtitle}>
              {searchQuery || activeTab !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try clearing your search or adjusting the selected category filter.'
                : 'All caught up! You have no notifications at this time.'}
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const category = getCategoryConfig(notif.type);
            const isUnread = !notif.is_read;

            return (
              <article
                key={notif.id}
                className={`${styles.notificationCard} ${isUnread ? styles.unreadCard : ''}`}
              >
                {isUnread && <span className={styles.unreadPillPulse} title="Unread" />}

                <div className={`${styles.cardIconWrapper} ${category.className}`}>
                  {category.icon}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitleArea}>
                      <h2 className={styles.cardTitle}>{notif.title}</h2>
                      {notif.priority === 'URGENT' && (
                        <span className={`${styles.priorityBadge} ${styles.badgeUrgent}`}>
                          Urgent
                        </span>
                      )}
                      {notif.priority === 'HIGH' && (
                        <span className={`${styles.priorityBadge} ${styles.badgeHigh}`}>
                          High Priority
                        </span>
                      )}
                    </div>

                    <time className={styles.cardTime} dateTime={notif.published_at}>
                      {formatFullDate(notif.published_at || notif.created_at)}
                    </time>
                  </div>

                  <p className={styles.cardMessage}>{notif.body}</p>

                  <div className={styles.cardFooter}>
                    <div className={styles.actionButtonRow}>
                      {notif.action_url && (
                        <Link href={notif.action_url} className={styles.actionCtaBtn}>
                          <span>{notif.action_label || 'View Details'}</span>
                          <FaArrowRight size={11} />
                        </Link>
                      )}
                    </div>

                    <div className={styles.actionButtonRow}>
                      {isUnread && (
                        <button
                          type="button"
                          className={styles.btnActionItem}
                          onClick={() => handleMarkAsRead(notif.id)}
                          title="Mark as read"
                        >
                          <FaCheck size={12} />
                          <span>Mark Read</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className={`${styles.btnActionItem} ${styles.btnDeleteAction}`}
                        onClick={() => handleArchive(notif.id)}
                        title="Dismiss notification"
                      >
                        <FaTrash size={12} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* ================= PAGINATION ================= */}
      {totalPages > 1 && (
        <footer className={styles.paginationRow}>
          <span className={styles.paginationText}>
            Showing page {page} of {totalPages} ({totalCount} total alerts)
          </span>

          <div className={styles.paginationButtons}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <FaChevronLeft size={10} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <span>Next</span>
              <FaChevronRight size={10} />
            </button>
          </div>
        </footer>
      )}

      {/* ================= ADMIN DISPATCH MODAL ================= */}
      {canDispatch && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Compose & Dispatch Notification"
          subtitle="Send targeted or school-wide alerts via in-app feeds and automated SMS gateway."
          icon={FaPaperPlane}
          size="lg"
        >
          <form onSubmit={handleDispatchSubmit} className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Notification Title *</label>
              <input
                type="text"
                name="title"
                required
                value={form.title}
                onChange={handleFormChange}
                placeholder="e.g., Mathematics Midterm Results Published"
                className={styles.formInput}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category / Type *</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  className={styles.formSelect}
                >
                  <option value="GENERAL">📢 General Notice</option>
                  <option value="ACADEMIC">📚 Academic & Courses</option>
                  <option value="ATTENDANCE">📅 Attendance Alert</option>
                  <option value="EXAM">📝 Exam & Marks</option>
                  <option value="FINANCE">💳 Fees & Finance</option>
                  <option value="TRANSPORT">🚌 Transport Notice</option>
                  <option value="SYSTEM">⚙️ System & Security</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Urgency Priority *</label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleFormChange}
                  className={styles.formSelect}
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority (Emphasized)</option>
                  <option value="URGENT">Urgent Alert (Immediate Action)</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Audience *</label>
                <select
                  name="audience"
                  value={form.audience}
                  onChange={handleFormChange}
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
                <label className={styles.formLabel}>Target Grade (Optional)</label>
                <select
                  name="gradeId"
                  value={form.gradeId}
                  onChange={handleFormChange}
                  className={styles.formSelect}
                >
                  <option value="">All Grades</option>
                  {gradesList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Section (Optional)</label>
                <select
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleFormChange}
                  className={styles.formSelect}
                >
                  <option value="">All Sections</option>
                  {sectionsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Action Link URL (Optional)</label>
                <input
                  type="text"
                  name="actionUrl"
                  value={form.actionUrl}
                  onChange={handleFormChange}
                  placeholder="e.g., /dashboard/marks or /dashboard/fees"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Action Button Label (Optional)</label>
                <input
                  type="text"
                  name="actionLabel"
                  value={form.actionLabel}
                  onChange={handleFormChange}
                  placeholder="e.g., View Gradebook"
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Delivery Channel *</label>
              <div className={styles.channelSelector}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="channel"
                    value="IN_APP"
                    checked={form.channel === 'IN_APP'}
                    onChange={handleFormChange}
                  />
                  <span>In-App Feed Only</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="channel"
                    value="IN_APP_AND_SMS"
                    checked={form.channel === 'IN_APP_AND_SMS'}
                    onChange={handleFormChange}
                  />
                  <span>In-App Alert + Automated SMS Gateway</span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Notification Body & Message *</label>
              <textarea
                name="body"
                required
                rows={4}
                value={form.body}
                onChange={handleFormChange}
                placeholder="Write clear, concise notification details..."
                className={styles.formTextarea}
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <FaSpinner className="spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    <span>Dispatch Notification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
