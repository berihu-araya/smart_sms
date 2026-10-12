'use client';

import React from 'react';
import styles from './charts.module.css';

/**
 * RadialGaugeChart
 * Renders an executive semi-circle radial gauge with grade badges and performance status.
 */
export default function RadialGaugeChart({
  value = 0,
  max = 100,
  title = 'Institutional Mean Score',
  subtitle = 'Overall academic achievement index',
  gradeLetter = 'B',
  gradeDescription = 'Very Good / Above Average',
  badgeText = null,
  midLabel = '50% Target',
  valueSuffix = '%',
}) {
  const numValue = Math.min(max, Math.max(0, Number(value || 0)));
  const percentage = (numValue / max) * 100;

  // Arc calculations for 180-degree semi-circle
  // Radius R = 85, Arc length = Math.PI * 85 = 267.04
  const radius = 85;
  const strokeLength = Math.PI * radius;
  const strokeOffset = strokeLength * (1 - percentage / 100);

  const getThemeColor = (val) => {
    if (val >= 80) return '#10b981'; // emerald
    if (val >= 70) return '#4f46e5'; // indigo
    if (val >= 60) return '#3b82f6'; // blue
    if (val >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // rose
  };

  const currentColor = getThemeColor(percentage);

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleArea}>
          <h4 className={styles.chartTitle}>{title}</h4>
          <span className={styles.chartSubtitle}>{subtitle}</span>
        </div>
      </div>

      <div className={styles.gaugeContainer}>
        <svg viewBox="0 0 220 135" className={styles.gaugeSvg}>
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 25 115 A 85 85 0 0 1 195 115"
            className={styles.gaugeTrack}
          />

          {/* Active Progress Arc */}
          <path
            d="M 25 115 A 85 85 0 0 1 195 115"
            className={styles.gaugeProgress}
            stroke={currentColor}
            strokeDasharray={strokeLength}
            strokeDashoffset={strokeOffset}
          />

          {/* 50% Benchmark Needle Marker */}
          <circle cx="110" cy="30" r="3" fill="#cbd5e1" />
        </svg>

        {/* Center Big Value & Grade Badge */}
        <div className={styles.gaugeCenterContent}>
          <div className={styles.gaugeBigScore}>{numValue.toFixed(1)}{valueSuffix}</div>
          <div
            className={styles.gaugeGradeBadge}
            style={{ background: currentColor }}
          >
            {badgeText || `Grade ${gradeLetter || '—'} • ${gradeDescription}`}
          </div>
        </div>

        {/* Min / Max Tick Row */}
        <div className={styles.gaugeTicksRow}>
          <span>0{valueSuffix}</span>
          <span style={{ color: '#d97706', fontSize: '0.72rem' }}>{midLabel}</span>
          <span>{max}{valueSuffix}</span>
        </div>
      </div>
    </div>
  );
}
