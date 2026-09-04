'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaHistory } from 'react-icons/fa';

export default function AuditLogsPage() {
  return (
    <ModuleComingSoon
      title="System Audit Trail & Security Logs"
      category="System Configuration"
      description="Review chronological, immutable logs of security-critical actions, record updates, and access changes."
      icon={FaHistory}
      features={[
        'Comprehensive audit log of mark publications, role changes, and deletions',
        'IP address, user agent, timestamp, and before/after delta tracking',
        'Search and filter by user, resource type, action, and date range',
        'Security compliance export and tamper-evident log integrity verification',
      ]}
    />
  );
}
