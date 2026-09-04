'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaTasks } from 'react-icons/fa';

export default function AssignmentsPage() {
  return (
    <ModuleComingSoon
      title="Assignments & Homework Management"
      category="Academic Operations"
      description="Create, assign, submit, and grade homework and coursework assignments online."
      icon={FaTasks}
      features={[
        'Teacher homework assignment creation with file attachments',
        'Student digital submission and deadline reminders',
        'Rubric-based evaluation and inline teacher feedback',
        'Automated gradebook synchronization with Exam Marks',
      ]}
    />
  );
}
