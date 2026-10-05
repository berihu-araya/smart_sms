'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaBuilding } from 'react-icons/fa';

export default function DepartmentsSettingsPage() {
  return (
    <ModuleComingSoon
      title="Academic & Operational Departments"
      category="System Configuration"
      description="Organize teachers, staff, and subject faculties into structured institutional departments."
      icon={FaBuilding}
      features={[
        'Faculty department hierarchy (Science, Mathematics, Humanities, Languages, Admin)',
        'Head of Department (HOD) appointment and delegation of duties',
        'Departmental resource, budget, and subject curriculum allocation',
        'Departmental performance meeting notes and faculty analytics',
      ]}
    />
  );
}
