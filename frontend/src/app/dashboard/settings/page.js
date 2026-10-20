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
  HiShieldCheck,
  HiBuildingOffice2,
  HiCheckCircle,
  HiSparkles,
  HiAcademicCap,
  HiBell,
} from 'react-icons/hi2';
import { FaBuilding, FaHistory, FaKey, FaDatabase } from 'react-icons/fa';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    schoolName: '',
    schoolCode: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    motto: '',
    activeAcademicYearId: '',
    activeTerm: 'Semester 1',
    currency: 'ETB',
    gradingSystem: 'LETTER_SCALE',
    passingGradePercentage: 50,
    minAttendancePercentage: 75,
    autoAbsenceAlert: false,
    timezone: 'Africa/Addis_Ababa',
    dateFormat: 'DD/MM/YYYY',
    calendarSystem: 'GREGORIAN',
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
            taxId: settData.tax_id || '',
            email: settData.email || '',
            phone: settData.phone || '',
            address: settData.address || '',
            motto: settData.motto || '',
            activeAcademicYearId: settData.active_academic_year_id || '',
            activeTerm: settData.active_term || 'Semester 1',
            currency: settData.currency || 'ETB',
            gradingSystem: settData.grading_system || 'LETTER_SCALE',
            passingGradePercentage: settData.passing_grade_percentage || 50,
            minAttendancePercentage: settData.min_attendance_percentage || 75,
            autoAbsenceAlert: Boolean(settData.auto_absence_alert),
            timezone: settData.timezone || 'Africa/Addis_Ababa',
            dateFormat: settData.date_format || 'DD/MM/YYYY',
            calendarSystem: settData.calendar_system || 'GREGORIAN',
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
      setMessage('Institutional settings and dynamic policies updated successfully!');
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
          <h1 className={styles.title}>System Settings & Platform Control Plane</h1>
          <p className={styles.subtitle}>
            Single Source of Truth (SSOT) governing institutional identity, temporal clocks, RBAC, and policy rules.
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
            <div className={styles.navDesc}>Configure sessions & term cycles.</div>
          </div>
        </Link>

        <Link href="/dashboard/settings/departments" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <FaBuilding />
          </div>
          <div>
            <div className={styles.navTitle}>Departments & HODs</div>
            <div className={styles.navDesc}>Organize faculties & assign HODs.</div>
          </div>
        </Link>

        <Link href="/dashboard/settings/roles" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <HiShieldCheck />
          </div>
          <div>
            <div className={styles.navTitle}>User Roles</div>
            <div className={styles.navDesc}>Define custom institutional roles.</div>
          </div>
        </Link>

        <Link href="/dashboard/settings/permissions" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
            <FaKey />
          </div>
          <div>
            <div className={styles.navTitle}>Permissions Matrix</div>
            <div className={styles.navDesc}>Dynamic module CRUD & scope toggles.</div>
          </div>
        </Link>

        <Link href="/dashboard/settings/audit" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
            <FaHistory />
          </div>
          <div>
            <div className={styles.navTitle}>Audit Trail & Logs</div>
            <div className={styles.navDesc}>Tamper-evident logs & delta diffs.</div>
          </div>
        </Link>

        <Link href="/dashboard/settings/backups" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <FaDatabase />
          </div>
          <div>
            <div className={styles.navTitle}>Backups & Recovery</div>
            <div className={styles.navDesc}>Snapshots & disaster recovery.</div>
          </div>
        </Link>

        <Link href="/dashboard/settings/erp-integration" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <HiBuildingOffice2 />
          </div>
          <div>
            <div className={styles.navTitle}>ERP Integration</div>
            <div className={styles.navDesc}>Odoo 18 ledger & student sync.</div>
          </div>
        </Link>

        <Link href="/dashboard/settings/users" className={styles.navCard}>
          <div className={styles.navIcon} style={{ background: '#f1f5f9', color: '#334155' }}>
            <HiUsers />
          </div>
          <div>
            <div className={styles.navTitle}>User Accounts</div>
            <div className={styles.navDesc}>Administer passwords & status.</div>
          </div>
        </Link>
      </div>

      {/* School Profile & Dynamic Policy Form */}
      <div className={styles.settingsCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Institutional Profile, Session Clock & Academic Policies</div>
        </div>

        <form onSubmit={handleSave}>
          <div className={styles.formBody}>
            {/* Section 1: Profile */}
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
              1. Institutional Identity & Contact
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>School Legal Name *</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>School Registration Code</label>
                <input
                  type="text"
                  className={styles.input}
                  value={settings.schoolCode}
                  onChange={(e) => setSettings({ ...settings, schoolCode: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tax / TIN Number</label>
                <input
                  type="text"
                  placeholder="e.g. 0012345678"
                  className={styles.input}
                  value={settings.taxId}
                  onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Official Contact Email</label>
                <input
                  type="email"
                  className={styles.input}
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Official Contact Phone</label>
                <input
                  type="text"
                  className={styles.input}
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Billing Currency</label>
                <input
                  type="text"
                  className={styles.input}
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Institutional Motto / Mission</label>
              <input
                type="text"
                className={styles.input}
                value={settings.motto}
                onChange={(e) => setSettings({ ...settings, motto: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Physical Campus Address</label>
              <input
                type="text"
                className={styles.input}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            {/* Section 2: Session Clock */}
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem', marginTop: '1rem' }}>
              2. Active Academic Session Clock
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

            {/* Section 3: Policies */}
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem', marginTop: '1rem' }}>
              3. Dynamic Academic & Evaluation Policies
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Grading Evaluation Scheme</label>
                <select
                  className={styles.select}
                  value={settings.gradingSystem}
                  onChange={(e) => setSettings({ ...settings, gradingSystem: e.target.value })}
                >
                  <option value="LETTER_SCALE">Standard Letter Scale (A+, A, B, C, D, F)</option>
                  <option value="GPA_4_POINT">4.0 Scale Grade Point Average (GPA)</option>
                  <option value="PERCENTAGE_100">Direct 100% Percentage Scale</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Minimum Passing Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={styles.input}
                  value={settings.passingGradePercentage}
                  onChange={(e) =>
                    setSettings({ ...settings, passingGradePercentage: e.target.value })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Minimum Attendance Threshold (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={styles.input}
                  value={settings.minAttendancePercentage}
                  onChange={(e) =>
                    setSettings({ ...settings, minAttendancePercentage: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Section 4: Localization & Automation */}
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem', marginTop: '1rem' }}>
              4. Localization, Calendar & Notification Rules
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>System Timezone</label>
                <select
                  className={styles.select}
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                >
                  <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (EAT, UTC+3)</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Display Date Format</label>
                <select
                  className={styles.select}
                  value={settings.dateFormat}
                  onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 20/10/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/20/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Calendar Mode</label>
                <select
                  className={styles.select}
                  value={settings.calendarSystem}
                  onChange={(e) => setSettings({ ...settings, calendarSystem: e.target.value })}
                >
                  <option value="GREGORIAN">Gregorian Calendar</option>
                  <option value="ETHIOPIAN">Ethiopian Calendar (Ge'ez)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <input
                type="checkbox"
                id="autoAbsenceAlert"
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                checked={settings.autoAbsenceAlert}
                onChange={(e) => setSettings({ ...settings, autoAbsenceAlert: e.target.checked })}
              />
              <label htmlFor="autoAbsenceAlert" style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}>
                Automated Parent Absence Alerts (Trigger immediate SMS/Notification when student marked unexcused absent)
              </label>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={saving || loading}
            >
              <HiCheckCircle size={18} />
              {saving ? 'Saving...' : 'Save System Settings & Policies'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
