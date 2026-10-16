const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { buildDashboardPayload } = require('../src/services/dashboard.service');

describe('Admin unified dashboard payload builder', () => {
  test('correctly populates stats, finance aggregates, and student metrics', () => {
    const payload = buildDashboardPayload({
      students: 12,
      teachers: 7,
      schools: 1,
      academicYears: 2,
      sections: 9,
      enrollments: 12,
      term: '2026/27',
      pendingTasks: 7,
      attendanceRate: 69.6,
      attendancePresent: 15,
      attendanceAbsent: 5,
      attendanceLate: 1,
      attendanceExcused: 2,
      attendanceTrend: [{ label: 'Sep 07', rate: 94.4 }],
      averageScore: 27.9,
      passRate: 10,
      performanceDistribution: [{ label: '85-100', count: 1 }],
      enrollmentTrend: [{ label: 'Aug', count: 5 }],
      sectionOverview: [{ id: 'sec-1', name: 'Section B', students: 4 }],
      publishedExams: 5,
      activities: [{ id: 'act-1', title: 'New student record', description: 'Student enrolled', timestamp: '2026-10-16T10:00:00Z' }],
      finance: {
        currency: 'ETB',
        totalInvoiced: 18300,
        totalCollected: 8200,
        totalOutstanding: 10100,
        collectionEfficiency: 44.8,
        totalOtherIncome: 550000,
        totalExpenses: 509,
        totalPayroll: 537651.33,
        totalOutflow: 538160.33,
        netCashFlow: 20039.67,
        pendingBankSlipsCount: 0,
        totalInvoicesCount: 18,
        paidInvoicesCount: 12,
        partialInvoicesCount: 2,
        unpaidInvoicesCount: 2,
        overdueInvoicesCount: 4,
        monthlyTrend: [{ month: 10, fee_collections: 8200, total_income: 8200 }],
        recentPayments: [{ id: 'pay-1', amount: 500 }],
        recentExpenses: [{ id: 'exp-1', amount: 509 }],
      },
      payroll: {
        currency: 'ETB',
        activeSalaryStructuresCount: 12,
        monthlyPayrollCommitment: 291907,
        totalDisbursedAllTime: 537651.33,
        latestRun: { id: 'run-1', month: 11, year: 2026 },
        recentRuns: [{ id: 'run-1', month: 11, year: 2026 }],
      },
    });

    assert.equal(payload.isStudent, false);
    assert.equal(payload.stats.totalStudents, 12);
    assert.equal(payload.stats.totalTeachers, 7);
    assert.equal(payload.stats.totalSchools, 1);
    assert.equal(payload.stats.currentTerm, '2026/27');
    assert.equal(payload.stats.totalFeesInvoiced, 18300);
    assert.equal(payload.stats.totalFeesCollected, 8200);
    assert.equal(payload.stats.totalFeesOutstanding, 10100);
    assert.equal(payload.stats.staffOnPayrollCount, 12);
    assert.equal(payload.attendance.rate, 60.6);
    assert.equal(payload.finance.summary.totalFeesInvoiced, 18300);
    assert.equal(payload.finance.invoices.totalInvoices, 18);
    assert.equal(payload.recentActivity.length, 1);
  });
});
