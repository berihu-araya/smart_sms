'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaPiggyBank } from 'react-icons/fa';

export default function IncomePage() {
  return (
    <ModuleComingSoon
      title="Institutional Income & Revenue Streams"
      category="Financial Administration"
      description="Track institutional revenue from tuition, grants, donations, and auxiliary school services."
      icon={FaPiggyBank}
      features={[
        'Comprehensive multi-source revenue tracking',
        'Direct synchronization with student fee collections',
        'Financial audit trail and cash flow summaries',
        'End-of-term financial reconciliation exports',
      ]}
    />
  );
}
