"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  HiAcademicCap,
  HiArrowDownTray,
  HiArrowPath,
  HiArrowTrendingDown,
  HiArrowTrendingUp,
  HiBanknotes,
  HiBellAlert,
  HiBolt,
  HiBookOpen,
  HiCalendarDays,
  HiChartBarSquare,
  HiCheckBadge,
  HiCheckCircle,
  HiClipboardDocumentList,
  HiClock,
  HiCreditCard,
  HiCurrencyDollar,
  HiExclamationTriangle,
  HiIdentification,
  HiInformationCircle,
  HiMagnifyingGlass,
  HiOutlineArrowUpRight,
  HiOutlineUserGroup,
  HiPresentationChartLine,
  HiPrinter,
  HiReceiptPercent,
  HiScale,
  HiShieldCheck,
  HiSparkles,
  HiUserGroup,
} from "react-icons/hi2";

import { useAuth } from "@/hooks/useAuth";
import { request } from "@/services/apiClient";
import { exportToCSV } from "@/utils/csvExport";
import styles from "./page.module.css";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const emptyData = {
  stats: {},
  attendance: { trend: [] },
  performance: { distribution: [] },
  enrollmentTrend: [],
  sectionOverview: [],
  recentActivity: [],
  finance: {
    summary: {
      totalFeesInvoiced: 0,
      totalFeesCollected: 0,
      totalFeesOutstanding: 0,
      totalOtherIncome: 0,
      totalIncome: 0,
      totalExpenses: 0,
      totalPayroll: 0,
      totalOutflow: 0,
      netCashFlow: 0,
      collectionEfficiency: 0,
      currency: "ETB",
    },
    invoices: {
      totalInvoices: 0,
      paidCount: 0,
      partiallyPaidCount: 0,
      unpaidCount: 0,
      overdueCount: 0,
      totalInvoiced: 0,
      totalPaid: 0,
      totalBalance: 0,
    },
    pendingBankSlipsCount: 0,
    monthlyTrend: [],
    recentPayments: [],
    recentExpenses: [],
  },
  payroll: {
    activeSalaryStructuresCount: 0,
    monthlyPayrollCommitment: 0,
    totalDisbursedAllTime: 0,
    latestRun: null,
    recentRuns: [],
  },
};

function number(value) {
  const num = Number(value || 0);
  return isNaN(num) ? "0" : num.toLocaleString();
}

function percent(value) {
  const num = Number(value || 0);
  if (isNaN(num)) return "0%";
  return `${num.toFixed(1).replace(".0", "")}%`;
}

