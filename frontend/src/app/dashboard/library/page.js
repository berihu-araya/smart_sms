'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaBookReader } from 'react-icons/fa';

export default function LibraryPage() {
  return (
    <ModuleComingSoon
      title="Library & Media Resource Management"
      category="Campus Services"
      description="Catalog books, manage borrowing and returns, and track student resource utilization."
      icon={FaBookReader}
      features={[
        'ISBN cataloging and digital book inventory management',
        'Barcode scanner support for instant issue and return',
        'Overdue book alerts and automatic fine calculation',
        'Student reading history and library usage analytics',
      ]}
    />
  );
}
