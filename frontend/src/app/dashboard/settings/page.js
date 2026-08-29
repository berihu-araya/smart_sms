'use strict';
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { getSchoolSettings, updateSchoolSettings } from '@/services/settingService';
import { listAcademicYears } from '@/services/academicYearService';
import {
  HiCalendar,
  HiUsers,
  HiUserGroup,
  HiShieldCheck,
  HiCheckCircle,
} from 'react-icons/hi2';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    schoolName: '',
    schoolCode: '',
    email: '',
    phone: '',
    address: '',
    motto: '',
    activeAcademicYearId: '',
    activeTerm: 'Semester 1',
    currency: 'ETB',
  });

  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [settData, yearsRes] = await Promise.all([
          getSchoolSettings().catch(() => null),
          listAcademicYears({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        if (settData) {
          setSettings({
            schoolName: settData.school_name || '',
            schoolCode: settData.school_code || '',
            email: settData.email || '',
            phone: settData.phone || '',
            address: settData.address || '',
            motto: settData.motto || '',
            activeAcademicYearId: settData.active_academic_year_id || '',
            activeTerm: settData.active_term || 'Semester 1',
            currency: settData.currency || 'ETB',
          });
        }

        const yItems = yearsRes?.items || yearsRes?.data?.items || [];
        setAcademicYears(yItems);
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateSchoolSettings(settings);
      setMessage('School settings and configurations updated successfully!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Settings & Configuration</h1>
          <p className={styles.subtitle}>
            Manage school institutional profile, active academic sessions, users, and roles.
          </p>
        </div>
      </div>

      {message && <div className={`${styles.alert} ${styles.alertSuccess}`}>{message}</div>}
      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      {/* Module Navigation Grid */}
      <div className={styles.navGrid}>
        <Link href="/dashboard/settings/academic-years" className={styles.navCard}>
          <div className={styles.navIcon}>
            <HiCalendar />
          </div>
          <div>
            <div className={styles.navTitle}>Academic Years</div>
            <div className={styles.navDesc}>
              Configure and activate academic calendar cycles.
            </div>
          </div>
        </Link>

        <Link href="/dashboard/settings/users" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
            <HiUsers />
          </div>
          <div>
            <div className={styles.navTitle}>User Management</div>
            <div className={styles.navDesc}>
              Administer system accounts, reset passwords, and toggle access.
            </div>
          </div>
        </Link>

        <Link href="/dashboard/settings/roles" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <HiShieldCheck />
          </div>
          <div>
            <div className={styles.navTitle}>Roles & Permissions</div>
            <div className={styles.navDesc}>
              View role hierarchy and access privilege assignments.
            </div>
          </div>
        </Link>
      </div>

      {/* School Profile Settings Form */}
      <div className={styles.settingsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Institutional Profile & Academic Session</div>
        </div>

        <form onSubmit={handleSave}>
          <div className={styles.formBody}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>School Name *</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>School Code / ID</label>
                <input
                  type="text"
                  className={styles.input}
                  value={settings.schoolCode}
                  onChange={(e) => setSettings({ ...settings, schoolCode: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Official Email</label>
                <input
                  type="email"
                  className={styles.input}
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Official Phone Number</label>
                <input
                  type="text"
                  className={styles.input}
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>School Motto / Slogan</label>
              <input
                type="text"
                className={styles.input}
                value={settings.motto}
                onChange={(e) => setSettings({ ...settings, motto: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Physical Address</label>
              <input
                type="text"
                className={styles.input}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Active Academic Session</label>
                <select
                  className={styles.select}
                  value={settings.activeAcademicYearId}
                  onChange={(e) =>
                    setSettings({ ...settings, activeAcademicYearId: e.target.value })
                  }
                >
                  <option value="">-- Select Active Academic Year --</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Current Active Term / Semester</label>
                <select
                  className={styles.select}
                  value={settings.activeTerm}
                  onChange={(e) => setSettings({ ...settings, activeTerm: e.target.value })}
                >
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={saving || loading}
            >
              <HiCheckCircle size={18} />
              {saving ? 'Saving...' : 'Save System Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
