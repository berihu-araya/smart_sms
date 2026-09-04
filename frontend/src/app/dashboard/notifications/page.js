'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaBell } from 'react-icons/fa';

export default function NotificationsPage() {
  return (
    <ModuleComingSoon
      title="Notification Center & Alerts"
      category="Communication Hub"
      description="View and configure automated SMS, email, and push notification triggers for school events."
      icon={FaBell}
      features={[
        'Automated attendance absence SMS delivery to parents',
        'Exam schedule and published report card alerts',
        'Fee payment confirmation and due date reminder automations',
        'Customizable notification preferences per user profile',
      ]}
    />
  );
}
