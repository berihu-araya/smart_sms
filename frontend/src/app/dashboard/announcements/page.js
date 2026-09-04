'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaBullhorn } from 'react-icons/fa';

export default function AnnouncementsPage() {
  return (
    <ModuleComingSoon
      title="School Announcements & Noticeboard"
      category="Communication Hub"
      description="Publish institutional notices, circulars, and broadcast messages to students, teachers, and parents."
      icon={FaBullhorn}
      features={[
        'Role-targeted circular publishing (All, Teachers Only, Parents Only)',
        'Rich text bulletin board with image and PDF attachments',
        'Urgent broadcast banner alert popups on student/parent portals',
        'Read receipt tracking and publication scheduling',
      ]}
    />
  );
}
