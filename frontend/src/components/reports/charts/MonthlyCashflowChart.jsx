'use client';

import React, { useState, useMemo, useCallback } from 'react';
import styles from './charts.module.css';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthlyCashflowChart({
  data = [],
  year = new Date().getFullYear(),
  title = 'Annual Cash Flow Dynamics & Net Operating Margin',
  subtitle = 'Monthly comparison of incoming cash flows versus operating expenditures',
  currency = 'ETB',
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'inflow' | 'outflow' | 'net'
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Normalize monthly data for 12 months
  const monthlyData = useMemo(() => {
    const map = new Map();
    (data || []).forEach((item) => {
      map.set(Number(item.month), item);
    });

    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const raw = map.get(m) || {};
      const feeColl = Number(raw.fee_collections || 0);
      const directInc = Number(raw.direct_incomes || 0);
      const totalInc = Number(raw.total_income || feeColl + directInc);
      const opExp = Number(raw.operational_expenses || 0);
      const payrollExp = Number(raw.payroll_expenses || 0);
      const totalExp = Number(raw.total_expense || opExp + payrollExp);
      const netProfit = Number(raw.net_profit_loss || totalInc - totalExp);

      return {
        month: m,
        monthName: MONTH_NAMES[i],
        fullMonthName: FULL_MONTH_NAMES[i],
        feeCollections: feeColl,
        directIncomes: directInc,
        totalIncome: totalInc,
        operationalExpenses: opExp,
        payrollExpenses: payrollExp,
        totalExpense: totalExp,
        netProfitLoss: netProfit,
      };
    });
  }, [data]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let peakInflow = { month: 'N/A', amount: 0 };
    let peakOutflow = { month: 'N/A', amount: 0 };

    monthlyData.forEach((d) => {
      totalInflow += d.totalIncome;
      totalOutflow += d.totalExpense;
      if (d.totalIncome > peakInflow.amount) {
        peakInflow = { month: d.fullMonthName, amount: d.totalIncome };
      }
      if (d.totalExpense > peakOutflow.amount) {
        peakOutflow = { month: d.fullMonthName, amount: d.totalExpense };
      }
    });

    const netResult = totalInflow - totalOutflow;
    const margin = totalInflow > 0 ? ((netResult / totalInflow) * 100).toFixed(1) : '0.0';

    return {
      totalInflow,
      totalOutflow,
      netResult,
      margin,
      peakInflow,
      peakOutflow,
    };
  }, [monthlyData]);

  // SVG Chart Geometry
  const svgWidth = 920;
  const svgHeight = 360;
  const margin = { top: 35, right: 30, bottom: 45, left: 80 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Max value calculation
  const { maxVal, minVal } = useMemo(() => {
    let max = 0;
    let min = 0;

    monthlyData.forEach((d) => {
      if (d.totalIncome > max) max = d.totalIncome;
      if (d.totalExpense > max) max = d.totalExpense;
      if (d.netProfitLoss > max) max = d.netProfitLoss;
      if (d.netProfitLoss < min) min = d.netProfitLoss;
    });

    if (max === 0 && min === 0) {
      max = 10000;
    } else {
      // Round max up to neat increment
      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(1, max))));
      max = Math.ceil((max * 1.15) / magnitude) * magnitude;
      if (min < 0) {
        min = Math.floor((min * 1.15) / magnitude) * magnitude;
      }
    }

    return { maxVal: max, minVal: min };
  }, [monthlyData]);

  // Scale functions
  const totalRange = maxVal - minVal;
  const getY = useCallback(
    (val) => {
      if (totalRange === 0) return margin.top + plotHeight;
      const ratio = (val - minVal) / totalRange;
      return margin.top + plotHeight - ratio * plotHeight;
    },
    [minVal, totalRange, margin.top, plotHeight]
  );

  const zeroY = getY(0);

  // Month slot width and bar spacing
  const colWidth = plotWidth / 12;
  const barWidth = Math.min(22, (colWidth - 12) / 2);

  // Generate SVG gridlines
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const val = minVal + (totalRange * i) / count;
      ticks.push({
        val,
        y: getY(val),
        label:
          Math.abs(val) >= 1000000
            ? `${(val / 1000000).toFixed(1)}M`
            : Math.abs(val) >= 1000
            ? `${(val / 1000).toFixed(0)}k`
            : `${val.toFixed(0)}`,
      });
    }
    return ticks;
  }, [minVal, totalRange, getY]);

  // Generate Spline Path for Net Cash Flow
  const netCurvePath = useMemo(() => {
    const points = monthlyData.map((d, i) => {
      const cx = margin.left + i * colWidth + colWidth / 2;
      const cy = getY(d.netProfitLoss);
      return { x: cx, y: cy };
    });

    if (points.length === 0) return '';

    // Smooth Bezier path
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return d;
  }, [monthlyData, colWidth, margin.left, getY]);

  const activeTooltipData = hoveredMonth !== null ? monthlyData[hoveredMonth] : null;

  return (
    <div className={styles.chartWrapper}>
      {/* Chart Header */}
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleArea}>
          <div className={styles.chartTitle}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#4f46e5',
              }}
            />
            {title} ({year})
          </div>
          <div className={styles.chartSubtitle}>{subtitle}</div>
        </div>

        {/* View Controls */}
        <div className={styles.chartControls}>
          <button
            type="button"
            className={`${styles.controlBtn} ${filterMode === 'all' ? styles.controlBtnActive : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All Flows
          </button>
          <button
            type="button"
            className={`${styles.controlBtn} ${filterMode === 'inflow' ? styles.controlBtnActive : ''}`}
            onClick={() => setFilterMode('inflow')}
          >
            Inflow Only
          </button>
          <button
            type="button"
            className={`${styles.controlBtn} ${filterMode === 'outflow' ? styles.controlBtnActive : ''}`}
            onClick={() => setFilterMode('outflow')}
          >
            Outflow Only
          </button>
          <button
            type="button"
            className={`${styles.controlBtn} ${filterMode === 'net' ? styles.controlBtnActive : ''}`}
            onClick={() => setFilterMode('net')}
          >
            Net Margin
          </button>
        </div>
      </div>

      {/* Tooltip Overlay */}
      {activeTooltipData && (
        <div className={styles.chartTooltip}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '0.2rem' }}>
            {activeTooltipData.fullMonthName} {year}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.2rem' }}>
            <span style={{ color: '#34d399' }}>Total Inflow:</span>
            <strong>{activeTooltipData.totalIncome.toLocaleString()} {currency}</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', paddingLeft: '0.5rem' }}>
            • Fees: {activeTooltipData.feeCollections.toLocaleString()} | Direct: {activeTooltipData.directIncomes.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.2rem' }}>
            <span style={{ color: '#f87171' }}>Total Outflow:</span>
            <strong>{activeTooltipData.totalExpense.toLocaleString()} {currency}</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', paddingLeft: '0.5rem' }}>
            • OpEx: {activeTooltipData.operationalExpenses.toLocaleString()} | Payroll: {activeTooltipData.payrollExpenses.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.3rem', paddingTop: '0.2rem', borderTop: '1px solid #334155' }}>
            <span>Net Operating Margin:</span>
            <strong style={{ color: activeTooltipData.netProfitLoss >= 0 ? '#34d399' : '#f87171' }}>
              {activeTooltipData.netProfitLoss >= 0 ? '+' : ''}
              {activeTooltipData.netProfitLoss.toLocaleString()} {currency}
            </strong>
          </div>
        </div>
      )}

      {/* Main SVG Area */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={styles.barChartSvg}
          style={{ height: '360px', width: '100%', minWidth: '700px' }}
        >
          <defs>
            {/* Inflow Green Gradient */}
            <linearGradient id="cashflowInflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Outflow Red Gradient */}
            <linearGradient id="cashflowOutflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>

            {/* Net Curve Glow */}
            <filter id="netGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Gridlines */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={margin.left}
                y1={tick.y}
                x2={margin.left + plotWidth}
                y2={tick.y}
                className={styles.gridLine}
              />
              <text
                x={margin.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className={styles.axisText}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Zero Baseline */}
          {minVal < 0 && (
            <line
              x1={margin.left}
              y1={zeroY}
              x2={margin.left + plotWidth}
              y2={zeroY}
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Column Bars & Hover Zones */}
          {monthlyData.map((d, idx) => {
            const colX = margin.left + idx * colWidth;
            const isHovered = hoveredMonth === idx;

            // Inflow bar coordinates
            const inflowY = getY(d.totalIncome);
            const inflowH = Math.max(0, zeroY - inflowY);
            const barInflowX = colX + (colWidth / 2) - barWidth - 2;

            // Outflow bar coordinates
            const outflowY = getY(d.totalExpense);
            const outflowH = Math.max(0, zeroY - outflowY);
            const barOutflowX = colX + (colWidth / 2) + 2;

            // Net Profit bar (when net mode is active)
            const netY = d.netProfitLoss >= 0 ? getY(d.netProfitLoss) : zeroY;
            const netH = Math.max(1, Math.abs(getY(d.netProfitLoss) - zeroY));
            const barNetX = colX + (colWidth - barWidth * 1.5) / 2;

            return (
              <g
                key={d.month}
                onMouseEnter={() => setHoveredMonth(idx)}
                onMouseLeave={() => setHoveredMonth(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background hover column highlight */}
                {isHovered && (
                  <rect
                    x={colX}
                    y={margin.top}
                    width={colWidth}
                    height={plotHeight}
                    fill="#f1f5f9"
                    opacity="0.6"
                    rx="8"
                  />
                )}

                {/* Bars Rendering */}
                {filterMode === 'net' ? (
                  /* Net Profit Bar */
                  <rect
                    x={barNetX}
                    y={netY}
                    width={barWidth * 1.5}
                    height={netH}
                    fill={d.netProfitLoss >= 0 ? 'url(#cashflowInflowGrad)' : 'url(#cashflowOutflowGrad)'}
                    rx="4"
                    opacity={isHovered ? 1 : 0.9}
                  />
                ) : (
                  <>
                    {/* Inflow Bar */}
                    {(filterMode === 'all' || filterMode === 'inflow') && (
                      <rect
                        x={filterMode === 'inflow' ? colX + (colWidth - barWidth * 1.4) / 2 : barInflowX}
                        y={inflowY}
                        width={filterMode === 'inflow' ? barWidth * 1.4 : barWidth}
                        height={inflowH}
                        fill="url(#cashflowInflowGrad)"
                        rx="4"
                        opacity={isHovered ? 1 : 0.88}
                      />
                    )}

                    {/* Outflow Bar */}
                    {(filterMode === 'all' || filterMode === 'outflow') && (
                      <rect
                        x={filterMode === 'outflow' ? colX + (colWidth - barWidth * 1.4) / 2 : barOutflowX}
                        y={outflowY}
                        width={filterMode === 'outflow' ? barWidth * 1.4 : barWidth}
                        height={outflowH}
                        fill="url(#cashflowOutflowGrad)"
                        rx="4"
                        opacity={isHovered ? 1 : 0.88}
                      />
                    )}
                  </>
                )}

                {/* X-axis Month Label */}
                <text
                  x={colX + colWidth / 2}
                  y={margin.top + plotHeight + 20}
                  textAnchor="middle"
                  className={styles.axisText}
                  style={{
                    fontWeight: isHovered ? 800 : 600,
                    fill: isHovered ? '#4f46e5' : '#64748b',
                    fontSize: '12px',
                  }}
                >
                  {d.monthName}
                </text>
              </g>
            );
          })}

          {/* Net Margin Trend Line (Shown in 'all' and 'net' mode) */}
          {(filterMode === 'all' || filterMode === 'net') && (
            <g>
              <path
                d={netCurvePath}
                fill="none"
                stroke="#6366f1"
                strokeWidth="3.5"
                filter="url(#netGlow)"
              />

              {/* Data points on the line */}
              {monthlyData.map((d, i) => {
                const cx = margin.left + i * colWidth + colWidth / 2;
                const cy = getY(d.netProfitLoss);
                const isHovered = hoveredMonth === i;

                return (
                  <circle
                    key={d.month}
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4}
                    fill={d.netProfitLoss >= 0 ? '#10b981' : '#f43f5e'}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Legend & Summary Metrics */}
      <div className={styles.barLegendRow}>
        {(filterMode === 'all' || filterMode === 'inflow') && (
          <div className={styles.barLegendItem}>
            <div
              className={styles.barLegendBox}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' }}
            />
            <span>Total Inflow (Revenue)</span>
          </div>
        )}

        {(filterMode === 'all' || filterMode === 'outflow') && (
          <div className={styles.barLegendItem}>
            <div
              className={styles.barLegendBox}
              style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)' }}
            />
            <span>Total Outflow (OpEx + Payroll)</span>
          </div>
        )}

        {(filterMode === 'all' || filterMode === 'net') && (
          <div className={styles.barLegendItem}>
            <div
              style={{
                width: 22,
                height: 4,
                background: '#6366f1',
                borderRadius: 2,
              }}
            />
            <span>Net Operating Margin Trend</span>
          </div>
        )}
      </div>

      {/* Executive Quick Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          marginTop: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Annual Gross Inflow
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669', marginTop: '0.15rem' }}>
            {stats.totalInflow.toLocaleString()} {currency}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            Peak: {stats.peakInflow.month}
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Annual Total Outflow
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626', marginTop: '0.15rem' }}>
            {stats.totalOutflow.toLocaleString()} {currency}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            Peak: {stats.peakOutflow.month}
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Net Operating Result
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: stats.netResult >= 0 ? '#059669' : '#dc2626',
              marginTop: '0.15rem',
            }}
          >
            {stats.netResult >= 0 ? '+' : ''}
            {stats.netResult.toLocaleString()} {currency}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Margin: <strong>{stats.margin}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
