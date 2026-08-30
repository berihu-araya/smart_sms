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
      this.repository.getSectionStudents(sectionId),
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
      let completedSubjectsCount = 0;
      let totalAssessedWeightAll = 0;
      const subjectBreakdown = {};

      subjects.forEach((sub) => {
        const subMarks = studentMarks[sub.id] || [];
        let subTotalScore = 0;
        let subAssessedWeight = 0;

        subMarks.forEach((m) => {
          const score = m.is_absent ? 0 : Number(m.score || 0);
          const max = Number(m.max_marks || 100);
          const weight = Number(m.weight_percentage || 100);
          subTotalScore += (score / (max || 100)) * weight;
          subAssessedWeight += weight;
        });

        // 100% Completion Rule: Grade (A, B, C, D, F) is awarded ONLY when total assessed weight reaches 100%
        const isFullyAssessed = subAssessedWeight >= 100;
        const roundedScore = Math.round(subTotalScore * 10) / 10;

        let gradeInfo;
        if (isFullyAssessed) {
          gradeInfo = this.mapScoreToGrade(roundedScore, gradingScales);
          totalCompletedScore += roundedScore;
          completedSubjectsCount += 1;
        } else {
          gradeInfo = {
            letter: 'PENDING',
            gradePoint: null,
            description: subAssessedWeight > 0 ? `Incomplete (${Math.round(subAssessedWeight)}% assessed)` : 'No marks entered',
          };
        }

        totalAssessedWeightAll += subAssessedWeight;

        subjectBreakdown[sub.id] = {
          subjectName: sub.name,
          subjectCode: sub.code,
          score: roundedScore,
          assessedWeight: subAssessedWeight,
          isFullyAssessed,
          grade: gradeInfo.letter,
          gradePoint: gradeInfo.gradePoint,
          isAbsent: subMarks.some((m) => m.is_absent),
          remark: gradeInfo.description,
        };
      });

      const isStudentComplete = subjects.length > 0 && completedSubjectsCount === subjects.length;
      
      const averageScore =
        completedSubjectsCount > 0
          ? Math.round((totalCompletedScore / completedSubjectsCount) * 10) / 10
          : 0;

      let overallGrade;
      let status;

      if (isStudentComplete) {
        overallGrade = this.mapScoreToGrade(averageScore, gradingScales).letter;
        status = averageScore >= 50 ? 'PASSED / PROMOTED' : 'FAILED';
      } else {
        overallGrade = 'INCOMPLETE';
        status = `IN PROGRESS (${completedSubjectsCount}/${subjects.length} Completed)`;
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
        completedSubjectsCount,
        totalSubjectsCount: subjects.length,
        status,
        subjects: subjectBreakdown,
      };
    });

    // Compute ranks based on complete average score
    studentResults.sort((a, b) => {
      if (a.isComplete && !b.isComplete) return -1;
      if (!a.isComplete && b.isComplete) return 1;
      return b.averageScore - a.averageScore;
    });

    let currentRank = 1;
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].averageScore < studentResults[i - 1].averageScore) {
        currentRank = i + 1;
      }
      studentResults[i].rank = currentRank;
    }

    // Section overview statistics
    const completedStudents = studentResults.filter((s) => s.isComplete);
    const sectionAverage =
      completedStudents.length > 0
        ? Math.round(
            (completedStudents.reduce((acc, curr) => acc + curr.averageScore, 0) /
              completedStudents.length) *
              10
          ) / 10
        : 0;

    const passCount = completedStudents.filter((s) => s.averageScore >= 50).length;
    const failCount = completedStudents.length - passCount;

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

    // Group marks by subject
    const subjectMap = {};
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
      const weight = Number(m.weight_percentage || 100);

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
    let completedCount = 0;

    const subjectResults = Object.values(subjectMap).map((sub) => {
      const isFullyAssessed = sub.totalWeight >= 100;
      const roundedScore = Math.round(sub.totalScore * 10) / 10;

      let gradeInfo;
      if (isFullyAssessed) {
        gradeInfo = this.mapScoreToGrade(roundedScore, gradingScales);
        grandTotal += roundedScore;
        completedCount += 1;
      } else {
        gradeInfo = {
          letter: 'PENDING',
          gradePoint: null,
          description: sub.totalWeight > 0 ? `Incomplete (${Math.round(sub.totalWeight)}% assessed)` : 'Not yet assessed',
        };
      }

      return {
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
        assessments: sub.assessments,
        totalScore: roundedScore,
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

    const isAllComplete = subjectResults.length > 0 && completedCount === subjectResults.length;
    const averageScore =
      completedCount > 0 ? Math.round((grandTotal / completedCount) * 10) / 10 : 0;

    let finalGradeLetter;
    let finalGradePoint;
    let promotionStatus;

    if (isAllComplete) {
      const finalGrade = this.mapScoreToGrade(averageScore, gradingScales);
      finalGradeLetter = finalGrade.letter;
      finalGradePoint = finalGrade.gradePoint;
      promotionStatus = averageScore >= 50 ? 'PASSED / PROMOTED' : 'REQUIRES REMEDIATION';
    } else {
      finalGradeLetter = 'PENDING';
      finalGradePoint = null;
      promotionStatus = `IN PROGRESS (${completedCount}/${subjectResults.length} Subjects Evaluated)`;
    }

    return {
      student: rawData.student,
      school: rawData.school,
      attendance: rawData.attendance,
      academicSummary: {
        term: term || 'Semester 1',
        totalSubjects: subjectResults.length,
        completedSubjects: completedCount,
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
}

module.exports = ResultService;
