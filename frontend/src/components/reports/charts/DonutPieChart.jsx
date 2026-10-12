'use client';

import React, { useState, useMemo } from 'react';
import styles from './charts.module.css';

/**
 * DonutPieChart
 * Renders an interactive, SVG donut/pie chart with center stat, tooltips, and dynamic legend.
 */
export default function DonutPieChart({
  data = [],
  title = 'Distribution Breakdown',
  subtitle = 'Categorical allocation and percentages',
  centerValue = null,
  centerLabel = 'Total',
  unit = 'items',
  formatValue = null,
  emptyMessage = 'No distribution data available for this selection.',
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Filter valid data items
  const validItems = useMemo(() => {
    return data.filter((d) => (d.count ?? d.value ?? d.total_amount ?? d.total_collected ?? 0) >= 0);
  }, [data]);

  const total = useMemo(() => {
    return validItems.reduce((acc, curr) => acc + Number(curr.count ?? curr.value ?? curr.total_amount ?? curr.total_collected ?? 0), 0);
  }, [validItems]);

  // Compute slice angles and SVG path data
  const slices = useMemo(() => {
    if (total === 0) return [];

    let accumulatedAngle = 0;
    const cx = 100;
    const cy = 100;
    const R = 82; // outer radius
    const r = 52; // inner radius

    return validItems.map((item, idx) => {
      const val = Number(item.count ?? item.value ?? item.total_amount ?? item.total_collected ?? 0);
      const angle = (val / total) * 2 * Math.PI;

      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle = endAngle;

      // Outer arc points
      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);

      // Inner arc points
      const x3 = cx + r * Math.cos(endAngle);
      const y3 = cy + r * Math.sin(endAngle);
      const x4 = cx + r * Math.cos(startAngle);
      const y4 = cy + r * Math.sin(startAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      // Construct SVG path for annular segment
      let pathData = '';
      if (val === total) {
        // Complete ring fallback
        pathData = `
          M ${cx - R} ${cy}
          A ${R} ${R} 0 1 0 ${cx + R} ${cy}
          A ${R} ${R} 0 1 0 ${cx - R} ${cy}
          M ${cx - r} ${cy}
          A ${r} ${r} 0 1 1 ${cx + r} ${cy}
          A ${r} ${r} 0 1 1 ${cx - r} ${cy}
          Z
        `;
      } else {
        pathData = `
          M ${x1} ${y1}
          A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}
          L ${x3} ${y3}
          A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4}
          Z
        `;
      }

      const percent = item.percentage !== undefined ? item.percentage : (total > 0 ? Math.round((val / total) * 100) : 0);

      return {
        ...item,
        pathData,
        percent,
        val,
        color: item.color || item.gradeColor || '#4f46e5',
        label: item.label || item.name || item.payment_method || item.category_name || item.gradeLetter || `Item ${idx + 1}`,
      };
    });
  }, [validItems, total]);

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  const displayVal = (val) => {
    if (typeof formatValue === 'function') {
      return formatValue(val);
    }
    return `${Number(val).toLocaleString()} ${unit}`;
  };

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleArea}>
          <h4 className={styles.chartTitle}>{title}</h4>
          <span className={styles.chartSubtitle}>{subtitle}</span>
        </div>
      </div>

      {total > 0 ? (
        <div className={styles.donutContainer}>
          {/* SVG Donut */}
          <div className={styles.donutSvgArea}>
            <svg viewBox="0 0 200 200" className={styles.donutSvg}>
              {slices.map((slice, idx) => (
                <path
                  key={idx}
                  d={slice.pathData}
                  fill={slice.color}
                  className={styles.donutSlice}
                  style={{
                    opacity: hoveredIndex === null || hoveredIndex === idx ? 1 : 0.45,
                    transform: hoveredIndex === idx ? 'scale(1.03)' : 'scale(1)',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>

            {/* Center Dynamic Label */}
            <div className={styles.donutCenterLabel}>
              <span className={styles.donutCenterValue}>
                {activeSlice
                  ? `${activeSlice.percent}%`
                  : centerValue !== null
                  ? centerValue
                  : typeof formatValue === 'function'
                  ? formatValue(total)
                  : `${Number(total).toLocaleString()}`}
              </span>
              <span className={styles.donutCenterSubtext}>
                {activeSlice ? activeSlice.label : centerLabel}
              </span>
            </div>
          </div>

          {/* Interactive Legend */}
          <div className={styles.donutLegend}>
            {slices.map((slice, idx) => (
              <div
                key={idx}
                className={`${styles.legendItem} ${hoveredIndex === idx ? styles.legendItemActive : ''}`}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className={styles.legendInfo}>
                  <div className={styles.legendColorDot} style={{ background: slice.color }} />
                  <span className={styles.legendName}>{slice.label}</span>
                </div>
                <div className={styles.legendMeta}>
                  <span>{displayVal(slice.val)}</span>
                  <span className={styles.legendPercentage}>({slice.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.emptyChartMessage}>
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
