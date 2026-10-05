'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaChartArea } from 'react-icons/fa';

export default function AnalyticsDashboardPage() {
  return (
    <ModuleComingSoon
      title="Executive Institutional Analytics"
      category="Reporting & Analytics"
      description="High-level KPI dashboards for school principals, board members, and executive leadership."
      icon={FaChartArea}
      features={[
        'Real-time enrollment trends and student retention metrics',
        'Teacher-to-student ratios and class capacity utilization rates',
        'Multi-year institutional benchmarking and cohort progression insights',
        'AI-driven performance forecasting and intervention recommendations',
      ]}
    />
  );
}
