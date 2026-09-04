'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaBus } from 'react-icons/fa';

export default function TransportPage() {
  return (
    <ModuleComingSoon
      title="Fleet & Student Transport Logistics"
      category="Campus Services"
      description="Manage school bus routes, stops, vehicle maintenance, and student passenger allocations."
      icon={FaBus}
      features={[
        'Bus route and designated pickup/drop-off stop mapping',
        'Vehicle fleet registration, driver assignments, and fuel tracking',
        'Student passenger roster per bus and route schedule',
        'Real-time transit notifications for parents',
      ]}
    />
  );
}
