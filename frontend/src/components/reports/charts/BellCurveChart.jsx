'use client';

import React from 'react';
import styles from './charts.module.css';

/**
 * BellCurveChart
 * Visualizes academic score distribution as an interactive histogram with a smoothed normal distribution curve and mean indicator.
 */
export default function BellCurveChart({
  distribution = [],
  meanScore = 75,
  highestScore = 100,
  lowestScore = 0,
  totalStudents = 0,
  title = 'Academic Performance Bell Curve & Score Distribution',
  subtitle = 'Normal curve fitting across letter grade bands',
}) {
  const width = 580;
  const height = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 45;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  // Grade scales reversed (F on left, A on right for natural score progression 0 -> 100)
  const orderedTiers = [...distribution].reverse();
  const maxCount = Math.max(1, ...orderedTiers.map((t) => t.count || 0));

  const numBands = Math.max(1, orderedTiers.length);
  const bandWidth = innerWidth / numBands;

  // Build points for smooth curve spline
  const points = orderedTiers.map((tier, idx) => {
    const x = paddingLeft + idx * bandWidth + bandWidth / 2;
    const count = tier.count || 0;
    const y = paddingTop + innerHeight - (count / maxCount) * (innerHeight * 0.88);
    return { x, y, tier };
  });

  // Generate cubic bezier curve path through points
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }
  }

  // Area under curve path
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`
    : '';

  // X position of mean indicator (0 to 100 scale mapped to innerWidth)
  const meanX = paddingLeft + (Math.min(100, Math.max(0, meanScore)) / 100) * innerWidth;

  const getTierColor = (letter) => {
    if (!letter) return '#94a3b8';
    if (letter.startsWith('A')) return '#10b981';
    if (letter.startsWith('B')) return '#3b82f6';
    if (letter.startsWith('C')) return '#f59e0b';
    if (letter.startsWith('D')) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleArea}>
          <h4 className={styles.chartTitle}>{title}</h4>
          <span className={styles.chartSubtitle}>{subtitle}</span>
        </div>
      </div>

      <div className={styles.bellCurveContainer}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.bellCurveSvg}>
          <defs>
            <linearGradient id="bellCurveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = paddingTop + innerHeight * (1 - pct);
            return (
              <line
                key={idx}
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                className={styles.gridLine}
              />
            );
          })}

          {/* Area under curve */}
          {areaD && <path d={areaD} className={styles.curveArea} />}

          {/* Histogram Bars */}
          {orderedTiers.map((tier, idx) => {
            const x = paddingLeft + idx * bandWidth + 6;
            const barW = Math.max(12, bandWidth - 12);
            const count = tier.count || 0;
            const barH = (count / maxCount) * (innerHeight * 0.88);
            const y = paddingTop + innerHeight - barH;

            return (
              <g key={tier.gradeLetter}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="6"
                  ry="6"
                  fill={getTierColor(tier.gradeLetter)}
                  opacity="0.8"
                  className={styles.barRect}
                />
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill="#0f172a"
                >
                  {count > 0 ? count : ''}
                </text>
                <text
                  x={x + barW / 2}
                  y={paddingTop + innerHeight + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#1e293b"
                >
                  {tier.gradeLetter}
                </text>
                <text
                  x={x + barW / 2}
                  y={paddingTop + innerHeight + 28}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="600"
                  fill="#64748b"
                >
                  {tier.minScore}–{tier.maxScore}%
                </text>
              </g>
            );
          })}

          {/* Smooth Curve Spline */}
          {pathD && <path d={pathD} className={styles.curveLine} />}

          {/* Mean Score Indicator Line */}
          <line
            x1={meanX}
            y1={paddingTop - 6}
            x2={meanX}
            y2={paddingTop + innerHeight}
            className={styles.meanIndicator}
          />
          <g transform={`translate(${meanX}, ${paddingTop - 10})`}>
            <rect
              x="-36"
              y="-12"
              width="72"
              height="18"
              rx="9"
              fill="#ef4444"
            />
            <text
              x="0"
              y="1"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontWeight="800"
            >
              Mean {meanScore}%
            </text>
          </g>
        </svg>

        {/* Statistical Summary Row */}
        <div className={styles.barLegendRow} style={{ marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#475569' }}>
            Mean: <strong>{meanScore}%</strong>
          </span>
          <span style={{ fontSize: '0.8rem', color: '#475569' }}>
            Score Range: <strong>{lowestScore}% – {highestScore}%</strong>
          </span>
          <span style={{ fontSize: '0.8rem', color: '#166534' }}>
            Evaluated Roster: <strong>{totalStudents} students</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
