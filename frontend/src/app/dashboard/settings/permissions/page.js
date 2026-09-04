'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaKey } from 'react-icons/fa';

export default function PermissionsSettingsPage() {
  return (
    <ModuleComingSoon
      title="Granular Permissions & Scope Matrix"
      category="System Configuration"
      description="Define granular resource-level read, create, update, and publish permissions for custom roles."
      icon={FaKey}
      features={[
        'Matrix of permissions across all 16 system modules and entities',
        'Custom role creation with fine-grained access toggles',
        'Teacher data scope constraints (own classes only vs. all school)',
        'Administrative delegation and temporary role elevation privileges',
      ]}
    />
  );
}
