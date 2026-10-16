'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaBell,
  FaCheckCircle,
  FaGraduationCap,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaBus,
  FaBullhorn,
  FaArrowRight,
  FaCheck,
} from 'react-icons/fa';
import notificationService from '@/services/notificationService';
import styles from './NotificationBell.module.css';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getCategoryIcon(type) {
  switch (type) {
    case 'ACADEMIC':
      return { icon: <FaGraduationCap />, className: styles.iconAcademic };
    case 'ATTENDANCE':
      return { icon: <FaCalendarAlt />, className: styles.iconAttendance };
    case 'EXAM':
      return { icon: <FaGraduationCap />, className: styles.iconExam };
    case 'FINANCE':
      return { icon: <FaFileInvoiceDollar />, className: styles.iconFinance };
    case 'TRANSPORT':
      return { icon: <FaBus />, className: styles.iconTransport };
    default:
      return { icon: <FaBullhorn />, className: styles.iconGeneral };
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [recentList, setRecentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Fetch unread count for badge
  const fetchCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(Number(count) || 0);
    } catch {
      // Silently ignore if unauthenticated or network failure
    }
  }, []);

  // Fetch recent preview notifications when popover opens
  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.listNotifications({
        limit: 5,
        status: 'ALL',
      });
      setRecentList(data?.items || []);
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and synchronization listener
  useEffect(() => {
    fetchCount();

    const handleSync = () => {
      fetchCount();
      if (isOpen) {
        fetchRecent();
      }
    };

    window.addEventListener('smart-sms-notification-change', handleSync);
    // Background polling interval every 60 seconds
    const interval = setInterval(fetchCount, 60000);

    return () => {
      window.removeEventListener('smart-sms-notification-change', handleSync);
      clearInterval(interval);
    };
  }, [fetchCount, fetchRecent, isOpen]);

  // Handle open / toggle
  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      fetchRecent();
    } else {
      setIsOpen(false);
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle clicking a notification
  const handleItemClick = async (item) => {
    try {
      if (!item.is_read) {
        await notificationService.markAsRead(item.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setRecentList((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      }
    } catch {
      // Proceed even if markAsRead fails
    }

    setIsOpen(false);
    if (item.action_url) {
      router.push(item.action_url);
    } else {
      router.push('/dashboard/notifications');
    }
  };

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setRecentList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  return (
    <div className={styles.bellContainer} ref={containerRef}>
      <button
        type="button"
        className={`${styles.bellBtn} ${isOpen ? styles.bellBtnActive : ''}`}
        onClick={handleToggle}
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <FaBell className={styles.bellIcon} />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-live="polite">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="Notifications preview">
          {/* Popover Header */}
          <div className={styles.popoverHeader}>
            <div className={styles.headerTitleRow}>
              <span className={styles.headerTitle}>Notifications</span>
              {unreadCount > 0 && (
                <span className={styles.unreadPill}>{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.markAllBtn}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Popover Body */}
          <div className={styles.list}>
            {loading ? (
              <>
                <div className={styles.skeletonItem}>
                  <div className={styles.skeletonIcon}></div>
                  <div className={styles.skeletonText}>
                    <div className={styles.skeletonLine}></div>
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`}></div>
                  </div>
                </div>
                <div className={styles.skeletonItem}>
                  <div className={styles.skeletonIcon}></div>
                  <div className={styles.skeletonText}>
                    <div className={styles.skeletonLine}></div>
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`}></div>
                  </div>
                </div>
              </>
            ) : recentList.length === 0 ? (
              <div className={styles.emptyState}>
                <FaCheckCircle className={styles.emptyIcon} />
                <h4 className={styles.emptyTitle}>You're all caught up!</h4>
                <p className={styles.emptyText}>No new notifications right now.</p>
              </div>
            ) : (
              recentList.map((item) => {
                const category = getCategoryIcon(item.type);
                const isUrgent = item.priority === 'URGENT';
                const isHigh = item.priority === 'HIGH';

                return (
                  <div
                    key={item.id}
                    className={`${styles.item} ${!item.is_read ? styles.unreadItem : ''}`}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleItemClick(item);
                      }
                    }}
                  >
                    <div className={`${styles.iconWrapper} ${category.className}`}>
                      {category.icon}
                    </div>

                    <div className={styles.itemContent}>
                      <div className={styles.itemTitleRow}>
                        <span className={styles.itemTitle} title={item.title}>
                          {item.title}
                        </span>
                        <span className={styles.itemTime}>
                          {formatRelativeTime(item.published_at || item.created_at)}
                        </span>
                      </div>

                      <p className={styles.itemSnippet}>{item.body}</p>

                      <div className={styles.itemFooterRow}>
                        {isUrgent && (
                          <span className={`${styles.priorityBadge} ${styles.priorityUrgent}`}>
                            Urgent
                          </span>
                        )}
                        {isHigh && (
                          <span className={`${styles.priorityBadge} ${styles.priorityHigh}`}>
                            High
                          </span>
                        )}
                        {item.action_label && (
                          <span className={styles.actionTag}>
                            {item.action_label} &rarr;
                          </span>
                        )}
                      </div>
                    </div>

                    {!item.is_read && <div className={styles.unreadDot} />}
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className={styles.popoverFooter}>
            <Link
              href="/dashboard/notifications"
              className={styles.viewAllLink}
              onClick={() => setIsOpen(false)}
            >
              <span>View all notifications</span>
              <FaArrowRight size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
