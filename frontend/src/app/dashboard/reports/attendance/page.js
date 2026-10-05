'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaClipboardList } from 'react-icons/fa';

export default function AttendanceReportsPage() {
  return (
    <ModuleComingSoon
      title="Attendance Trends & Compliance Reports"
      category="Reporting & Analytics"
      description="Inspect monthly student and teacher attendance ratios, chronic absenteeism indicators, and leave distributions."
      icon={FaClipboardList}
      features={[
        'School-wide, grade-level, and section attendance trend graphs',
        'Early warning alerts for students with attendance below 75% threshold',
        'Teacher presence, punctuality, and substitution frequency reports',
        'Monthly government statutory attendance compliance exports',
      ]}
    />
  );
}
