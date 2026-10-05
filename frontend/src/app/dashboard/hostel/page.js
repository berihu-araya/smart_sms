'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaBed } from 'react-icons/fa';

export default function HostelPage() {
  return (
    <ModuleComingSoon
      title="Hostel & Dormitory Administration"
      category="Campus Services"
      description="Manage residential buildings, rooms, bed allocations, and boarding student attendance."
      icon={FaBed}
      features={[
        'Hostel block, floor, and room capacity management',
        'Student room and bed assignment with vacancy tracking',
        'Warden roll-call and boarding attendance monitoring',
        'Hostel fee billing and maintenance request management',
      ]}
    />
  );
}
