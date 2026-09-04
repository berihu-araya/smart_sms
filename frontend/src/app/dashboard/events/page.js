'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaCalendarDay } from 'react-icons/fa';

export default function EventsPage() {
  return (
    <ModuleComingSoon
      title="School Events & Academic Calendar"
      category="Communication Hub"
      description="Plan, schedule, and broadcast school holidays, parent-teacher meetings, sports days, and ceremonies."
      icon={FaCalendarDay}
      features={[
        'Interactive school-wide calendar with color-coded event types',
        'Parent-Teacher Association (PTA) conference slot scheduling',
        'Academic examination dates and term break calendar display',
        'iCal export and automatic mobile calendar synchronization',
      ]}
    />
  );
}
