'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaDatabase } from 'react-icons/fa';

export default function BackupsPage() {
  return (
    <ModuleComingSoon
      title="Automated Database Backups & Recovery"
      category="System Configuration"
      description="Manage automated PostgreSQL snapshot backups, disaster recovery points, and data retention rules."
      icon={FaDatabase}
      features={[
        'Daily automated encrypted database snapshots to cloud storage',
        'Point-in-time disaster recovery restore with pre-flight verification',
        'Manual on-demand backup triggers before major academic term migrations',
        'Downloadable SQL dumps for local disaster recovery archives',
      ]}
    />
  );
}
