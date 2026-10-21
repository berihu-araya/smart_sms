class ResultService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Map total numerical score (out of 100) to standard letter grades: A, B, C, D, F
   */
  mapScoreToGrade(score, gradingScales = []) {
    const numScore = Number(score || 0);

    if (gradingScales && gradingScales.length > 0) {
      for (const scale of gradingScales) {
        if (numScore >= Number(scale.min_score) && numScore <= Number(scale.max_score)) {
          return {
            letter: scale.grade_letter,
            gradePoint: Number(scale.grade_point),
            description: scale.description,
          };
        }
      }
    }

    // Standard 5-tier A, B, C, D, F fallback
    if (numScore >= 80) return { letter: 'A', gradePoint: 4.0, description: 'Excellent / Distinction' };
    if (numScore >= 70) return { letter: 'B', gradePoint: 3.0, description: 'Very Good / Above Average' };
    if (numScore >= 60) return { letter: 'C', gradePoint: 2.0, description: 'Satisfactory / Pass' };
    if (numScore >= 50) return { letter: 'D', gradePoint: 1.0, description: 'Conditional Pass / Low' };
    return { letter: 'F', gradePoint: 0.0, description: 'Fail / Unsatisfactory' };
  }

  async calculateSectionResults({ sectionId, academicYearId, term, teacherId = null }) {
    const [gradingScales, students, subjects, marks] = await Promise.all([
      this.repository.getGradingScales(),
      this.repository.getSectionStudents(sectionId, academicYearId),
      this.repository.getSectionSubjects(sectionId, teacherId),
      this.repository.getSectionMarks(sectionId, { academicYearId, term, teacherId }),
    ]);

    // Map marks by student and subject
    const marksByStudent = {};
    for (const m of marks) {
      if (!marksByStudent[m.student_id]) {
        marksByStudent[m.student_id] = {};
      }
      if (!marksByStudent[m.student_id][m.subject_id]) {
        marksByStudent[m.student_id][m.subject_id] = [];
      }
      marksByStudent[m.student_id][m.subject_id].push(m);
    }

    // Compute for each student
    const studentResults = students.map((s) => {
      const studentMarks = marksByStudent[s.id] || {};
      let totalCompletedScore = 0;
      let evaluatedSubjectsCount = 0;
      let totalAssessedWeightAll = 0;
      const subjectBreakdown = {};

      subjects.forEach((sub) => {
        const subMarks = studentMarks[sub.id] || [];
        let subTotalScore = 0;
        let subAssessedWeight = 0;

        subMarks.forEach((m) => {
          const score = m.is_absent ? 0 : Number(m.score || 0);
          const max = Number(m.max_marks || 100);
          const weight = Number(m.weight_percentage || max);
          subTotalScore += (score / (max || 100)) * weight;
          subAssessedWeight += weight;
        });

        // Progressive score calculation - strictly finalize grade only when total reaches 100%
        const isFullyAssessed = subAssessedWeight >= 100;
        const rawWeightedScore = Math.round(subTotalScore * 10) / 10;

        let gradeInfo;
        if (isFullyAssessed) {
          const finalScore = Math.min(100, rawWeightedScore);
          gradeInfo = this.mapScoreToGrade(finalScore, gradingScales);
          totalCompletedScore += finalScore;
          evaluatedSubjectsCount += 1;
        } else {
          gradeInfo = {
            letter: '—',
            gradePoint: null,
            description: subAssessedWeight > 0
              ? `In Progress (${Math.round(subAssessedWeight)}/100 assessed)`
              : 'No marks entered',
          };
          if (subAssessedWeight > 0) {
            totalCompletedScore += rawWeightedScore;
          }
        }

        totalAssessedWeightAll += subAssessedWeight;

        subjectBreakdown[sub.id] = {
          subjectName: sub.name,
          subjectCode: sub.code,
          score: rawWeightedScore,
          rawWeightedScore,
          assessedWeight: subAssessedWeight,
          isFullyAssessed,
          grade: gradeInfo.letter,
          gradePoint: gradeInfo.gradePoint,
          isAbsent: subMarks.some((m) => m.is_absent),
          remark: gradeInfo.description,
        };
      });

      const isStudentComplete = subjects.length > 0 && evaluatedSubjectsCount === subjects.length && totalAssessedWeightAll >= (subjects.length * 100);
      
      const averageScore = subjects.length > 0
        ? (isStudentComplete
            ? Math.round((totalCompletedScore / subjects.length) * 10) / 10
            : (evaluatedSubjectsCount > 0
                ? Math.round((totalCompletedScore / evaluatedSubjectsCount) * 10) / 10
                : 0))
        : 0;

      let overallGrade;
      let status;

      if (isStudentComplete) {
        overallGrade = this.mapScoreToGrade(averageScore, gradingScales).letter;
        status = averageScore >= 50 ? 'PASSED / PROMOTED' : 'FAILED';
      } else if (totalAssessedWeightAll > 0) {
        overallGrade = '—';
        status = `IN PROGRESS (${evaluatedSubjectsCount}/${subjects.length} Subjects Completed)`;
      } else {
        overallGrade = '—';
        status = 'NO MARKS RECORDED';
      }

      return {
        studentId: s.id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        gender: s.gender,
        sectionName: s.section_name,
        gradeName: s.grade_name,
        totalWeightedScore: Math.round(totalCompletedScore * 10) / 10,
        averageScore,
        overallGrade,
        isComplete: isStudentComplete,
        completedSubjectsCount: evaluatedSubjectsCount,
        totalSubjectsCount: subjects.length,
        status,
        subjects: subjectBreakdown,
      };
    });

    // Compute ranks based on progressive score
    studentResults.sort((a, b) => {
      if (a.isComplete && !b.isComplete) return -1;
      if (!a.isComplete && b.isComplete) return 1;
      return b.totalWeightedScore - a.totalWeightedScore;
    });

    let currentRank = 1;
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].totalWeightedScore < studentResults[i - 1].totalWeightedScore) {
        currentRank = i + 1;
      }
      studentResults[i].rank = currentRank;
    }

    // Section overview statistics
    const evaluatedStudents = studentResults.filter((s) => s.isComplete || s.completedSubjectsCount > 0);
    const completedStudents = studentResults.filter((s) => s.isComplete);
    const sectionAverage =
      completedStudents.length > 0
        ? Math.round(
            (completedStudents.reduce((acc, curr) => acc + curr.averageScore, 0) /
              completedStudents.length) *
              10
          ) / 10
        : (evaluatedStudents.length > 0
            ? Math.round(
                (evaluatedStudents.reduce((acc, curr) => acc + curr.averageScore, 0) /
                  evaluatedStudents.length) *
                  10
              ) / 10
            : 0);

    const passCount = studentResults.filter((s) => s.isComplete && s.averageScore >= 50).length;
    const failCount = studentResults.filter((s) => s.isComplete && s.averageScore < 50).length;

    return {
      sectionId,
      term: term || 'Semester 1',
      totalStudents: studentResults.length,
      completedStudentsCount: completedStudents.length,
      sectionAverage,
      passRate: completedStudents.length ? Math.round((passCount / completedStudents.length) * 100) : 0,
      passCount,
      failCount,
      subjects,
      rankings: studentResults,
    };
  }

  async getReportCard(studentId, { academicYearId = null, term = null, teacherId = null } = {}) {
    const rawData = await this.repository.getStudentReportCardData(studentId, {
      academicYearId,
      term,
      teacherId,
    });

    if (!rawData || !rawData.student) {
      const error = new Error('Student not found');
      error.status = 404;
      throw error;
    }

    const gradingScales = await this.repository.getGradingScales();

    // Initialize all section/grade subjects if section_id or grade_id is present
    let sectionSubjects = [];
    if (rawData.student.section_id) {
      try {
        sectionSubjects = await this.repository.getSectionSubjects(rawData.student.section_id, teacherId);
      } catch (err) {
        console.warn('Section subjects lookup fallback:', err.message);
      }
    }
    if ((!sectionSubjects || sectionSubjects.length === 0) && rawData.student.grade_id) {
      try {
        sectionSubjects = await this.repository.getGradeSubjects(rawData.student.grade_id, teacherId);
      } catch (err) {
        console.warn('Grade subjects lookup fallback:', err.message);
      }
    }

    // Group marks by subject
    const subjectMap = {};
    for (const sub of sectionSubjects) {
      subjectMap[sub.id] = {
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        assessments: [],
        totalScore: 0,
        totalWeight: 0,
      };
    }

    for (const m of rawData.marks) {
      if (!subjectMap[m.subject_id]) {
        subjectMap[m.subject_id] = {
          subjectId: m.subject_id,
          subjectName: m.subject_name,
          subjectCode: m.subject_code,
          assessments: [],
          totalScore: 0,
          totalWeight: 0,
        };
      }
      const score = m.is_absent ? 0 : Number(m.score || 0);
      const max = Number(m.max_marks || 100);
      const weight = Number(m.weight_percentage || max);

      subjectMap[m.subject_id].assessments.push({
        examTitle: m.exam_title,
        examType: m.exam_type,
        score,
        maxMarks: max,
        weight,
        isAbsent: m.is_absent,
      });

      subjectMap[m.subject_id].totalScore += (score / (max || 100)) * weight;
      subjectMap[m.subject_id].totalWeight += weight;
    }

    let grandTotal = 0;
    let evaluatedCount = 0;

    const subjectResults = Object.values(subjectMap).map((sub) => {
      const isFullyAssessed = sub.totalWeight >= 100;
      const rawWeightedScore = Math.round(sub.totalScore * 10) / 10;

      let gradeInfo;
      if (isFullyAssessed) {
        const finalScore = Math.min(100, rawWeightedScore);
        gradeInfo = this.mapScoreToGrade(finalScore, gradingScales);
        grandTotal += finalScore;
        evaluatedCount += 1;
      } else {
        gradeInfo = {
          letter: '—',
          gradePoint: null,
          description: sub.totalWeight > 0
            ? `In Progress (${Math.round(sub.totalWeight)}/100 assessed)`
            : 'Not yet assessed',
        };
        if (sub.totalWeight > 0) {
          grandTotal += rawWeightedScore;
        }
      }

      return {
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
        assessments: sub.assessments,
        totalScore: rawWeightedScore,
        rawWeightedScore,
        totalWeight: sub.totalWeight,
        isFullyAssessed,
        gradeLetter: gradeInfo.letter,
        gradePoint: gradeInfo.gradePoint,
        remark: gradeInfo.description,
      };
    });

    // Compute student's rank in section if sectionId is known
    let rank = 1;
    let totalSectionStudents = 1;
    if (rawData.student.section_id) {
      try {
        const secRes = await this.calculateSectionResults({
          sectionId: rawData.student.section_id,
          academicYearId,
          term,
        });
        const rankedStudent = secRes.rankings.find((r) => r.studentId === studentId);
        if (rankedStudent) {
          rank = rankedStudent.rank;
        }
        totalSectionStudents = secRes.totalStudents;
      } catch (err) {
        console.warn('Rank calculation fallback:', err.message);
      }
    }

    const isAllComplete = subjectResults.length > 0 && subjectResults.every((s) => s.isFullyAssessed);
    const averageScore = isAllComplete
      ? (subjectResults.length > 0 ? Math.round((grandTotal / subjectResults.length) * 10) / 10 : 0)
      : (evaluatedCount > 0 ? Math.round((grandTotal / evaluatedCount) * 10) / 10 : 0);

    let finalGradeLetter;
    let finalGradePoint;
    let promotionStatus;

    if (isAllComplete) {
      const finalGrade = this.mapScoreToGrade(averageScore, gradingScales);
      finalGradeLetter = finalGrade.letter;
      finalGradePoint = finalGrade.gradePoint;
      promotionStatus = averageScore >= 50 ? 'PASSED / PROMOTED' : 'REQUIRES REMEDIATION';
    } else if (evaluatedCount > 0 || subjectResults.some((s) => s.totalWeight > 0)) {
      finalGradeLetter = '—';
      finalGradePoint = null;
      promotionStatus = `IN PROGRESS (${evaluatedCount}/${subjectResults.length} Subjects Completed)`;
    } else {
      finalGradeLetter = '—';
      finalGradePoint = null;
      promotionStatus = 'NO MARKS RECORDED';
    }

    return {
      student: rawData.student,
      school: rawData.school,
      attendance: rawData.attendance,
      academicSummary: {
        term: term || 'Current Term',
        academicYearId: rawData.academicYearId || academicYearId || null,
        academicYearName: rawData.academicYearName || null,
        totalSubjects: subjectResults.length,
        completedSubjects: evaluatedCount,
        isComplete: isAllComplete,
        grandTotal: Math.round(grandTotal * 10) / 10,
        averageScore,
        finalGradeLetter,
        finalGradePoint,
        rankInSection: rank,
        totalSectionStudents,
        promotionStatus,
        conduct: 'Excellent',
      },
      subjects: subjectResults,
      gradingScales,
    };
  }

  async generateAcademicReport({
    academicYearId = null,
    gradeId = null,
    sectionId = null,
    term = null,
    userRole = '',
    studentId = null,
    accessibleSectionIds = null,
    teacherId = null,
  } = {}) {
    const role = (userRole || '').toLowerCase().trim();
    const isStudentOrParent = role.includes('student') || role.includes('parent');

    // 1. Individual Student / Parent View
    if (isStudentOrParent && studentId) {
      const analytics = await this.repository.getStudentAcademicAnalytics(studentId, { academicYearId, term });
      if (!analytics || !analytics.student) {
        return {
          mode: 'individual',
          student: null,
          academicSummary: {},
          subjectPerformance: [],
          strengths: [],
          focusAreas: [],
          attendance: {},
          gradingScales: [],
        };
      }

      const reportCard = await this.getReportCard(studentId, { academicYearId, term });
      const gradingScales = analytics.gradingScales || [];

      // Calculate section average for each subject from cohort marks
      const sectionSubMap = {};
      (analytics.sectionMarks || []).forEach((m) => {
        if (!sectionSubMap[m.subject_id]) {
          sectionSubMap[m.subject_id] = { total: 0, count: 0 };
        }
        const score = m.is_absent ? 0 : Number(m.score || 0);
        const max = Number(m.max_marks || 100);
        const weight = Number(m.weight_percentage || max);
        sectionSubMap[m.subject_id].total += (score / max) * weight;
        sectionSubMap[m.subject_id].count++;
      });

      const subjectsComparison = (reportCard.subjects || []).map((sub) => {
        const secStats = sectionSubMap[sub.subjectId];
        const secAvg = secStats && secStats.count > 0
          ? Math.round((secStats.total / secStats.count) * 10) / 10
          : null;
        const diff = secAvg !== null ? Math.round((sub.totalScore - secAvg) * 10) / 10 : 0;
        return {
          ...sub,
          sectionAverage: secAvg,
          relativePerformance: diff >= 0 ? `+${diff}%` : `${diff}%`,
          isAhead: diff >= 0,
        };
      });

      const strengths = subjectsComparison.filter((s) => s.totalScore >= 75 || s.isAhead);
      const focusAreas = subjectsComparison.filter((s) => s.totalScore < 60 || !s.isAhead);

      return {
        mode: 'individual',
        student: reportCard.student,
        school: reportCard.school,
        academicSummary: reportCard.academicSummary,
        subjectPerformance: subjectsComparison,
        strengths,
        focusAreas,
        attendance: reportCard.attendance,
        gradingScales,
      };
    }

    // 2. Institutional / Cohort View (Admin, Teacher, Staff)
    const cohortData = await this.repository.getAcademicReportCohortData({
      academicYearId,
      gradeId,
      sectionId,
      term,
      accessibleSectionIds,
      teacherId,
    });

    const { students, marks, subjects, gradingScales, sections, school } = cohortData;

    // Group marks by student and subject
    const marksByStudent = {};
    const marksBySubject = {};

    marks.forEach((m) => {
      // By student
      if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = {};
      if (!marksByStudent[m.student_id][m.subject_id]) marksByStudent[m.student_id][m.subject_id] = [];
      marksByStudent[m.student_id][m.subject_id].push(m);

      // By subject
      if (!marksBySubject[m.subject_id]) marksBySubject[m.subject_id] = [];
      marksBySubject[m.subject_id].push(m);
    });

    // Evaluate each student
    const evaluatedStudents = [];
    const pendingStudents = [];

    students.forEach((s) => {
      const studentMarks = marksByStudent[s.id] || {};
      let totalWeightedScore = 0;
      let evaluatedSubjectsCount = 0;
      const studentSubjectBreakdown = {};
      const failedSubjects = [];

      subjects.forEach((sub) => {
        const subMarks = studentMarks[sub.id] || [];
        if (subMarks.length === 0) {
          studentSubjectBreakdown[sub.id] = {
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            score: null,
            grade: '—',
            isAbsent: false,
            assessed: false,
          };
          return;
        }

        let subScore = 0;
        let subWeight = 0;
        let isAbsent = false;

        subMarks.forEach((m) => {
          if (m.is_absent) isAbsent = true;
          const score = m.is_absent ? 0 : Number(m.score || 0);
          const max = Number(m.max_marks || 100);
          const weight = Number(m.weight_percentage || max);
          subScore += (score / (max || 100)) * weight;
          subWeight += weight;
        });

        const rawScore = Math.round(subScore * 10) / 10;
        totalWeightedScore += rawScore;
        evaluatedSubjectsCount++;

        const gradeInfo = this.mapScoreToGrade(rawScore, gradingScales);
        if (rawScore < 50) {
          failedSubjects.push({
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            score: rawScore,
            grade: gradeInfo.letter,
          });
        }

        studentSubjectBreakdown[sub.id] = {
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          score: rawScore,
          weight: subWeight,
          grade: gradeInfo.letter,
          gradePoint: gradeInfo.gradePoint,
          isAbsent,
          assessed: true,
        };
      });

      const hasMarks = evaluatedSubjectsCount > 0;
      const averageScore = hasMarks
        ? Math.round((totalWeightedScore / evaluatedSubjectsCount) * 10) / 10
        : 0;
      const overallGrade = hasMarks
        ? this.mapScoreToGrade(averageScore, gradingScales).letter
        : '—';
      const status = hasMarks
        ? (averageScore >= 50 ? 'PASSED' : 'FAILED')
        : 'NO MARKS';

      const studentData = {
        studentId: s.id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        gender: s.gender,
        sectionId: s.section_id,
        sectionName: s.section_name,
        gradeId: s.grade_id,
        gradeName: s.grade_name,
        parentName: s.parent_name,
        parentPhone: s.parent_phone,
        totalWeightedScore: Math.round(totalWeightedScore * 10) / 10,
        evaluatedSubjectsCount,
        averageScore,
        overallGrade,
        status,
        failedSubjects,
        failedCount: failedSubjects.length,
        isAtRisk: averageScore < 50 || failedSubjects.length > 0,
        subjects: studentSubjectBreakdown,
      };

      if (hasMarks) {
        evaluatedStudents.push(studentData);
      } else {
        pendingStudents.push(studentData);
      }
    });

    // Rank evaluated students by totalWeightedScore and averageScore
    evaluatedStudents.sort((a, b) => b.totalWeightedScore - a.totalWeightedScore);
    let currentRank = 1;
    for (let i = 0; i < evaluatedStudents.length; i++) {
      if (i > 0 && evaluatedStudents[i].totalWeightedScore < evaluatedStudents[i - 1].totalWeightedScore) {
        currentRank = i + 1;
      }
      evaluatedStudents[i].rank = currentRank;
    }

    // Key Executive Metrics
    const totalStudentsCount = students.length;
    const evaluatedCount = evaluatedStudents.length;
    const passCount = evaluatedStudents.filter((s) => s.averageScore >= 50).length;
    const failCount = evaluatedStudents.filter((s) => s.averageScore < 50).length;
    const passRate = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 1000) / 10 : 0;

    const overallAverage = evaluatedCount > 0
      ? Math.round(
          (evaluatedStudents.reduce((acc, curr) => acc + curr.averageScore, 0) / evaluatedCount) * 10
        ) / 10
      : 0;

    const honorsStudents = evaluatedStudents.filter((s) => s.averageScore >= 80);
    const honorsCount = honorsStudents.length;
    const honorsRate = evaluatedCount > 0 ? Math.round((honorsCount / evaluatedCount) * 1000) / 10 : 0;

    const atRiskStudents = evaluatedStudents.filter((s) => s.isAtRisk);
    const atRiskCount = atRiskStudents.length;

    const highestScore = evaluatedStudents.length > 0 ? evaluatedStudents[0].averageScore : 0;
    const lowestScore = evaluatedStudents.length > 0
      ? evaluatedStudents[evaluatedStudents.length - 1].averageScore
      : 0;

    // Grade Distribution Histogram
    const gradeDistribution = (gradingScales || []).map((scale) => {
      const min = Number(scale.min_score);
      const max = Number(scale.max_score);
      const count = evaluatedStudents.filter((s) => s.averageScore >= min && s.averageScore <= max).length;
      const percentage = evaluatedCount > 0 ? Math.round((count / evaluatedCount) * 1000) / 10 : 0;
      return {
        gradeLetter: scale.grade_letter,
        minScore: min,
        maxScore: max,
        gradePoint: Number(scale.grade_point),
        description: scale.description,
        count,
        percentage,
      };
    });

    // Subject Performance Analytics
    const subjectPerformance = subjects.map((sub) => {
      const subStudentsWithMarks = evaluatedStudents
        .map((s) => s.subjects[sub.id])
        .filter((sm) => sm && sm.assessed);

      const assessedCount = subStudentsWithMarks.length;
      if (assessedCount === 0) {
        return {
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          enrolledCount: totalStudentsCount,
          assessedCount: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0,
          passCount: 0,
          failCount: 0,
          status: 'No Marks',
        };
      }

      const totalScore = subStudentsWithMarks.reduce((acc, curr) => acc + curr.score, 0);
      const subAvg = Math.round((totalScore / assessedCount) * 10) / 10;
      const maxScore = Math.max(...subStudentsWithMarks.map((s) => s.score));
      const minScore = Math.min(...subStudentsWithMarks.map((s) => s.score));
      const subPassCount = subStudentsWithMarks.filter((s) => s.score >= 50).length;
      const subPassRate = Math.round((subPassCount / assessedCount) * 1000) / 10;

      let status = 'Satisfactory';
      if (subAvg >= 75) status = 'High Performing';
      else if (subAvg < 60) status = 'Needs Focus';

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        enrolledCount: totalStudentsCount,
        assessedCount,
        averageScore: subAvg,
        highestScore: maxScore,
        lowestScore: minScore,
        passRate: subPassRate,
        passCount: subPassCount,
        failCount: assessedCount - subPassCount,
        status,
      };
    });

    // Section & Class Comparison
    const sectionMap = {};
    sections.forEach((sec) => {
      sectionMap[sec.id] = {
        sectionId: sec.id,
        sectionName: sec.name,
        gradeName: sec.grade_name,
        gradeId: sec.grade_id,
        totalStudents: 0,
        evaluatedStudents: 0,
        totalScoreSum: 0,
        passedStudents: 0,
        topStudent: null,
      };
    });

    students.forEach((s) => {
      if (sectionMap[s.section_id]) {
        sectionMap[s.section_id].totalStudents++;
      }
    });

    evaluatedStudents.forEach((s) => {
      if (sectionMap[s.sectionId]) {
        const sec = sectionMap[s.sectionId];
        sec.evaluatedStudents++;
        sec.totalScoreSum += s.averageScore;
        if (s.averageScore >= 50) sec.passedStudents++;
        if (!sec.topStudent || s.averageScore > sec.topStudent.score) {
          sec.topStudent = {
            name: s.name,
            score: s.averageScore,
            grade: s.overallGrade,
          };
        }
      }
    });

    const sectionComparison = Object.values(sectionMap)
      .filter((sec) => sec.totalStudents > 0)
      .map((sec) => ({
        sectionId: sec.sectionId,
        sectionName: sec.sectionName,
        gradeName: sec.gradeName,
        totalStudents: sec.totalStudents,
        evaluatedStudents: sec.evaluatedStudents,
        averageScore: sec.evaluatedStudents > 0
          ? Math.round((sec.totalScoreSum / sec.evaluatedStudents) * 10) / 10
          : 0,
        passRate: sec.evaluatedStudents > 0
          ? Math.round((sec.passedStudents / sec.evaluatedStudents) * 1000) / 10
          : 0,
        topStudent: sec.topStudent,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    // Honor Roll (Top Performers Leaderboard)
    const honorRoll = evaluatedStudents
      .filter((s) => s.averageScore >= 75)
      .slice(0, 15)
      .map((s, idx) => ({
        rank: idx + 1,
        studentId: s.studentId,
        name: s.name,
        admissionNumber: s.admissionNumber,
        gradeName: s.gradeName,
        sectionName: s.sectionName,
        averageScore: s.averageScore,
        totalScore: s.totalWeightedScore,
        overallGrade: s.overallGrade,
        distinction: s.averageScore >= 85
          ? 'Summa Cum Laude / High Distinction'
          : 'Magna Cum Laude / Honors',
      }));

    // At-Risk Register (Academic Intervention List)
    const atRiskRegister = atRiskStudents.map((s) => ({
      studentId: s.studentId,
      name: s.name,
      admissionNumber: s.admissionNumber,
      gradeName: s.gradeName,
      sectionName: s.sectionName,
      averageScore: s.averageScore,
      overallGrade: s.overallGrade,
      failedCount: s.failedCount,
      failedSubjects: s.failedSubjects,
      parentName: s.parentName || 'Not Linked',
      parentPhone: s.parentPhone || 'Not Available',
      riskLevel: s.averageScore < 40 || s.failedCount >= 2 ? 'Critical' : 'Moderate',
    }));

    // Broadsheet Matrix
    const broadsheet = [...evaluatedStudents, ...pendingStudents].map((s) => ({
      studentId: s.studentId,
      admissionNumber: s.admissionNumber,
      name: s.name,
      gender: s.gender,
      gradeName: s.gradeName,
      sectionName: s.sectionName,
      rank: s.rank || '—',
      totalWeightedScore: s.totalWeightedScore,
      averageScore: s.averageScore,
      overallGrade: s.overallGrade,
      status: s.status,
      subjects: s.subjects,
    }));

    return {
      mode: 'cohort',
      scope: {
        academicYearId,
        gradeId,
        sectionId,
        term: term || 'Semester 1',
      },
      school,
      kpis: {
        totalStudentsCount,
        evaluatedCount,
        overallAverage,
        passRate,
        passCount,
        failCount,
        honorsRate,
        honorsCount,
        atRiskCount,
        highestScore,
        lowestScore,
      },
      gradeDistribution,
      subjectPerformance,
      sectionComparison,
      honorRoll,
      atRiskRegister,
      broadsheet,
      subjectsList: subjects,
      gradingScales,
    };
  }
}

module.exports = ResultService;

