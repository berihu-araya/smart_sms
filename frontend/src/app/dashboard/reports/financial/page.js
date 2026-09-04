'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaFileInvoiceDollar } from 'react-icons/fa';

export default function FinancialReportsPage() {
  return (
    <ModuleComingSoon
      title="Financial Analytics & Audit Reports"
      category="Reporting & Analytics"
      description="Analyze institutional fee collection rates, outstanding balances, revenue breakdowns, and operational expenditures."
      icon={FaFileInvoiceDollar}
      features={[
        'Fee collection reconciliation by class, payment method, and date',
        'Outstanding balance aging analysis and defaulter summaries',
        'Monthly profit and loss operational cash flow statements',
        'Certified Excel and PDF financial export sheets for school boards',
      ]}
    />
  );
}
