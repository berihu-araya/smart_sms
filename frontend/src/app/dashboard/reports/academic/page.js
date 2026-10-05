'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaChartPie } from 'react-icons/fa';

export default function AcademicReportsPage() {
  return (
    <ModuleComingSoon
      title="Academic Performance & Grade Distribution"
      category="Reporting & Analytics"
      description="Generate comprehensive grade reports, subject-wise pass rates, and academic performance distribution."
      icon={FaChartPie}
      features={[
        'Class-wise and subject-wise score distribution bell curves',
        'Top performer rank lists and honors roll generation',
        'Historical grade progression tracking across academic terms',
        'Bulk printable student master report sheets and transcripts',
      ]}
    />
  );
}
