'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaMoneyBillWave } from 'react-icons/fa';

export default function FeesManagementPage() {
  return (
    <ModuleComingSoon
      title="Student Fee & Tuition Management"
      category="Financial Administration"
      description="Configure tuition fee structures, generate invoices, track payment status, and issue receipts."
      icon={FaMoneyBillWave}
      features={[
        'Custom fee categories (Tuition, Transport, Registration, Uniforms)',
        'Class and grade level fee schedule configuration',
        'Online and bank slip payment verification workflows',
        'Automated parent overdue balance SMS & email alerts',
      ]}
    />
  );
}
