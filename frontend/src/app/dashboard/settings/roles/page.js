'use strict';
'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { listRoles } from '@/services/roleService';
import {
  HiShieldCheck,
  HiCheckCircle,
  HiUsers,
} from 'react-icons/hi2';

const ROLE_PERMISSIONS_MAP = {
  'Super Admin': [
    'Complete unrestricted system control',
    'Database migration & backup oversight',
    'Institutional tenant management',
    'Security & RBAC policy governance',
  ],
  'School Admin': [
    'Full student & teacher lifecycle administration',
    'Academic year & grade configuration',
    'Examination scheduling & results publication',
    'Staff user provisioning & status moderation',
  ],
  Teacher: [
    'Section roster attendance marking',
    'Course syllabus & assignment management',
    'Continuous evaluation & exam marks entry',
    'Student performance analysis',
  ],
  Student: [
    'View personalized academic timetable',
    'Access term examination results & rankings',
    'Download official terminal report cards',
    'Track attendance history & presence logs',
  ],
  Parent: [
    'Monitor enrolled wards & children profiles',
    'Review daily attendance & absence notifications',
    'Access terminal performance & report cards',
    'Communicate with instructors & administration',
  ],
  Staff: [
    'Assist in student registration & roster data entry',
    'View academic schedules & section distributions',
    'Attendance sheet printing & office support',
  ],
};

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await listRoles();
        setRoles(data || []);
      } catch (err) {
        console.error('Failed to load roles:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Roles & Access Control (RBAC)</h1>
          <p className={styles.subtitle}>
            Overview of system authorization roles, user allocations, and granted functional privileges.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading roles & permissions...
        </div>
      ) : (
        <div className={styles.rolesGrid}>
          {roles.map((role) => {
            const permissions = ROLE_PERMISSIONS_MAP[role.name] || [
              'Standard authenticated dashboard access',
              'Personal profile view & update',
            ];

            return (
              <div key={role.id} className={styles.roleCard}>
                <div className={styles.roleHeader}>
                  <div className={styles.roleName}>{role.name}</div>
                  <span className={styles.userCountBadge}>
                    <HiUsers style={{ display: 'inline', marginRight: '3px' }} />
                    {role.user_count || 0} Users
                  </span>
                </div>

                <div className={styles.roleDesc}>
                  {role.description || 'System access role with defined operational boundaries.'}
                </div>

                <div className={styles.permissionsList}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.25rem' }}>
                    Granted Privileges
                  </div>
                  {permissions.map((perm, idx) => (
                    <div key={idx} className={styles.permissionItem}>
                      <HiCheckCircle style={{ color: '#16a34a', flexShrink: 0 }} size={16} />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
