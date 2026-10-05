'use client';

import { useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import notificationService from '@/services/notificationService';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    notificationService.listNotifications()
      .then((items) => {
        if (mounted) setNotifications(items);
      })
      .catch(() => {
        if (mounted) setError('Notifications could not be loaded.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <header style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <FaBell aria-hidden="true" />
        <div>
          <h1 style={{ margin: 0 }}>School Notifications</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>Updates relevant to your school participation.</p>
        </div>
      </header>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {!error && notifications.length === 0 && (
        <p style={{ color: '#64748b' }}>No notifications are available.</p>
      )}
      <div style={{ display: 'grid', gap: '0.85rem' }}>
        {notifications.map((notification) => (
          <article key={notification.id} style={{ padding: '1rem 1.1rem', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{notification.title}</h2>
            <p style={{ margin: '0.5rem 0', color: '#475569', lineHeight: 1.55 }}>{notification.body}</p>
            <time dateTime={notification.published_at} style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              {new Date(notification.published_at).toLocaleString()}
            </time>
          </article>
        ))}
      </div>
    </main>
  );
}
