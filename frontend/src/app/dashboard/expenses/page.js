'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaReceipt } from 'react-icons/fa';

export default function ExpensesPage() {
  return (
    <ModuleComingSoon
      title="School Expense & Procurement Tracking"
      category="Financial Administration"
      description="Record operational disbursements, departmental budgets, and vendor supplier invoices."
      icon={FaReceipt}
      features={[
        'Operational expense logging by category and department',
        'Approval workflow for departmental purchase requisitions',
        'Vendor payment records and receipt attachment storage',
        'Budget vs. actual expenditure analytics',
      ]}
    />
  );
}
