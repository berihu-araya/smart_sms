'use client';

import React from 'react';
import Link from 'next/link';
import {
  HiArrowLeft,
  HiClock,
  HiSparkles,
  HiShieldCheck,
  HiCheckCircle2,
} from 'react-icons/hi2';

export default function ModuleComingSoon({
  title = 'Module in Development',
  category = 'Campus System',
  description = 'This module is scheduled for release in the next update milestone.',
  features = [],
  icon: Icon,
}) {
  return (
    <div
      style={{
        padding: '2.5rem 1.5rem',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Header Back Link */}
      <div>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.875rem',
            color: '#64748b',
            textDecoration: 'none',
            fontWeight: 600,
            padding: '0.4rem 0.8rem',
            borderRadius: '0.375rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            transition: 'all 0.15s',
          }}
        >
          <HiArrowLeft /> Back to Dashboard
        </Link>
      </div>

      {/* Hero Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '2.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
          }}
        >
          {Icon ? <Icon /> : <HiSparkles />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              alignSelf: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#4f46e5',
              background: '#eef2ff',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
            }}
          >
            <HiClock /> {category} • Milestone Phase
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            {title}
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '560px', margin: '0 auto', lineHeight: 1.6 }}>
            {description}
          </p>
        </div>

        {/* Feature Preview List */}
        {features.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              width: '100%',
              maxWidth: '600px',
              textAlign: 'left',
              background: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem 1.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <HiShieldCheck color="#4f46e5" /> Planned Features & Capabilities:
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {features.map((feat, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '0.85rem',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#4f46e5',
                      flexShrink: 0,
                    }}
                  />
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