function currency(value, symbol = "ETB") {
  const num = Number(value || 0);
  if (isNaN(num)) return `${symbol} 0.00`;
  return `${symbol} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYROLL_STATUS_MAP = {
  DRAFT: { label: "Draft", className: styles.statusDraft },
  CALCULATED: { label: "Calculated", className: styles.statusCalculated },
  REVIEWED: { label: "Reviewed", className: styles.statusReviewed },
  APPROVED: { label: "Approved", className: styles.statusApproved },
  PAID: { label: "Disbursed", className: styles.statusPaid },
  DONE: { label: "Closed", className: styles.statusClosed },
  CLOSED: { label: "Closed", className: styles.statusClosed },
};

function Metric({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className={`${styles.metric} ${styles[`metric${tone}`] || ""}`}>
      <div className={styles.metricIcon}><Icon aria-hidden="true" /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

function PanelHeader({ eyebrow, title, action }) {
  return (
    <div className={styles.panelHeader}>
      <div>
        <span className={styles.panelEyebrow}>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ==========================================================================
   SMART EXECUTIVE PULSE & AI RECOMMENDATIONS COMPONENT
   ========================================================================== */

function SmartExecutivePulse({ dashboard, onPrint, onExportCSV }) {
  const stats = dashboard?.stats || {};
  const finance = dashboard?.finance?.summary || {};
  const invoices = dashboard?.finance?.invoices || {};
  const payroll = dashboard?.payroll || {};

  // Compute composite Institutional Health Score (0 - 100%)
  const attendanceRate = Number(stats.attendanceRate || 0);
  const passRate = Number(stats.passRate || 0);
  const collectionEfficiency = Number(finance.collectionEfficiency || 0);

  // Weighted calculation: Attendance (35%), Collection (35%), Pass Rate (30%)
  const rawScore = (attendanceRate * 0.35) + (collectionEfficiency * 0.35) + (passRate * 0.30);
  const healthScore = Math.min(100, Math.max(0, Math.round(rawScore || 92)));

  const healthGrade = healthScore >= 90
    ? "Optimal Operations"
    : healthScore >= 75
      ? "Stable Performance"
      : "Attention Required";

  const strokeDash = 2 * Math.PI * 26; // radius = 26
  const strokeOffset = strokeDash - (strokeDash * healthScore) / 100;

  // Generate dynamic actionable insights
  const insights = [];

  const pendingSlips = Number(dashboard?.finance?.pendingBankSlipsCount || 0);
  if (pendingSlips > 0) {
    insights.push({
      type: "alert",
      badge: "Action Required",
      text: `${pendingSlips} bank deposit slip${pendingSlips > 1 ? "s" : ""} pending bursar verification.`,
      link: "/dashboard/fees?tab=bank_slips",
      linkText: "Verify Slips",
    });
  }

  const outstandingBalance = Number(finance.totalFeesOutstanding || invoices.totalBalance || 0);
  if (outstandingBalance > 0) {
    insights.push({
      type: "info",
      badge: "Receivables",
      text: `${currency(outstandingBalance, finance.currency || "ETB")} in outstanding fees across ${number(invoices.unpaidCount + invoices.overdueCount)} student invoices.`,
      link: "/dashboard/fees?tab=invoices",
      linkText: "Fee Invoices",
    });
  }

  if (attendanceRate > 0 && attendanceRate < 85) {
    insights.push({
      type: "alert",
      badge: "Student Wellbeing",
      text: `Schoolwide attendance is at ${percent(attendanceRate)} (target is 90%+).`,
      link: "/dashboard/reports/attendance",
      linkText: "Attendance Audit",
    });
  }

  if (payroll?.latestRun?.status === "DRAFT" || payroll?.latestRun?.status === "CALCULATED") {
    insights.push({
      type: "info",
      badge: "Payroll Cycle",
      text: `Current payroll batch "${payroll.latestRun.batch_reference}" is in ${payroll.latestRun.status} status awaiting approval.`,
      link: "/dashboard/payroll?tab=runs",
      linkText: "Review Payroll",
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "success",
      badge: "System Optimal",
      text: "All academic operations, fee receivables, and class rosters are synchronized and up to date.",
      link: "/dashboard/reports/academic",
      linkText: "View Reports",
    });
  }

  return (
    <section className={styles.smartPulseBanner} aria-label="Smart Executive Intelligence Pulse">
      {/* Radial Health Gauge */}
      <div className={styles.healthGauge}>
        <div className={styles.gaugeCircle}>
          <svg className={styles.gaugeSvg} viewBox="0 0 60 60">
            <circle className={styles.gaugeBg} cx="30" cy="30" r="26" />
            <circle
              className={styles.gaugeFill}
              cx="30"
              cy="30"
              r="26"
              style={{
                strokeDasharray: strokeDash,
                strokeDashoffset: strokeOffset,
                stroke: healthScore >= 85 ? "#10b981" : healthScore >= 70 ? "#f59e0b" : "#ef4444",
              }}
            />
          </svg>
          <span className={styles.gaugeScore}>{healthScore}%</span>
        </div>
        <div className={styles.healthMeta}>
          <span>Institution Health Index</span>
          <strong>{healthGrade}</strong>
        </div>
      </div>

      {/* Smart Insights & Action Recommendations Feed */}
      <div className={styles.smartInsightsList}>
        {insights.slice(0, 2).map((item, idx) => (
          <div className={styles.smartInsightItem} key={`insight-${idx}`}>
            <span className={item.type === "alert" ? styles.insightBadgeAlert : styles.insightBadgeSuccess}>
              {item.type === "alert" ? <HiBolt /> : <HiCheckBadge />} {item.badge}
            </span>
            <span>{item.text}</span>
            <Link href={item.link} className={styles.textLink} style={{ color: "#a5b4fc", textDecoration: "underline" }}>
              {item.linkText} <HiOutlineArrowUpRight />
            </Link>
          </div>
        ))}
      </div>

      {/* Quick Executive Tools */}
      <div className={styles.smartPulseActions}>
        <button type="button" className={styles.smartPulseBtn} onClick={onPrint} title="Print executive summary">
          <HiPrinter /> Print Summary
        </button>
        <button type="button" className={styles.smartPulseBtn} onClick={onExportCSV} title="Export financial CSV">
          <HiArrowDownTray /> Export Financials
        </button>
      </div>
    </section>
  );
}

/* ==========================================================================
   ACADEMIC & OPERATIONS PANELS
   ========================================================================== */

function AttendancePanel({ attendance }) {
  const att = attendance || {};
  const present = Number(att.present || 0);
  const absent = Number(att.absent || 0);
  const late = Number(att.late || 0);
  const excused = Number(att.excused || 0);
  const total = present + absent + late + excused;

  const presentWidth = total ? (present / total) * 100 : 0;
  const lateWidth = total ? (late / total) * 100 : 0;
  const absentWidth = total ? (absent / total) * 100 : 0;
  const rate = Number(att.rate || 0);

  return (
    <section className={`${styles.panel} ${styles.attendancePanel}`}>
      <PanelHeader
        eyebrow="Student wellbeing"
        title="Attendance pulse"
        action={<Link href="/dashboard/reports/attendance" className={styles.textLink}>Open report <HiOutlineArrowUpRight /></Link>}
      />
      <div className={styles.attendanceBody}>
        <div className={styles.attendanceScore}>
          <div className={styles.scoreRing} style={{ "--attendance": `${rate}%` }}>
            <div><strong>{percent(rate)}</strong><span>present</span></div>
          </div>
          <div className={styles.attendanceLegend}>
            <span><i className={styles.dotPresent} />Present <b>{number(present)}</b></span>
            <span><i className={styles.dotLate} />Late <b>{number(late)}</b></span>
            <span><i className={styles.dotAbsent} />Absent <b>{number(absent)}</b></span>
          </div>
        </div>
        <div className={styles.trendChart}>
          <div className={styles.chartCaption}><span>Last 5 weeks</span><b>Presence trend</b></div>
          <div className={styles.chartBars}>
            {(att.trend || []).map((point, index) => (
              <div className={styles.chartBarItem} key={point.key || point.label || `att-point-${index}`}>
                <div className={styles.chartBarTrack}><span style={{ height: `${Math.max(Number(point.rate || 0), 4)}%` }} /></div>
                <small>{point.label || `W${index + 1}`}</small>
              </div>
            ))}
            {!att.trend?.length && <p className={styles.emptyChart}>Attendance history will appear here once records are captured.</p>}
          </div>
        </div>
      </div>
      <div className={styles.stackedBar} aria-label="Attendance status distribution">
        <span className={styles.stackPresent} style={{ width: `${presentWidth}%` }} />
        <span className={styles.stackLate} style={{ width: `${lateWidth}%` }} />
        <span className={styles.stackAbsent} style={{ width: `${absentWidth}%` }} />
      </div>
    </section>
  );
}

function PerformancePanel({ performance }) {
  const perf = performance || {};
  const distribution = Array.isArray(perf.distribution) ? perf.distribution : [];
  const maxCount = Math.max(...distribution.map((item) => Number(item.count || 0)), 1);

  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="Academic outcomes"
        title="Performance mix"
        action={<Link href="/dashboard/reports/academic" className={styles.iconLink} aria-label="Open academic report" title="Open academic report"><HiOutlineArrowUpRight /></Link>}
      />
      <div className={styles.performanceSummary}>
        <div><strong>{percent(perf.averageScore)}</strong><span>average score</span></div>
        <div className={styles.passRate}><HiCheckCircle /><strong>{percent(perf.passRate)}</strong><span>passing</span></div>
      </div>
      <div className={styles.distribution}>
        {distribution.map((item, index) => (
          <div className={styles.distributionRow} key={item.key || item.label || `perf-row-${index}`}>
            <div><span>{item.label}</span><b>{number(item.count)}</b></div>
            <div className={styles.distributionTrack}><span className={styles[`distributionColor${index % 4}`]} style={{ width: `${(Number(item.count || 0) / maxCount) * 100}%` }} /></div>
          </div>
        ))}
        {!distribution.length && <p className={styles.emptyState}>Publish marks to see the academic distribution.</p>}
      </div>
    </section>
  );
}

function EnrollmentPanel({ trend }) {
  const trendList = Array.isArray(trend) ? trend : [];
  const maxCount = Math.max(...trendList.map((item) => Number(item.count || 0)), 1);

  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="Admissions"
        title="Enrollment momentum"
        action={<Link href="/dashboard/students" className={styles.textLink}>Student register <HiOutlineArrowUpRight /></Link>}
      />
      <div className={styles.enrollmentChart}>
        {trendList.map((item, index) => (
          <div className={styles.enrollmentBarItem} key={item.key || item.label || `enr-bar-${index}`}>
            <strong>{number(item.count)}</strong>
            <div className={styles.enrollmentBarTrack}><span style={{ height: `${Math.max((Number(item.count || 0) / maxCount) * 100, 5)}%` }} /></div>
            <small>{item.label || `M${index + 1}`}</small>
          </div>
        ))}
        {!trendList.length && <p className={styles.emptyChart}>New admissions will form a six-month trend here.</p>}
      </div>
    </section>
  );
}

function SectionPanel({ sections }) {
  const secList = Array.isArray(sections) ? sections : [];

  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="School structure"
        title="Busiest sections"
        action={<Link href="/dashboard/sections" className={styles.textLink}>Manage sections <HiOutlineArrowUpRight /></Link>}
      />
      <div className={styles.sectionList}>
        {secList.map((section, index) => (
          <div className={styles.sectionRow} key={section.id || `sec-${index}`}>
            <span className={styles.sectionRank}>0{index + 1}</span>
            <div className={styles.sectionName}><b>{section.name}</b><span>{number(section.students)} enrolled</span></div>
            <div className={styles.sectionMeter}><span style={{ width: `${Math.min(Number(section.students || 0) * 2, 100)}%` }} /></div>
          </div>
        ))}
        {!secList.length && <p className={styles.emptyState}>Create sections to see enrollment concentration.</p>}
      </div>
    </section>
  );
}

function ActivityPanel({ activities }) {
  const actList = Array.isArray(activities) ? activities : [];

  return (
    <section className={styles.panel}>
      <PanelHeader eyebrow="Live feed" title="Recent activity" action={<HiClock className={styles.panelIcon} />} />
      <div className={styles.activityList}>
        {actList.slice(0, 5).map((activity, index) => (
          <div className={styles.activityRow} key={activity.id || `act-row-${index}`}>
            <span className={styles.activityIcon}><HiArrowTrendingUp /></span>
            <div><b>{activity.title}</b><p>{activity.description}</p></div>
            <time>{activity.timestamp ? new Date(activity.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</time>
          </div>
        ))}
        {!actList.length && <p className={styles.emptyState}>New records and assessments will appear in this feed.</p>}
      </div>
    </section>
  );
}

/* ==========================================================================
   FINANCE & PAYROLL PANELS
   ========================================================================== */

function FinanceHeroPanel({ finance, payroll }) {
  const summary = finance?.summary || {};
  const curr = summary.currency || finance?.currency || "ETB";
  const netCashFlow = Number(summary.netCashFlow || 0);
  const isPositive = netCashFlow >= 0;

  return (
    <section className={`${styles.panel} ${styles.financeHeroPanel}`}>
      <div className={styles.cashFlowHeader}>
        <div className={styles.cashFlowHeadline}>
          <div className={styles.cashFlowValue}>
            <span>Net Operating Cash Flow</span>
            <strong>{currency(netCashFlow, curr)}</strong>
          </div>
          <span className={`${styles.cashFlowBadge} ${isPositive ? styles.cashFlowPositive : styles.cashFlowNegative}`}>
            {isPositive ? <HiArrowTrendingUp /> : <HiArrowTrendingDown />}
            {isPositive ? "Surplus" : "Deficit"}
          </span>
        </div>

        <div className={styles.efficiencyMeterWrap}>
          <span>Fee Collection Efficiency:</span>
          <b>{percent(summary.collectionEfficiency || 0)}</b>
        </div>
      </div>

      <div className={styles.financeCardsGrid}>
        <article className={`${styles.financeMiniCard} ${styles.cardFee}`}>
          <div className={styles.miniCardHeader}>
            <span>Fee Invoiced</span>
            <HiReceiptPercent className={styles.miniCardIcon} />
          </div>
          <strong>{currency(summary.totalFeesInvoiced || summary.totalInvoiced, curr)}</strong>
          <small>Collected: {currency(summary.totalFeesCollected || summary.totalCollected, curr)} ({percent(summary.collectionEfficiency)})</small>
        </article>

        <article className={`${styles.financeMiniCard} ${styles.cardIncome}`}>
          <div className={styles.miniCardHeader}>
            <span>Other Incomes</span>
            <HiCurrencyDollar className={styles.miniCardIcon} />
          </div>
          <strong>{currency(summary.totalOtherIncome, curr)}</strong>
          <small>Total Inflow: {currency(summary.totalIncome, curr)}</small>
        </article>

        <article className={`${styles.financeMiniCard} ${styles.cardExpense}`}>
          <div className={styles.miniCardHeader}>
            <span>Direct Expenses</span>
            <HiCreditCard className={styles.miniCardIcon} />
          </div>
          <strong>{currency(summary.totalExpenses, curr)}</strong>
          <small>Operational outflow logged</small>
        </article>

        <article className={`${styles.financeMiniCard} ${styles.cardPayroll}`}>
          <div className={styles.miniCardHeader}>
            <span>Payroll Commitment</span>
            <HiBanknotes className={styles.miniCardIcon} />
          </div>
          <strong>{currency(payroll?.monthlyPayrollCommitment, curr)}</strong>
          <small>{number(payroll?.activeSalaryStructuresCount)} active staff salary profiles</small>
        </article>
      </div>
    </section>
  );
}

function InvoiceBillingPanel({ invoices, pendingBankSlipsCount, currencySymbol = "ETB" }) {
  const inv = invoices || {};
  const total = Number(inv.totalInvoices || 0);

  const paidPct = total ? (Number(inv.paidCount || 0) / total) * 100 : 0;
  const partialPct = total ? (Number(inv.partiallyPaidCount || 0) / total) * 100 : 0;
  const unpaidPct = total ? (Number(inv.unpaidCount || 0) / total) * 100 : 0;
  const overduePct = total ? (Number(inv.overdueCount || 0) / total) * 100 : 0;

  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="Student Billing"
        title="Fee Invoices & Receivables"
        action={<Link href="/dashboard/fees?tab=invoices" className={styles.textLink}>All invoices <HiOutlineArrowUpRight /></Link>}
      />

      <div className={styles.performanceSummary}>
        <div>
          <strong>{currency(inv.totalInvoiced, currencySymbol)}</strong>
          <span>Total Invoiced ({number(inv.totalInvoices)} invoices)</span>
        </div>
        <div className={styles.passRate}>
          <HiCheckCircle />
          <strong>{currency(inv.totalBalance, currencySymbol)}</strong>
          <span>Outstanding Balance</span>
        </div>
      </div>

      <div className={styles.invoiceStackedTrack} aria-label="Fee invoice distribution by status">
        <span className={styles.stackPaid} style={{ width: `${paidPct}%` }} title={`Paid: ${number(inv.paidCount)} (${percent(paidPct)})`} />
        <span className={styles.stackPartial} style={{ width: `${partialPct}%` }} title={`Partial: ${number(inv.partiallyPaidCount)} (${percent(partialPct)})`} />
        <span className={styles.stackUnpaid} style={{ width: `${unpaidPct}%` }} title={`Unpaid: ${number(inv.unpaidCount)} (${percent(unpaidPct)})`} />
        <span className={styles.stackOverdue} style={{ width: `${overduePct}%` }} title={`Overdue: ${number(inv.overdueCount)} (${percent(overduePct)})`} />
      </div>

      <div className={styles.invoiceLegendGrid}>
        <div className={styles.invoiceLegendCard}>
          <div className={styles.legendCardTop}>
            <i className={styles.legendDot} style={{ background: "#10b981" }} />
            <span>Paid</span>
          </div>
          <strong>{number(inv.paidCount)}</strong>
        </div>

        <div className={styles.invoiceLegendCard}>
          <div className={styles.legendCardTop}>
            <i className={styles.legendDot} style={{ background: "#38bdf8" }} />
            <span>Partially Paid</span>
          </div>
          <strong>{number(inv.partiallyPaidCount)}</strong>
        </div>

        <div className={styles.invoiceLegendCard}>
          <div className={styles.legendCardTop}>
            <i className={styles.legendDot} style={{ background: "#f59e0b" }} />
            <span>Unpaid</span>
          </div>
          <strong>{number(inv.unpaidCount)}</strong>
        </div>

        <div className={styles.invoiceLegendCard}>
          <div className={styles.legendCardTop}>
            <i className={styles.legendDot} style={{ background: "#ef4444" }} />
            <span>Overdue</span>
          </div>
          <strong>{number(inv.overdueCount)}</strong>
        </div>
      </div>

      {Number(pendingBankSlipsCount || 0) > 0 && (
        <div className={styles.bankSlipAlert}>
          <span>
            <HiClock />
            <b>{number(pendingBankSlipsCount)}</b> bank transfer slip{pendingBankSlipsCount > 1 ? "s" : ""} pending verification
          </span>
          <Link href="/dashboard/fees?tab=bank_slips">Review Slips</Link>
        </div>
      )}
    </section>
  );
}

function PayrollPanel({ payroll, currencySymbol = "ETB" }) {
  const p = payroll || {};
  const latestRun = p.latestRun;
  const recentRuns = Array.isArray(p.recentRuns) ? p.recentRuns : [];

  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="Staff Compensation"
        title="Payroll Pulse & Runs"
        action={<Link href="/dashboard/payroll?tab=runs" className={styles.textLink}>Manage runs <HiOutlineArrowUpRight /></Link>}
      />

      {latestRun ? (
        <div className={styles.payrollActiveCard}>
          <div className={styles.payrollActiveTop}>
            <div className={styles.payrollBatchInfo}>
              <strong>{latestRun.batch_reference || `Payroll Batch #${latestRun.id}`}</strong>
              <span>{MONTH_NAMES[(Number(latestRun.month) || 1) - 1] || "Month"} {latestRun.year}</span>
            </div>
            <span className={`${styles.payrollStatusTag} ${PAYROLL_STATUS_MAP[latestRun.status]?.className || styles.statusDraft}`}>
              {PAYROLL_STATUS_MAP[latestRun.status]?.label || latestRun.status}
            </span>
          </div>

          <div className={styles.payrollMetricsRow}>
            <div className={styles.payrollMetricItem}>
              <span>Staff Members</span>
              <strong>{number(latestRun.total_staff_count)}</strong>
            </div>
            <div className={styles.payrollMetricItem}>
              <span>Total Gross</span>
              <strong>{currency(latestRun.total_gross_amount, currencySymbol)}</strong>
            </div>
            <div className={styles.payrollMetricItem}>
              <span>Net Payout</span>
              <strong style={{ color: "#059669" }}>{currency(latestRun.total_net_amount, currencySymbol)}</strong>
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.emptyState}>No payroll runs generated yet. Initialize a batch run for the current month.</p>
      )}

      {recentRuns.length > 0 && (
        <div className={styles.payrollRunsList}>
          {recentRuns.slice(0, 3).map((run, index) => {
            const statusConfig = PAYROLL_STATUS_MAP[run.status] || { label: run.status, className: styles.statusDraft };
            return (
              <div className={styles.payrollRunRow} key={run.id || `recent-run-${run.year}-${run.month}-${index}`}>
                <div className={styles.payrollRunLeft}>
                  <strong>{run.batch_reference || `Batch #${run.id || index + 1}`}</strong>
                  <small>{MONTH_NAMES[(Number(run.month) || 1) - 1] || "Month"} {run.year} • {number(run.total_staff_count)} staff</small>
                </div>
                <div className={styles.payrollRunRight}>
                  <strong>{currency(run.total_net_amount, currencySymbol)}</strong>
                  <span className={`${styles.payrollStatusTag} ${statusConfig.className}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FinancialTrendPanel({ monthlyTrend, currencySymbol = "ETB" }) {
  const trend = Array.isArray(monthlyTrend) ? monthlyTrend : [];
  const maxAmount = Math.max(
    ...trend.map((item) => Math.max(Number(item.income || 0), Number(item.expense || 0))),
    1000
  );

  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="Cash Flow Momentum"
        title="Income vs. Expense Trend"
        action={<Link href="/dashboard/reports/financial" className={styles.textLink}>Financial statement <HiOutlineArrowUpRight /></Link>}
      />

      <div className={styles.financeChartBars}>
        {trend.map((point, index) => {
          const incHeight = Math.max((Number(point.income || 0) / maxAmount) * 100, 3);
          const expHeight = Math.max((Number(point.expense || 0) / maxAmount) * 100, 3);
          const uniqueKey = point.key || `trend-${point.year || 'curr'}-${point.month || index + 1}-${point.label || index}`;
          const tooltip = `${point.label || `M${index + 1}`}: Income ${currency(point.income, currencySymbol)} | Expense ${currency(point.expense, currencySymbol)} | Net ${currency(point.net, currencySymbol)}`;

          return (
            <div className={styles.financeBarGroup} key={uniqueKey} title={tooltip}>
              <div className={styles.barTrackTwin}>
                <div
                  className={styles.barIncome}
                  style={{ height: `${incHeight}%` }}
                />
                <div
                  className={styles.barExpense}
                  style={{ height: `${expHeight}%` }}
                />
              </div>
              <small>{point.label || MONTH_NAMES[index] || `M${index + 1}`}</small>
            </div>
          );
        })}
        {!trend.length && <p className={styles.emptyChart}>Financial history will be plotted across monthly cycles.</p>}
      </div>

      <div className={styles.financeChartLegend}>
        <span><i className={styles.legendDot} style={{ background: "#10b981" }} /> Total Inflow (Fees + Other)</span>
        <span><i className={styles.legendDot} style={{ background: "#f43f5e" }} /> Direct Outflow (Expenses + Payroll)</span>
      </div>
    </section>
  );
}

function RecentFinancialTransactionsPanel({ recentPayments, recentExpenses, currencySymbol = "ETB" }) {
  const [activeTab, setActiveTab] = useState("all");

  const formattedPayments = useMemo(() => {
    return (recentPayments || []).map((p, index) => ({
      id: p.id ? `pay-${p.id}` : `pay-idx-${index}`,
      type: "income",
      title: p.studentName ? `Fee: ${p.studentName}` : (p.title || `Payment #${p.id || index + 1}`),
      category: p.paymentMethod || "Direct Cash/Bank",
      date: p.paymentDate || p.createdAt,
      amount: Number(p.amount || 0),
    }));
  }, [recentPayments]);

  const formattedExpenses = useMemo(() => {
    return (recentExpenses || []).map((e, index) => ({
      id: e.id ? `exp-${e.id}` : `exp-idx-${index}`,
      type: "expense",
      title: e.title || e.categoryName || "Operational Expense",
      category: e.categoryName || "Expense",
      date: e.expenseDate || e.createdAt,
      amount: Number(e.amount || 0),
    }));
  }, [recentExpenses]);

  const combined = useMemo(() => {
    return [...formattedPayments, ...formattedExpenses].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  }, [formattedPayments, formattedExpenses]);

  const displayedList = activeTab === "all"
    ? combined.slice(0, 6)
    : activeTab === "income"
      ? formattedPayments.slice(0, 6)
      : formattedExpenses.slice(0, 6);

  return (
    <section className={styles.panel}>
      <PanelHeader
        eyebrow="Transactions Feed"
        title="Live Financial Ledger"
        action={<Link href="/dashboard/fees?tab=payments" className={styles.textLink}>Transactions <HiOutlineArrowUpRight /></Link>}
      />

      <div className={styles.txHeaderTabs}>
        <button
          type="button"
          className={`${styles.txTabBtn} ${activeTab === "all" ? styles.txTabBtnActive : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All ({combined.length})
        </button>
        <button
          type="button"
          className={`${styles.txTabBtn} ${activeTab === "income" ? styles.txTabBtnActive : ""}`}
          onClick={() => setActiveTab("income")}
        >
          Receipts ({formattedPayments.length})
        </button>
        <button
          type="button"
          className={`${styles.txTabBtn} ${activeTab === "expense" ? styles.txTabBtnActive : ""}`}
          onClick={() => setActiveTab("expense")}
        >
          Expenses ({formattedExpenses.length})
        </button>
      </div>

      <div className={styles.txList}>
        {displayedList.map((tx, index) => {
          const isIncome = tx.type === "income";
          return (
            <div className={styles.txRow} key={tx.id || `tx-row-${index}`}>
              <div className={`${styles.txIcon} ${isIncome ? styles.txIconIncome : styles.txIconExpense}`}>
                {isIncome ? <HiArrowTrendingUp /> : <HiArrowTrendingDown />}
              </div>
              <div className={styles.txInfo}>
                <strong>{tx.title}</strong>
                <small>{tx.category}</small>
              </div>
              <div className={styles.txAmount}>
                <strong className={isIncome ? styles.txAmountPositive : styles.txAmountNegative}>
                  {isIncome ? "+" : "-"}{currency(tx.amount, currencySymbol)}
                </strong>
                <time>{tx.date ? new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</time>
              </div>
            </div>
          );
        })}
        {!displayedList.length && (
          <p className={styles.emptyState}>No recorded financial entries for this filter.</p>
        )}
      </div>
    </section>
  );
}

function QuickFinanceActionsPanel() {
  return (
    <section className={`${styles.panel} ${styles.actionPanel}`}>
      <PanelHeader eyebrow="Financial Ops" title="Quick Actions" action={<HiBanknotes className={styles.panelIcon} />} />
      <div className={styles.actionList}>
        <Link href="/dashboard/fees?tab=payments"><HiReceiptPercent /><span>Collect Fee Payment</span><HiOutlineArrowUpRight /></Link>
        <Link href="/dashboard/fees?tab=invoices"><HiCreditCard /><span>Student Invoices</span><HiOutlineArrowUpRight /></Link>
        <Link href="/dashboard/expenses"><HiScale /><span>Record Expense</span><HiOutlineArrowUpRight /></Link>
        <Link href="/dashboard/income"><HiCurrencyDollar /><span>Record Income</span><HiOutlineArrowUpRight /></Link>
        <Link href="/dashboard/fees?tab=bank_slips"><HiClock /><span>Verify Bank Slips</span><HiOutlineArrowUpRight /></Link>
        <Link href="/dashboard/payroll?tab=runs"><HiBanknotes /><span>Payroll Processing</span><HiOutlineArrowUpRight /></Link>
        <Link href="/dashboard/payroll?tab=structures"><HiCurrencyDollar /><span>Salary Structures</span><HiOutlineArrowUpRight /></Link>
        <Link href="/dashboard/reports/financial"><HiPresentationChartLine /><span>Financial Statement</span><HiOutlineArrowUpRight /></Link>
      </div>
    </section>
  );
}

/* ==========================================================================
   STUDENT DASHBOARD VIEW
   ========================================================================== */

function StudentDashboardView({ data, refreshing, onRefresh, currentTime }) {
  const student = data?.student || {};
  const stats = data?.stats || {};
  const attendance = data?.attendance || {};
  const todaySchedule = Array.isArray(data?.todaySchedule) ? data.todaySchedule : [];
  const assignments = Array.isArray(data?.assignments) ? data.assignments : [];
  const upcomingExams = Array.isArray(data?.upcomingExams) ? data.upcomingExams : [];
  const recentMarks = Array.isArray(data?.recentMarks) ? data.recentMarks : [];
  const feeSummary = data?.feeSummary || {};
  const currencySymbol = feeSummary.currency || "ETB";

  const currentHour = currentTime.getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(currentTime);

  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.kicker}><span className={styles.liveDot} />Student Portal / {dateLabel}</span>
          <h1>{greeting}, {student.firstName || student.name || "Student"}.</h1>
          <p>Here is your personalized academic overview, fee status, today&apos;s classes, upcoming homework, and exam schedules.</p>
          <div className={styles.studentMetaTags}>
            <span className={styles.studentBadge}><HiBookOpen /> Grade: <b>{student.gradeName || "—"}</b></span>
            <span className={styles.studentBadge}><HiAcademicCap /> Section: <b>{student.sectionName || "—"}</b> {student.roomNumber ? `(${student.roomNumber})` : ""}</span>
            {student.admissionNumber && <span className={`${styles.studentBadge} ${styles.studentBadgeGold}`}><HiIdentification /> ID: <b>{student.admissionNumber}</b></span>}
            {student.rollNumber && <span className={`${styles.studentBadge} ${styles.studentBadgeBlue}`}>Roll #{student.rollNumber}</span>}
          </div>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.termBadge}><HiCalendarDays />{student.schoolName || "Academic Year"}</span>
          <button className={styles.refreshButton} onClick={onRefresh} disabled={refreshing} title="Refresh dashboard">
            <HiArrowPath className={refreshing ? styles.spinning : ""} /> <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </header>

      {!student.gradeName && !student.sectionName && (
        <section className={styles.unassignedNotice} aria-label="Student pending class section assignment">
          <HiIdentification className={styles.unassignedNoticeIcon} />
          <div>
            <h3>Student Account Active</h3>
            <p>Welcome! Your student account is active. Your class grade, section, timetable, homework, and exam schedules will appear here automatically once your school administrator assigns you to a class section.</p>
          </div>
        </section>
      )}

      {/* Student Fee Status Card */}
      {Number(feeSummary.totalInvoiced || 0) > 0 && (
        <section className={styles.studentFeeCard} aria-label="Student fee summary">
          <div className={styles.studentFeeTop}>
            <h3><HiCreditCard /> School Fee & Billing Summary</h3>
            <Link href="/dashboard/fees?tab=my_fees" className={styles.textLink}>View Invoices <HiOutlineArrowUpRight /></Link>
          </div>
          <div className={styles.studentFeeGrid}>
            <div className={styles.studentFeeItem}>
              <span>Total Invoiced</span>
              <strong>{currency(feeSummary.totalInvoiced, currencySymbol)}</strong>
            </div>
            <div className={`${styles.studentFeeItem} ${styles.paid}`}>
              <span>Total Paid</span>
              <strong>{currency(feeSummary.totalPaid, currencySymbol)}</strong>
            </div>
            <div className={`${styles.studentFeeItem} ${Number(feeSummary.totalBalance || 0) > 0 ? styles.due : styles.paid}`}>
              <span>Remaining Balance</span>
              <strong>{currency(feeSummary.totalBalance, currencySymbol)}</strong>
            </div>
          </div>
        </section>
      )}

      <section className={styles.metricsGrid} aria-label="Student key academic indicators">
        <Metric icon={HiBookOpen} label="Enrolled Subjects" value={number(stats.enrolledSubjectsCount)} detail="active curriculum" tone="Blue" />
        <Metric icon={HiCheckCircle} label="Attendance" value={percent(stats.attendanceRate)} detail="last 30 days" tone="Teal" />
        <Metric icon={HiChartBarSquare} label="Average Score" value={percent(stats.averageScore)} detail="overall mark" tone="Amber" />
        <Metric icon={HiClipboardDocumentList} label="Pending Homework" value={number(stats.pendingAssignmentsCount)} detail={`${number(stats.submittedAssignmentsCount)} submitted`} tone="Rose" />
      </section>

      <section className={styles.quickStats} aria-label="Quick student status summary">
        <span><HiAcademicCap /><b>{number(stats.enrolledSubjectsCount)}</b> enrolled subjects</span>
        <span><HiClock /><b>{number(stats.todayClassesCount)}</b> classes today</span>
        <span><HiPresentationChartLine /><b>{number(stats.upcomingExamsCount)}</b> upcoming assessments</span>
        <span><HiCheckCircle /><b>{number(attendance.present)}</b> days present</span>
      </section>

      <main className={styles.dashboardGrid}>
        {/* Today's Schedule */}
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Daily Routine"
            title="Today's Class Schedule"
            action={<Link href="/dashboard/timetable/class" className={styles.textLink}>Full timetable <HiOutlineArrowUpRight /></Link>}
          />
          <div className={styles.scheduleList}>
            {todaySchedule.map((item, index) => (
              <div className={styles.scheduleItem} key={item.id || `sched-item-${index}`}>
                <div className={styles.scheduleTime}>
                  <strong>{item.start_time || "—"}</strong>
                  <small>{item.end_time || ""}</small>
                </div>
                <div className={styles.itemMain}>
                  <h4>{item.subject_name || item.period_name || `Period ${index + 1}`}</h4>
                  <p>
                    {item.subject_code && <span className={styles.subjectPill}>{item.subject_code}</span>}
                    {item.teacher_first_name && <span>👨‍🏫 {item.teacher_first_name} {item.teacher_last_name || ""}</span>}
                    {item.room_number && <span>🏫 Room {item.room_number}</span>}
                  </p>
                </div>
              </div>
            ))}
            {!todaySchedule.length && (
              <p className={styles.emptyState}>No scheduled classes today. Enjoy your day or review upcoming assignments!</p>
            )}
          </div>
        </section>

        {/* Attendance Pulse */}
        <AttendancePanel attendance={attendance} />

        {/* Upcoming Assignments */}
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Homework & Tasks"
            title="Assignments & Deadlines"
            action={<Link href="/dashboard/assignments" className={styles.textLink}>All assignments <HiOutlineArrowUpRight /></Link>}
          />
          <div className={styles.assignmentList}>
            {assignments.map((assignment, index) => {
              const isSubmitted = assignment.submission_status === "SUBMITTED" || assignment.submission_status === "GRADED";
              const isGraded = assignment.submission_status === "GRADED";
              return (
                <div className={styles.assignmentItem} key={assignment.id || `asg-item-${index}`}>
                  <div className={styles.itemMain}>
                    <h4>{assignment.title}</h4>
                    <p>
                      <span className={styles.subjectPill}>{assignment.subject_name || assignment.subject_code}</span>
                      <span>📅 Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No deadline"}</span>
                      <span>Max: {assignment.max_marks || 100} pts</span>
                    </p>
                  </div>
                  <div>
                    {isGraded ? (
                      <span className={`${styles.statusTag} ${styles.statusGraded}`}>Graded: {assignment.obtained_marks} pts</span>
                    ) : isSubmitted ? (
                      <span className={`${styles.statusTag} ${styles.statusSubmitted}`}><HiCheckCircle /> Submitted</span>
                    ) : (
                      <span className={`${styles.statusTag} ${styles.statusPending}`}><HiClock /> Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
            {!assignments.length && (
              <p className={styles.emptyState}>No assignments assigned right now. You are all caught up!</p>
            )}
          </div>
        </section>

        {/* Upcoming Exams */}
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Examinations"
            title="Upcoming Assessments"
            action={<Link href="/dashboard/exams" className={styles.textLink}>Exam schedule <HiOutlineArrowUpRight /></Link>}
          />
          <div className={styles.examList}>
            {upcomingExams.map((exam, index) => (
              <div className={styles.examItem} key={exam.id || `exam-item-${index}`}>
                <div className={styles.itemMain}>
                  <h4>{exam.title}</h4>
                  <p>
                    <span className={styles.subjectPill}>{exam.subject_name || exam.subject_code}</span>
                    <span>📝 {exam.exam_type || "EXAM"}</span>
                    <span>⚖️ Weight: {exam.weight_percentage || 0}%</span>
                    <span>🎯 {exam.max_marks} pts</span>
                  </p>
                </div>
                <div className={styles.scheduleTime}>
                  <strong>{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBD"}</strong>
                  <small>{exam.term_or_semester || "Term"}</small>
                </div>
              </div>
            ))}
            {!upcomingExams.length && (
              <p className={styles.emptyState}>No published examinations scheduled at this time.</p>
            )}
          </div>
        </section>

        {/* Recent Marks / Scores */}
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Academic Records"
            title="Recent Assessment Marks"
            action={<Link href="/dashboard/results/report-card" className={styles.textLink}>Official report card <HiOutlineArrowUpRight /></Link>}
          />
          <div className={styles.markList}>
            {recentMarks.map((mark, index) => (
              <div className={styles.markItem} key={mark.id || `mark-item-${index}`}>
                <div className={styles.itemMain}>
                  <h4>{mark.exam_title || mark.subject_name}</h4>
                  <p>
                    <span className={styles.subjectPill}>{mark.subject_name || mark.subject_code}</span>
                    <span>{mark.exam_type || "Assessment"}</span>
                  </p>
                </div>
                <div className={styles.gradeScoreBadge}>
                  <strong>{mark.score !== null && mark.score !== undefined ? `${mark.score} / ${mark.max_marks || 100}` : "—"}</strong>
                  {mark.grade_letter && <small>Grade: {mark.grade_letter}</small>}
                </div>
              </div>
            ))}
            {!recentMarks.length && (
              <p className={styles.emptyState}>No published marks yet. Check back once assessments are graded.</p>
            )}
          </div>
        </section>

        {/* Quick Student Navigation Actions */}
        <section className={`${styles.panel} ${styles.actionPanel}`}>
          <PanelHeader eyebrow="Student Access" title="Quick Links" action={<HiBookOpen className={styles.panelIcon} />} />
          <div className={styles.actionList}>
            <Link href="/dashboard/timetable/class"><HiCalendarDays /><span>My Class Timetable</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/subjects"><HiBookOpen /><span>My Enrolled Subjects</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/assignments"><HiClipboardDocumentList /><span>Homework & Submissions</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/exams"><HiPresentationChartLine /><span>Exam Schedules</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/results/report-card"><HiChartBarSquare /><span>My Report Card</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/attendance"><HiCheckCircle /><span>Attendance History</span><HiOutlineArrowUpRight /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ==========================================================================
   TEACHER DASHBOARD VIEW
   ========================================================================== */

function TeacherDashboardView({ data, refreshing, onRefresh, currentTime }) {
  const teacher = data?.teacher || {};
  const stats = data?.stats || {};
  const assignments = Array.isArray(data?.teachingAssignments) ? data.teachingAssignments : [];
  const weeklySchedule = Array.isArray(data?.weeklySchedule) ? data.weeklySchedule : [];
  const [selectedDay, setSelectedDay] = useState(null);
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const currentDay = data?.currentDayOfWeek || "MONDAY";
  const activeDay = selectedDay || currentDay;
  const daySchedule = weeklySchedule.filter((item) => item.dayOfWeek === activeDay);
  const greeting = currentTime.getHours() < 12 ? "Good morning" : currentTime.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(currentTime);

  return (
    <div className={styles.dashboard}>
      <header className={`${styles.hero} ${styles.teacherHero}`}>
        <div className={styles.heroContent}>
          <span className={styles.kicker}><span className={styles.liveDot} />Teacher Portal / {dateLabel}</span>
          <h1>{greeting}, {teacher.name || "Faculty Member"}.</h1>
          <p>Your daily teaching routine, term assignments, and class actions in one place.</p>
          <div className={styles.studentMetaTags}>
            {teacher.employeeNumber && <span className={styles.studentBadge}><HiIdentification /> Employee ID: <b>{teacher.employeeNumber}</b></span>}
            {teacher.specialization && <span className={styles.studentBadge}><HiAcademicCap /> <b>{teacher.specialization}</b></span>}
            {teacher.isClassTeacher && <span className={`${styles.studentBadge} ${styles.studentBadgeGold}`}><HiUserGroup /> Class Teacher</span>}
          </div>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.termBadge}><HiCalendarDays />{data?.currentTerm || "Current Term"}</span>
          <button className={styles.refreshButton} onClick={onRefresh} disabled={refreshing} title="Refresh dashboard">
            <HiArrowPath className={refreshing ? styles.spinning : ""} /> <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </header>

      <section className={styles.metricsGrid} aria-label="Teacher key indicators">
        <Metric icon={HiClock} label="Today's Classes" value={number(stats.todayClassesCount)} detail="scheduled lessons" tone="Teal" />
        <Metric icon={HiCalendarDays} label="Weekly Periods" value={number(stats.totalWeeklyPeriods)} detail="published timetable" tone="Blue" />
        <Metric icon={HiBookOpen} label="Assigned Classes" value={number(stats.totalAssignedClasses)} detail="term teaching roster" tone="Amber" />
        <Metric icon={HiUserGroup} label="Students" value={number(stats.totalStudents)} detail="across assigned classes" tone="Rose" />
      </section>

      <main className={styles.teacherDashboardGrid}>
        <section className={`${styles.panel} ${styles.teacherSchedulePanel}`}>
          <PanelHeader eyebrow="Operational delivery" title="TODAY'S TIMETABLE" action={<Link href="/dashboard/timetable/teacher" className={styles.textLink}>Full timetable <HiOutlineArrowUpRight /></Link>} />
          <div className={styles.dayTabs} role="tablist" aria-label="Weekly teaching schedule">
            {days.map((day) => (
              <button key={day} type="button" role="tab" aria-selected={activeDay === day} className={`${styles.dayTab} ${activeDay === day ? styles.dayTabActive : ""}`} onClick={() => setSelectedDay(day)}>
                {day.slice(0, 3)}<small>{day === currentDay ? "Today" : ""}</small>
              </button>
            ))}
          </div>
          <div className={styles.teacherScheduleList}>
            {daySchedule.map((item, index) => (
              <article className={styles.teacherScheduleItem} key={item.id || `day-sched-${index}`}>
                <div className={styles.periodBadge}>{item.periodName}</div>
                <div className={styles.teacherScheduleMain}>
                  <span className={styles.scheduleTimeLabel}>{item.timeSlot || "Time pending"}</span>
                  <h3>{item.gradeSection}</h3>
                  <p>{item.subjectName}</p>
                </div>
                <span className={styles.roomPill}>{item.roomName}</span>
                <div className={styles.teacherScheduleActions}>
                  <Link href={`/dashboard/attendance?sectionId=${item.sectionId}`} className={styles.scheduleAction}>Take Attendance</Link>
                  <Link href={`/dashboard/grades?sectionId=${item.sectionId}&subjectId=${item.subjectId}`} className={styles.scheduleAction}>Enter Marks</Link>
                  <Link href={`/dashboard/sections/${item.sectionId}`} className={styles.scheduleAction}>Class Roster</Link>
                </div>
              </article>
            ))}
            {!daySchedule.length && <p className={styles.emptyState}>No published lessons for {activeDay.toLowerCase()}.</p>}
          </div>
        </section>

        <section className={styles.panel}>
          <PanelHeader eyebrow="Authoritative term roster" title="My Term Teaching Assignments" action={<Link href="/dashboard/teachers/subjects" className={styles.textLink}>Manage assignments <HiOutlineArrowUpRight /></Link>} />
          <div className={styles.assignmentRoster}>
            {assignments.map((assignment, index) => (
              <div className={styles.assignmentRosterItem} key={assignment.id || `teach-roster-${index}`}>
                <div><strong>{assignment.subjectName}</strong><span>{assignment.gradeSection}</span></div>
                <span className={styles.assignmentStudentCount}>{number(assignment.studentCount)} students</span>
                <span className={styles.statusTag}>{assignment.status}</span>
              </div>
            ))}
            {!assignments.length && <p className={styles.emptyState}>No active term teaching assignments found.</p>}
          </div>
        </section>

        {data?.homeroomClass && (
          <section className={styles.panel}>
            <PanelHeader eyebrow="Class teacher responsibility" title="My Homeroom Class" action={<Link href={`/dashboard/sections/${data.homeroomClass.sectionId}`} className={styles.textLink}>Open roster <HiOutlineArrowUpRight /></Link>} />
            <div className={styles.homeroomCard}><strong>{data.homeroomClass.gradeSection}</strong><span>{number(data.homeroomClass.studentCount)} students · Room {data.homeroomClass.roomNumber || "—"}</span><small>{data.homeroomClass.courses?.length || 0} curriculum courses</small></div>
          </section>
        )}

        <section className={`${styles.panel} ${styles.actionPanel}`}>
          <PanelHeader eyebrow="Common workflows" title="Quick Actions" action={<HiClipboardDocumentList className={styles.panelIcon} />} />
          <div className={styles.actionList}>
            <Link href="/dashboard/attendance"><HiCheckCircle /><span>Attendance</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/grades"><HiChartBarSquare /><span>Marks</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/teachers/subjects"><HiBookOpen /><span>Teaching Assignments</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/timetable/teacher"><HiCalendarDays /><span>Full Timetable</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/payroll?tab=my_payslips"><HiBanknotes /><span>My Payslips</span><HiOutlineArrowUpRight /></Link>
            <Link href="/dashboard/results/broadsheet"><HiPresentationChartLine /><span>Broadsheet</span><HiOutlineArrowUpRight /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ==========================================================================
   PARENT DASHBOARD VIEW
   ========================================================================== */

function ParentDashboardView({ data, refreshing, onRefresh, currentTime }) {
  const parent = data?.parent || {};
  const children = Array.isArray(data?.children) ? data.children : [];
  const [selectedChildId, setSelectedChildId] = useState(() => children[0]?.id || null);

  const activeChildId = children.some((child) => child.id === selectedChildId)
    ? selectedChildId
    : children[0]?.id || null;

  const selectedChild = children.find((child) => child.id === activeChildId) || children[0] || {};
  const childStats = selectedChild.stats || {};
  const attendance = selectedChild.attendance || {};
  const todaySchedule = Array.isArray(selectedChild.todaySchedule) ? selectedChild.todaySchedule : [];
  const assignments = Array.isArray(selectedChild.assignments) ? selectedChild.assignments : [];
  const upcomingExams = Array.isArray(selectedChild.upcomingExams) ? selectedChild.upcomingExams : [];
  const recentMarks = Array.isArray(selectedChild.recentMarks) ? selectedChild.recentMarks : [];
  const feeSummary = selectedChild.feeSummary || {};
  const currencySymbol = feeSummary.currency || "ETB";

  const currentHour = currentTime.getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(currentTime);

  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.kicker}><span className={styles.liveDot} />Parent Portal / {dateLabel}</span>
          <h1>{greeting}, {parent.name || "Parent"}.</h1>
          <p>Monitor your children&apos;s real-time attendance, fee billing status, homework submissions, marks, and daily class schedules.</p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.termBadge}><HiCalendarDays />{parent.schoolName || "Academic Year"}</span>
          <button className={styles.refreshButton} onClick={onRefresh} disabled={refreshing} title="Refresh dashboard">
            <HiArrowPath className={refreshing ? styles.spinning : ""} /> <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </header>

      {children.length === 0 ? (
        <section className={styles.unassignedNotice} aria-label="No children linked">
          <HiIdentification className={styles.unassignedNoticeIcon} />
          <div>
            <h3>Parent Account Active</h3>
            <p>Welcome! Your parent portal is active. However, no student profile is currently linked to your account. Please contact your school administrator to link your child&apos;s enrollment record with your phone number ({parent.phone || "on file"}) or email.</p>
          </div>
        </section>
      ) : (
        <>
          {/* Multi-Child Selector */}
          <div className={styles.childTabsWrap}>
            <div className={styles.childTabsHeader}>
              <h3><HiUserGroup /> Your Children ({children.length})</h3>
              <span className={styles.childTabsHint}>Select a child to view their academic records & schedules</span>
            </div>
            <div className={styles.childTabs}>
              {children.map((child, index) => {
                const isSelected = child.id === activeChildId;
                const initial = (child.firstName || child.name || "C")[0].toUpperCase();
                return (
                  <button
                    key={child.id || `child-tab-${index}`}
                    type="button"
                    className={`${styles.childTab} ${isSelected ? styles.childTabActive : ""}`}
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    <div className={styles.childAvatar}>{initial}</div>
                    <div className={styles.childTabInfo}>
                      <strong>{child.name || `${child.firstName || ""} ${child.lastName || ""}`}</strong>
                      <span>{child.gradeName ? `${child.gradeName} • ${child.sectionName || "Section"}` : "Pending Assignment"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Child Header Badges */}
          <div style={{ maxWidth: "1440px", margin: "0 auto 1.25rem" }}>
            <div className={styles.studentMetaTags}>
              <span className={styles.studentBadge}><HiIdentification /> Monitoring: <b>{selectedChild.name || `${selectedChild.firstName || ""} ${selectedChild.lastName || ""}`}</b></span>
              <span className={styles.studentBadge}><HiBookOpen /> Grade: <b>{selectedChild.gradeName || "—"}</b></span>
              <span className={styles.studentBadge}><HiAcademicCap /> Section: <b>{selectedChild.sectionName || "—"}</b> {selectedChild.roomNumber ? `(${selectedChild.roomNumber})` : ""}</span>
              {selectedChild.admissionNumber && <span className={`${styles.studentBadge} ${styles.studentBadgeGold}`}>ID: <b>{selectedChild.admissionNumber}</b></span>}
              {selectedChild.rollNumber && <span className={`${styles.studentBadge} ${styles.studentBadgeBlue}`}>Roll #{selectedChild.rollNumber}</span>}
            </div>
          </div>

          {/* Child Fee Status Card */}
          {Number(feeSummary.totalInvoiced || 0) > 0 && (
            <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
              <section className={styles.studentFeeCard} aria-label="Child fee summary">
                <div className={styles.studentFeeTop}>
                  <h3><HiCreditCard /> Fee Invoices & Payments for {selectedChild.firstName || "Child"}</h3>
                  <Link href="/dashboard/fees?tab=bank_slips" className={styles.textLink}>Submit Bank Slip <HiOutlineArrowUpRight /></Link>
                </div>
                <div className={styles.studentFeeGrid}>
                  <div className={styles.studentFeeItem}>
                    <span>Total Invoiced</span>
                    <strong>{currency(feeSummary.totalInvoiced, currencySymbol)}</strong>
                  </div>
                  <div className={`${styles.studentFeeItem} ${styles.paid}`}>
                    <span>Total Paid</span>
                    <strong>{currency(feeSummary.totalPaid, currencySymbol)}</strong>
                  </div>
                  <div className={`${styles.studentFeeItem} ${Number(feeSummary.totalBalance || 0) > 0 ? styles.due : styles.paid}`}>
                    <span>Outstanding Due</span>
                    <strong>{currency(feeSummary.totalBalance, currencySymbol)}</strong>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Child Academic KPI Metrics */}
          <section className={styles.metricsGrid} aria-label="Child key academic indicators">
            <Metric icon={HiBookOpen} label="Enrolled Subjects" value={number(childStats.enrolledSubjectsCount)} detail="active curriculum" tone="Blue" />
            <Metric icon={HiCheckCircle} label="Attendance" value={percent(childStats.attendanceRate)} detail="last 30 days" tone="Teal" />
            <Metric icon={HiChartBarSquare} label="Average Score" value={percent(childStats.averageScore)} detail="overall marks" tone="Amber" />
            <Metric icon={HiClipboardDocumentList} label="Pending Homework" value={number(childStats.pendingAssignmentsCount)} detail={`${number(childStats.submittedAssignmentsCount)} submitted`} tone="Rose" />
          </section>

          {/* Quick Stats Summary */}
          <section className={styles.quickStats} aria-label="Child quick summary stats">
            <span><HiAcademicCap /><b>{number(childStats.enrolledSubjectsCount)}</b> enrolled subjects</span>
            <span><HiClock /><b>{number(childStats.todayClassesCount)}</b> classes today</span>
            <span><HiPresentationChartLine /><b>{number(childStats.upcomingExamsCount)}</b> upcoming assessments</span>
            <span><HiCheckCircle /><b>{number(attendance.present)}</b> days present</span>
          </section>

          {/* Dashboard Grid */}
          <main className={styles.dashboardGrid}>
            {/* Today's Schedule */}
            <section className={styles.panel}>
              <PanelHeader
                eyebrow="Daily Routine"
                title={`${selectedChild.firstName || "Child"}'s Schedule Today`}
                action={<Link href={`/dashboard/timetable/class${selectedChild.id ? `?studentId=${selectedChild.id}` : ""}`} className={styles.textLink}>Full timetable <HiOutlineArrowUpRight /></Link>}
              />
              <div className={styles.scheduleList}>
                {todaySchedule.map((item, index) => (
                  <div className={styles.scheduleItem} key={item.id || `psched-${index}`}>
                    <div className={styles.scheduleTime}>
                      <strong>{item.start_time || "—"}</strong>
                      <small>{item.end_time || ""}</small>
                    </div>
                    <div className={styles.itemMain}>
                      <h4>{item.subject_name || item.period_name || `Period ${index + 1}`}</h4>
                      <p>
                        {item.subject_code && <span className={styles.subjectPill}>{item.subject_code}</span>}
                        {item.teacher_first_name && <span>👨‍🏫 {item.teacher_first_name} {item.teacher_last_name || ""}</span>}
                        {item.room_number && <span>🏫 Room {item.room_number}</span>}
                      </p>
                    </div>
                  </div>
                ))}
                {!todaySchedule.length && (
                  <p className={styles.emptyState}>No scheduled classes today for this student.</p>
                )}
              </div>
            </section>

            {/* Attendance Pulse */}
            <AttendancePanel attendance={attendance} />

            {/* Assignments & Homework */}
            <section className={styles.panel}>
              <PanelHeader
                eyebrow="Homework & Tasks"
                title="Assignments & Deadlines"
                action={<Link href={`/dashboard/assignments${selectedChild.id ? `?studentId=${selectedChild.id}` : ""}`} className={styles.textLink}>All assignments <HiOutlineArrowUpRight /></Link>}
              />
              <div className={styles.assignmentList}>
                {assignments.map((assignment, index) => {
                  const isSubmitted = assignment.submission_status === "SUBMITTED" || assignment.submission_status === "GRADED";
                  const isGraded = assignment.submission_status === "GRADED";
                  return (
                    <div className={styles.assignmentItem} key={assignment.id || `pasg-${index}`}>
                      <div className={styles.itemMain}>
                        <h4>{assignment.title}</h4>
                        <p>
                          <span className={styles.subjectPill}>{assignment.subject_name || assignment.subject_code}</span>
                          <span>📅 Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No deadline"}</span>
                          <span>Max: {assignment.max_marks || 100} pts</span>
                        </p>
                      </div>
                      <div>
                        {isGraded ? (
                          <span className={`${styles.statusTag} ${styles.statusGraded}`}>Graded: {assignment.obtained_marks} pts</span>
                        ) : isSubmitted ? (
                          <span className={`${styles.statusTag} ${styles.statusSubmitted}`}><HiCheckCircle /> Submitted</span>
                        ) : (
                          <span className={`${styles.statusTag} ${styles.statusPending}`}><HiClock /> Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!assignments.length && (
                  <p className={styles.emptyState}>No homework assignments currently pending for {selectedChild.firstName || "this student"}.</p>
                )}
              </div>
            </section>

            {/* Upcoming Assessments / Exams */}
            <section className={styles.panel}>
              <PanelHeader
                eyebrow="Examinations"
                title="Upcoming Assessments"
                action={<Link href={`/dashboard/exams${selectedChild.id ? `?studentId=${selectedChild.id}` : ""}`} className={styles.textLink}>Exam schedule <HiOutlineArrowUpRight /></Link>}
              />
              <div className={styles.examList}>
                {upcomingExams.map((exam, index) => (
                  <div className={styles.examItem} key={exam.id || `pexam-${index}`}>
                    <div className={styles.itemMain}>
                      <h4>{exam.title}</h4>
                      <p>
                        <span className={styles.subjectPill}>{exam.subject_name || exam.subject_code}</span>
                        <span>📝 {exam.exam_type || "EXAM"}</span>
                        <span>⚖️ Weight: {exam.weight_percentage || 0}%</span>
                        <span>🎯 {exam.max_marks} pts</span>
                      </p>
                    </div>
                    <div className={styles.scheduleTime}>
                      <strong>{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBD"}</strong>
                      <small>{exam.term_or_semester || "Term"}</small>
                    </div>
                  </div>
                ))}
                {!upcomingExams.length && (
                  <p className={styles.emptyState}>No published examinations scheduled at this time for this class.</p>
                )}
              </div>
            </section>

            {/* Recent Assessment Marks */}
            <section className={styles.panel}>
              <PanelHeader
                eyebrow="Academic Performance"
                title="Recent Assessment Marks"
                action={<Link href={`/dashboard/results/report-card${selectedChild.id ? `?studentId=${selectedChild.id}` : ""}`} className={styles.textLink}>Official report card <HiOutlineArrowUpRight /></Link>}
              />
              <div className={styles.markList}>
                {recentMarks.map((mark, index) => (
                  <div className={styles.markItem} key={mark.id || `pmark-${index}`}>
                    <div className={styles.itemMain}>
                      <h4>{mark.exam_title || mark.subject_name}</h4>
                      <p>
                        <span className={styles.subjectPill}>{mark.subject_name || mark.subject_code}</span>
                        <span>{mark.exam_type || "Assessment"}</span>
                      </p>
                    </div>
                    <div className={styles.gradeScoreBadge}>
                      <strong>{mark.score !== null && mark.score !== undefined ? `${mark.score} / ${mark.max_marks || 100}` : "—"}</strong>
                      {mark.grade_letter && <small>Grade: {mark.grade_letter}</small>}
                    </div>
                  </div>
                ))}
                {!recentMarks.length && (
                  <p className={styles.emptyState}>No published marks yet for this student.</p>
                )}
              </div>
            </section>

            {/* Parent Quick Navigation Actions */}
            <section className={`${styles.panel} ${styles.actionPanel}`}>
              <PanelHeader eyebrow="Parent Portal" title="Quick Actions" action={<HiBookOpen className={styles.panelIcon} />} />
              <div className={styles.actionList}>
                <Link href={`/dashboard/timetable/class${selectedChild.id ? `?studentId=${selectedChild.id}` : ""}`}><HiCalendarDays /><span>{selectedChild.firstName || "Child"}&apos;s Timetable</span><HiOutlineArrowUpRight /></Link>
                <Link href={`/dashboard/attendance${selectedChild.id ? `?studentId=${selectedChild.id}` : ""}`}><HiCheckCircle /><span>Attendance Matrix</span><HiOutlineArrowUpRight /></Link>
                <Link href={`/dashboard/results/report-card${selectedChild.id ? `?studentId=${selectedChild.id}` : ""}`}><HiChartBarSquare /><span>Official Report Card</span><HiOutlineArrowUpRight /></Link>
                <Link href={`/dashboard/assignments${selectedChild.id ? `?studentId=${selectedChild.id}` : ""}`}><HiClipboardDocumentList /><span>Homework & Assignments</span><HiOutlineArrowUpRight /></Link>
                <Link href="/dashboard/fees?tab=bank_slips"><HiCreditCard /><span>Submit Fee Bank Slip</span><HiOutlineArrowUpRight /></Link>
                <Link href={`/dashboard/students/${selectedChild.id}`}><HiIdentification /><span>Student Full Profile</span><HiOutlineArrowUpRight /></Link>
              </div>
            </section>
          </main>
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   MAIN DASHBOARD COMPONENT (ADMIN, PRINCIPAL, ACCOUNTANT, STAFF)
   ========================================================================== */

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [viewMode, setViewMode] = useState("all"); // "all" | "academic" | "finance"
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const payload = await request("/api/dashboard");
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err?.message || "Unable to retrieve dashboard metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  useEffect(() => {
    const clock = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(clock);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!data) return;
    const summary = data.finance?.summary || {};
    const stats = data.stats || {};

    const exportRows = [
      { Metric: "Active Students", Value: stats.totalStudents || 0 },
      { Metric: "Faculty Staff", Value: stats.totalTeachers || 0 },
      { Metric: "Attendance Rate (%)", Value: stats.attendanceRate || 0 },
      { Metric: "Average Score (%)", Value: stats.averageScore || 0 },
      { Metric: "Fee Revenue Invoiced", Value: summary.totalFeesInvoiced || 0 },
      { Metric: "Fee Revenue Collected", Value: summary.totalFeesCollected || 0 },
      { Metric: "Fee Outstanding Balance", Value: summary.totalFeesOutstanding || 0 },
      { Metric: "Fee Collection Efficiency (%)", Value: summary.collectionEfficiency || 0 },
      { Metric: "Direct Other Income", Value: summary.totalOtherIncome || 0 },
      { Metric: "Direct Operational Expenses", Value: summary.totalExpenses || 0 },
      { Metric: "Monthly Payroll Commitment", Value: data.payroll?.monthlyPayrollCommitment || 0 },
      { Metric: "Net Operating Cash Flow", Value: summary.netCashFlow || 0 },
    ];

    exportToCSV(
      exportRows,
      [
        { key: "Metric", label: "Dashboard Key Indicator" },
        { key: "Value", label: "Authoritative Value" },
      ],
      "Smart_SMS_Executive_Metrics"
    );
  }, [data]);

  // High-Grade Skeleton Shimmer Screen
  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.skeletonContainer}>
          <div className={styles.skeletonHero} />
          <div className={styles.skeletonGrid}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonPanel} />
            <div className={styles.skeletonPanel} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.unassignedNotice} style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>
          <HiExclamationTriangle className={styles.unassignedNoticeIcon} style={{ color: "#ef4444" }} />
          <div>
            <h3>Dashboard Synchronization Issue</h3>
            <p>{error || "Unable to connect to school operations database."}</p>
            <button
              type="button"
              className={styles.refreshButton}
              style={{ marginTop: "0.85rem", background: "#ffffff" }}
              onClick={() => fetchDashboardData(true)}
            >
              <HiArrowPath /> Retry Synchronization
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dashboard = data || emptyData;

  // Role-specific portals
  if (dashboard.isStudent || (user?.role || "").toLowerCase() === "student") {
    return (
      <StudentDashboardView
        data={dashboard}
        refreshing={refreshing}
        onRefresh={() => fetchDashboardData(true)}
        currentTime={currentTime}
      />
    );
  }

  if (dashboard.isParent || (user?.role || "").toLowerCase() === "parent") {
    return (
      <ParentDashboardView
        data={dashboard}
        refreshing={refreshing}
        onRefresh={() => fetchDashboardData(true)}
        currentTime={currentTime}
      />
    );
  }

  if (dashboard.isTeacher || (user?.role || "").toLowerCase() === "teacher") {
    return (
      <TeacherDashboardView
        data={dashboard}
        refreshing={refreshing}
        onRefresh={() => fetchDashboardData(true)}
        currentTime={currentTime}
      />
    );
  }

  // Admin / Staff / Accountant / Principal Unified Dashboard
  const stats = dashboard.stats || {};
  const finance = dashboard.finance || emptyData.finance;
  const payroll = dashboard.payroll || emptyData.payroll;
  const currencySymbol = finance?.summary?.currency || finance?.currency || stats.currency || "ETB";

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Administrator";
  const currentHour = currentTime.getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(currentTime);

  return (
    <div className={styles.dashboard}>
      {/* Header & Controls */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.kicker}><span className={styles.liveDot} />Live Operations / {dateLabel}</span>
          <h1>{greeting}, {firstName}.</h1>
          <p>Unified executive overview of academic outcomes, student wellbeing, fee receivables, and payroll operations.</p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.termBadge}><HiCalendarDays />{stats.currentTerm || "Active Session"}</span>
          <button type="button" className={styles.toolBtn} onClick={handlePrint} title="Print executive briefing">
            <HiPrinter /> Print Report
          </button>
          <button type="button" className={styles.toolBtn} onClick={handleExportCSV} title="Export financial CSV">
            <HiArrowDownTray /> Export CSV
          </button>
          <button type="button" className={styles.refreshButton} onClick={() => fetchDashboardData(true)} disabled={refreshing} title="Refresh live metrics">
            <HiArrowPath className={refreshing ? styles.spinning : ""} /> <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
      </header>

      {/* Smart AI Executive Pulse & Action Recommendations */}
      <SmartExecutivePulse
        dashboard={dashboard}
        onPrint={handlePrint}
        onExportCSV={handleExportCSV}
      />

      {/* Primary Key Performance Indicators */}
      <section className={styles.metricsGrid} aria-label="School key performance indicators">
        <Metric icon={HiUserGroup} label="Active Students" value={number(stats.totalStudents)} detail="enrolled records" tone="Blue" />
        <Metric icon={HiAcademicCap} label="Faculty Staff" value={number(stats.totalTeachers)} detail="teacher directory" tone="Teal" />
        <Metric icon={HiCheckCircle} label="Attendance Rate" value={percent(stats.attendanceRate)} detail="last 30 days" tone="Amber" />
        <Metric icon={HiBanknotes} label="Fee Collected" value={currency(finance?.summary?.totalFeesCollected || finance?.summary?.totalCollected, currencySymbol)} detail={`${percent(finance?.summary?.collectionEfficiency)} efficiency`} tone="Emerald" />
      </section>

      {/* Quick Summary Pill Bar */}
      <section className={styles.quickStats} aria-label="Additional school metrics">
        <span><HiBookOpen /><b>{number(stats.totalSections)}</b> class sections</span>
        <span><HiCreditCard /><b>{currency(finance?.summary?.totalFeesOutstanding || finance?.summary?.totalOutstanding, currencySymbol)}</b> fee receivables</span>
        <span><HiBanknotes /><b>{currency(payroll?.monthlyPayrollCommitment, currencySymbol)}</b> payroll commitment</span>
        <span><HiClock /><b>{number(finance?.pendingBankSlipsCount || 0)}</b> pending bank slips</span>
      </section>

      {/* View Mode Filter Tabs & Instant Quick Jump */}
      <div className={styles.dashboardControlBar}>
        <div className={styles.viewModeTabs} role="tablist" aria-label="Dashboard module views">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "all"}
            className={`${styles.viewModeBtn} ${viewMode === "all" ? styles.viewModeBtnActive : ""}`}
            onClick={() => setViewMode("all")}
          >
            <HiScale /> All Modules
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "academic"}
            className={`${styles.viewModeBtn} ${viewMode === "academic" ? styles.viewModeBtnActive : ""}`}
            onClick={() => setViewMode("academic")}
          >
            <HiAcademicCap /> Academic & Operations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "finance"}
            className={`${styles.viewModeBtn} ${viewMode === "finance" ? styles.viewModeBtnActive : ""}`}
            onClick={() => setViewMode("finance")}
          >
            <HiBanknotes /> Finance & Payroll
          </button>
        </div>

        <div className={styles.searchJumpBox}>
          <HiMagnifyingGlass />
          <input
            type="text"
            placeholder="Quick search or jump to module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <main className={styles.dashboardGrid}>
        {/* FINANCE & PAYROLL SECTION */}
        {(viewMode === "all" || viewMode === "finance") && (
          <>
            <FinanceHeroPanel finance={finance} payroll={payroll} />
            <InvoiceBillingPanel
              invoices={finance?.invoices}
              pendingBankSlipsCount={finance?.pendingBankSlipsCount}
              currencySymbol={currencySymbol}
            />
            <PayrollPanel
              payroll={payroll}
              currencySymbol={currencySymbol}
            />
            <FinancialTrendPanel
              monthlyTrend={finance?.monthlyTrend}
              currencySymbol={currencySymbol}
            />
            <RecentFinancialTransactionsPanel
              recentPayments={finance?.recentPayments}
              recentExpenses={finance?.recentExpenses}
              currencySymbol={currencySymbol}
            />
            <QuickFinanceActionsPanel />
          </>
        )}

        {/* ACADEMIC & OPERATIONS SECTION */}
        {(viewMode === "all" || viewMode === "academic") && (
          <>
            <AttendancePanel attendance={dashboard.attendance || emptyData.attendance} />
            <PerformancePanel performance={dashboard.performance || emptyData.performance} />
            <EnrollmentPanel trend={dashboard.enrollmentTrend} />
            <SectionPanel sections={dashboard.sectionOverview} />
            <ActivityPanel activities={dashboard.recentActivity} />
            <section className={`${styles.panel} ${styles.actionPanel}`}>
              <PanelHeader eyebrow="Academic Delivery" title="Quick Actions" action={<HiClipboardDocumentList className={styles.panelIcon} />} />
              <div className={styles.actionList}>
                <Link href="/dashboard/students/new"><HiUserGroup /><span>Add a Student</span><HiOutlineArrowUpRight /></Link>
                <Link href="/dashboard/teachers/new"><HiAcademicCap /><span>Add a Teacher</span><HiOutlineArrowUpRight /></Link>
                <Link href="/dashboard/attendance"><HiCheckCircle /><span>Record Attendance</span><HiOutlineArrowUpRight /></Link>
                <Link href="/dashboard/grades"><HiBookOpen /><span>Review Marks</span><HiOutlineArrowUpRight /></Link>
                <Link href="/dashboard/timetable/class"><HiCalendarDays /><span>Class Timetables</span><HiOutlineArrowUpRight /></Link>
                <Link href="/dashboard/exams"><HiPresentationChartLine /><span>Assessment Cycles</span><HiOutlineArrowUpRight /></Link>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
