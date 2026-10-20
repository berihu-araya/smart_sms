class AnalyticsService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Generates the comprehensive 360-degree Executive Institutional Analytics payload
   */
  async getInstitutionalAnalytics({ schoolId = null, academicYearId = null }) {
    // Execute all domain aggregations in parallel for O(1) concurrent latency
    const [
      enrollmentData,
      facultyData,
      academicData,
      attendanceData,
      financialData,
      multiRiskStudents,
      longitudinalTrends,
    ] = await Promise.all([
      this.repository.getEnrollmentAnalytics(schoolId, academicYearId),
      this.repository.getFacultyAnalytics(schoolId),
      this.repository.getAcademicHealthIndex(schoolId, academicYearId),
      this.repository.getAttendanceHealthIndex(schoolId),
      this.repository.getFinancialHealthIndex(schoolId),
      this.repository.getMultiRiskStudents(schoolId, 30),
      this.repository.getLongitudinalTrends(schoolId),
    ]);

    const totalStudents = enrollmentData.totalStudents;
    const totalTeachers = facultyData.totalTeachers;

    // 1. Student-to-Teacher Ratio (STR)
    const strRatio = totalTeachers > 0 ? Math.round(totalStudents / totalTeachers) : totalStudents;
    let strStatus = 'OPTIMAL';
    if (strRatio > 30) strStatus = 'HIGH_BURDEN';
    else if (strRatio < 12 && totalStudents > 0) strStatus = 'UNDER_UTILIZED';

    // 2. Classroom Capacity Utilization
    const sections = enrollmentData.sectionCapacity || [];
    const totalCapacity = sections.reduce((acc, s) => acc + s.capacity, 0);
    const totalEnrolledInSections = sections.reduce((acc, s) => acc + s.enrolled, 0);
    const overallCapacityRate =
      totalCapacity > 0 ? Math.round((totalEnrolledInSections / totalCapacity) * 100) : 0;

    // Capacity index for scorecard (penalize extreme overcrowding > 100% or extreme under-enrollment < 50%)
    let capacityScore = overallCapacityRate;
    if (overallCapacityRate > 100) {
      capacityScore = Math.max(50, 100 - (overallCapacityRate - 100) * 2);
    } else if (overallCapacityRate < 50 && totalStudents > 0) {
      capacityScore = Math.max(40, overallCapacityRate * 1.5);
    }

    // 3. Balanced Scorecard: Composite Institutional Health Score (0-100%)
    // Weights: Academic (30%), Attendance (25%), Finance (25%), Operational Capacity (20%)
    const academicScore = academicData.passRate || 0;
    const attendanceScore = attendanceData.attendanceRate || 0;
    const financialScore = financialData.collectionEfficiency || 0;

    const compositeHealthScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          0.3 * academicScore +
          0.25 * attendanceScore +
          0.25 * financialScore +
          0.2 * capacityScore
        )
      )
    );

    let healthGrade = 'A';
    let healthLabel = 'Exceptional Institutional Performance';
    if (compositeHealthScore >= 90) {
      healthGrade = 'A+';
      healthLabel = 'Superior / Benchmark Institution';
    } else if (compositeHealthScore >= 80) {
      healthGrade = 'A';
      healthLabel = 'Strong & Healthy Operations';
    } else if (compositeHealthScore >= 70) {
      healthGrade = 'B';
      healthLabel = 'Good / Satisfactory Operations';
    } else if (compositeHealthScore >= 60) {
      healthGrade = 'C';
      healthLabel = 'Requires Operational Review';
    } else {
      healthGrade = 'D';
      healthLabel = 'Critical Operational Intervention Needed';
    }

    // 4. Multi-Risk Tiers Summary
    const riskCounts = {
      tripleRisk: multiRiskStudents.filter((s) => s.riskTier === 'TRIPLE_RISK').length,
      dualRisk: multiRiskStudents.filter((s) =>
        ['ACADEMIC_ATTENDANCE', 'ACADEMIC_FINANCIAL', 'ATTENDANCE_FINANCIAL'].includes(s.riskTier)
      ).length,
      singleRisk: multiRiskStudents.filter((s) =>
        ['ACADEMIC_ONLY', 'ATTENDANCE_ONLY', 'FINANCIAL_ONLY'].includes(s.riskTier)
      ).length,
      totalFlagged: multiRiskStudents.length,
    };

    return {
      scorecard: {
        compositeHealthScore,
        healthGrade,
        healthLabel,
        pillars: [
          {
            key: 'academic',
            name: 'Academic Mastery',
            score: academicScore,
            target: 75,
            weight: '30%',
            status: academicScore >= 75 ? 'ON_TRACK' : 'NEEDS_ATTENTION',
            detail: `${academicData.meanScore}% average exam score`,
          },
          {
            key: 'attendance',
            name: 'Attendance & Presence',
            score: attendanceScore,
            target: 80,
            weight: '25%',
            status: attendanceScore >= 80 ? 'ON_TRACK' : 'NEEDS_ATTENTION',
            detail: `${attendanceScore}% pupil attendance ratio`,
          },
          {
            key: 'finance',
            name: 'Fiscal Collection Health',
            score: financialScore,
            target: 85,
            weight: '25%',
            status: financialScore >= 85 ? 'ON_TRACK' : 'NEEDS_ATTENTION',
            detail: `${financialScore}% fee recovery efficiency`,
          },
          {
            key: 'capacity',
            name: 'Space & Resource Efficiency',
            score: Math.round(capacityScore),
            target: 80,
            weight: '20%',
            status: capacityScore >= 70 ? 'ON_TRACK' : 'NEEDS_ATTENTION',
            detail: `${overallCapacityRate}% classroom seat utilization`,
          },
        ],
      },
      kpis: {
        totalStudents,
        totalTeachers,
        strRatio: `${strRatio}:1`,
        strStatus,
        overallCapacityRate: `${overallCapacityRate}%`,
        totalCapacity,
        collectionEfficiency: `${financialScore}%`,
        totalOutstandingFees: financialData.totalOutstanding,
        netOperatingMargin: financialData.netOperatingMargin,
        totalFlaggedAtRisk: riskCounts.totalFlagged,
      },
      enrollment: enrollmentData,
      faculty: {
        ...facultyData,
        strRatio,
        strStatus,
      },
      academics: academicData,
      attendance: attendanceData,
      finance: financialData,
      multiRiskRadar: {
        summary: riskCounts,
        students: multiRiskStudents,
      },
      longitudinal: longitudinalTrends,
    };
  }
}

module.exports = AnalyticsService;
