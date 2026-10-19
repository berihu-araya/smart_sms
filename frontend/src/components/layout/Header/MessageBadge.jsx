'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FaEnvelope } from 'react-icons/fa';
import messageService from '@/services/messageService';
import styles from './MessageBadge.module.css';

export default function MessageBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadUnread = async () => {
      try {
        const count = await messageService.getUnreadCount();
        if (isMounted) {
          setUnreadCount(Number(count) || 0);
        }
      } catch {
        // Ignore background fetch failure
      }
    };

    loadUnread();

    const handleMessageChange = () => {
      loadUnread();
    };

    window.addEventListener('smart-sms-message-change', handleMessageChange);
    window.addEventListener('focus', loadUnread);

    // Refresh every 30 seconds
    const interval = setInterval(loadUnread, 30000);

    return () => {
      isMounted = false;
      window.removeEventListener('smart-sms-message-change', handleMessageChange);
      window.removeEventListener('focus', loadUnread);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={styles.messageBadgeContainer} title="Direct Messages">
      <Link href="/dashboard/messages" className={styles.iconButton} aria-label="Messages">
        <FaEnvelope className={styles.badgeIcon} />
        {unreadCount > 0 && (
          <span className={styles.counterBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
