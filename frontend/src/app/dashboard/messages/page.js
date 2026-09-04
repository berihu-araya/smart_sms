'use client';

import React from 'react';
import ModuleComingSoon from '@/components/common/ModuleComingSoon';
import { FaEnvelope } from 'react-icons/fa';

export default function MessagesPage() {
  return (
    <ModuleComingSoon
      title="Direct Parent-Teacher Messaging"
      category="Communication Hub"
      description="Facilitate direct, structured communication between parents, class teachers, and school administrators."
      icon={FaEnvelope}
      features={[
        'Threaded direct 1-to-1 teacher-parent messaging',
        'Subject teacher inquiry channels for academic performance questions',
        'Official administrative contact requests and inquiry logging',
        'Attachment sharing for homework notes and medical certificates',
      ]}
    />
  );
}
