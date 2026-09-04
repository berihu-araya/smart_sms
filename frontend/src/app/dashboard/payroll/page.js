'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaWallet } from 'react-icons/fa';

export default function PayrollPage() {
  return (
    <ModuleComingSoon
      title="Staff Payroll & Compensation"
      category="Financial Administration"
      description="Manage staff salary structures, calculate deductions and allowances, and process monthly payslips."
      icon={FaWallet}
      features={[
        'Monthly staff salary computation and automated allowance calculations',
        'Tax, pension, and customized deduction rules',
        'Direct bank payroll export generation',
        'Digital downloadable payslips for teachers and administrative staff',
      ]}
    />
  );
}
