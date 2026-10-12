'use client';

import React, { useState } from 'react';
import styles from './charts.module.css';

/**
 * SubjectBarChart
 * Multi-metric vertical bar chart with SVG rendering, passing reference lines, and interactive tooltips.
 */
export default function SubjectBarChart({
  subjects = [],
  title = 'Subject Performance & Pass Rate Comparison',
  subtitle = 'Institutional averages and mastery rates by subject',
}) {
  const [metricMode, setMetricMode] = useState('both'); // 'both' | 'mean' | 'passRate'
  const [hoveredSubject, setHoveredSubject] = useState(null);

  const chartHeight = 220;
  const chartWidth = 600;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 45;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const validSubjects = subjects.filter((s) => s.assessedCount > 0 || s.averageScore > 0);

  const numSubjects = Math.max(1, validSubjects.length);
  const bandWidth = innerWidth / numSubjects;

  // Bar widths
  const showBoth = metricMode === 'both';
  const showMean = metricMode === 'both' || metricMode === 'mean';
  const showPass = metricMode === 'both' || metricMode === 'passRate';

  const singleBarWidth = showBoth ? Math.min(22, bandWidth * 0.32) : Math.min(36, bandWidth * 0.55);
  const barGap = 4;

  // Y-axis grid values
  const yTicks = [0, 25, 50, 75, 100];
  const passY = paddingTop + innerHeight * (1 - 50 / 100);

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleArea}>
          <h4 className={styles.chartTitle}>{title}</h4>
          <span className={styles.chartSubtitle}>{subtitle}</span>
        </div>

        <div className={styles.chartControls}>
          <button
            type="button"
            className={`${styles.controlBtn} ${metricMode === 'both' ? styles.controlBtnActive : ''}`}
            onClick={() => setMetricMode('both')}
          >
            Both Metrics
          </button>
          <button
            type="button"
            className={`${styles.controlBtn} ${metricMode === 'mean' ? styles.controlBtnActive : ''}`}
            onClick={() => setMetricMode('mean')}
          >
            Mean Score
          </button>
          <button
            type="button"
            className={`${styles.controlBtn} ${metricMode === 'passRate' ? styles.controlBtnActive : ''}`}
            onClick={() => setMetricMode('passRate')}
          >
            Pass Rate %
          </button>
        </div>
      </div>

      {validSubjects.length > 0 ? (
        <div className={styles.barChartContainer}>
          {hoveredSubject && (
            <div className={styles.chartTooltip}>
              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.85rem' }}>
                {hoveredSubject.subjectName} ({hoveredSubject.subjectCode || 'GEN'})
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem' }}>
                <span style={{ color: '#818cf8' }}>
                  Mean: <strong>{hoveredSubject.averageScore}%</strong>
                </span>
                <span style={{ color: '#34d399' }}>
                  Pass Rate: <strong>{hoveredSubject.passRate}%</strong>
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                Highest: {hoveredSubject.highestScore}% • Lowest: {hoveredSubject.lowestScore}% • Assessed: {hoveredSubject.assessedCount}
              </div>
            </div>
          )}

          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.barChartSvg}>
            <defs>
              {/* Primary Mean Score Gradient */}
              <linearGradient id="meanScoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>

              {/* Pass Rate Gradient */}
              <linearGradient id="passRateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Gridlines & Y-Axis Labels */}
            {yTicks.map((val) => {
              const y = paddingTop + innerHeight * (1 - val / 100);
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    className={styles.gridLine}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className={styles.axisText}
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {/* 50% Passing Threshold Guideline */}
            <line
              x1={paddingLeft}
              y1={passY}
              x2={chartWidth - paddingRight}
              y2={passY}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              opacity="0.85"
            />
            <text
              x={chartWidth - paddingRight - 4}
              y={passY - 5}
              textAnchor="end"
              fill="#d97706"
              fontSize="9"
              fontWeight="700"
            >
              50% Pass Benchmark
            </text>

            {/* Subject Bars */}
            {validSubjects.map((sub, idx) => {
              const bandCenter = paddingLeft + idx * bandWidth + bandWidth / 2;

              const meanVal = Math.min(100, Math.max(0, sub.averageScore || 0));
              const passVal = Math.min(100, Math.max(0, sub.passRate || 0));

              const meanHeight = (meanVal / 100) * innerHeight;
              const passHeight = (passVal / 100) * innerHeight;

              const meanY = paddingTop + innerHeight - meanHeight;
              const passYPos = paddingTop + innerHeight - passHeight;

              const meanX = showBoth
                ? bandCenter - singleBarWidth - barGap / 2
                : bandCenter - singleBarWidth / 2;
              const passX = showBoth
                ? bandCenter + barGap / 2
                : bandCenter - singleBarWidth / 2;

              return (
                <g
                  key={sub.subjectId}
                  onMouseEnter={() => setHoveredSubject(sub)}
                  onMouseLeave={() => setHoveredSubject(null)}
                >
                  {/* Mean Score Bar */}
                  {showMean && (
                    <rect
                      x={meanX}
                      y={meanY}
                      width={singleBarWidth}
                      height={meanHeight}
                      rx="4"
                      ry="4"
                      fill="url(#meanScoreGrad)"
                      className={styles.barRect}
                    />
                  )}

                  {/* Pass Rate Bar */}
                  {showPass && (
                    <rect
                      x={passX}
                      y={passYPos}
                      width={singleBarWidth}
                      height={passHeight}
                      rx="4"
                      ry="4"
                      fill="url(#passRateGrad)"
                      className={styles.barRect}
                    />
                  )}

                  {/* Subject Name / Code Label */}
                  <text
                    x={bandCenter}
                    y={paddingTop + innerHeight + 18}
                    textAnchor="middle"
                    fill="#334155"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {sub.subjectCode || sub.subjectName?.slice(0, 4)}
                  </text>
                  <text
                    x={bandCenter}
                    y={paddingTop + innerHeight + 32}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {sub.subjectName?.length > 10 ? `${sub.subjectName.slice(0, 9)}…` : sub.subjectName}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className={styles.barLegendRow}>
            {showMean && (
              <div className={styles.barLegendItem}>
                <div className={styles.barLegendBox} style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }} />
                <span>Subject Mean Score %</span>
              </div>
            )}
            {showPass && (
              <div className={styles.barLegendItem}>
                <div className={styles.barLegendBox} style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }} />
                <span>Pass Rate % ( $\ge$ 50% )</span>
              </div>
            )}
            <div className={styles.barLegendItem}>
              <div style={{ width: '16px', height: '2px', background: '#f59e0b', borderTop: '2px dashed #f59e0b' }} />
              <span style={{ color: '#d97706' }}>50% Pass Benchmark</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyChartMessage}>
          No evaluated subjects recorded for this academic scope.
        </div>
      )}
    </div>
  );
}
