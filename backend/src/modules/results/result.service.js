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
          const weight = Number(m.weight_percentage || 100);
          subTotalScore += (score / (max || 100)) * weight;
          subAssessedWeight += weight;
        });

        // Progressive score calculation - visible immediately on mark update
        const isFullyAssessed = subAssessedWeight >= 100;
        const normalizedScore = subAssessedWeight > 0
          ? Math.round((subTotalScore / subAssessedWeight) * 100 * 10) / 10
          : 0;
        const rawWeightedScore = Math.round(subTotalScore * 10) / 10;

        let gradeInfo;
        if (subAssessedWeight > 0) {
          gradeInfo = this.mapScoreToGrade(normalizedScore, gradingScales);
          totalCompletedScore += normalizedScore;
          evaluatedSubjectsCount += 1;
        } else {
          gradeInfo = {
            letter: '—',
            gradePoint: null,
            description: 'No marks entered',
          };
        }

        totalAssessedWeightAll += subAssessedWeight;

        subjectBreakdown[sub.id] = {
          subjectName: sub.name,
          subjectCode: sub.code,
          score: normalizedScore,
          rawWeightedScore,
          assessedWeight: subAssessedWeight,
          isFullyAssessed,
          grade: gradeInfo.letter,
          gradePoint: gradeInfo.gradePoint,
          isAbsent: subMarks.some((m) => m.is_absent),
          remark: subAssessedWeight >= 100
            ? gradeInfo.description
            : (subAssessedWeight > 0 ? `${gradeInfo.description} (${Math.round(subAssessedWeight)}% assessed)` : 'No marks entered'),
        };
      });

      const isStudentComplete = subjects.length > 0 && evaluatedSubjectsCount === subjects.length && totalAssessedWeightAll >= (subjects.length * 100);
      
      const averageScore =
        evaluatedSubjectsCount > 0
          ? Math.round((totalCompletedScore / evaluatedSubjectsCount) * 10) / 10
          : 0;

      let overallGrade;
      let status;

      if (evaluatedSubjectsCount > 0) {
        overallGrade = this.mapScoreToGrade(averageScore, gradingScales).letter;
        status = isStudentComplete
          ? (averageScore >= 50 ? 'PASSED / PROMOTED' : 'FAILED')
          : (averageScore >= 50
              ? `IN PROGRESS (Passing - ${evaluatedSubjectsCount}/${subjects.length} Evaluated)`
              : `IN PROGRESS (Needs Improvement - ${evaluatedSubjectsCount}/${subjects.length} Evaluated)`);
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

    // Compute ranks based on progressive average score
    studentResults.sort((a, b) => {
      if (a.completedSubjectsCount > 0 && b.completedSubjectsCount === 0) return -1;
      if (a.completedSubjectsCount === 0 && b.completedSubjectsCount > 0) return 1;
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
    const evaluatedStudents = studentResults.filter((s) => s.completedSubjectsCount > 0);
    const sectionAverage =
      evaluatedStudents.length > 0
        ? Math.round(
            (evaluatedStudents.reduce((acc, curr) => acc + curr.averageScore, 0) /
              evaluatedStudents.length) *
              10
          ) / 10
        : 0;

    const passCount = evaluatedStudents.filter((s) => s.averageScore >= 50).length;
    const failCount = evaluatedStudents.length - passCount;

    return {
      sectionId,
      term: term || 'Semester 1',
      totalStudents: studentResults.length,
      completedStudentsCount: evaluatedStudents.length,
      sectionAverage,
      passRate: evaluatedStudents.length ? Math.round((passCount / evaluatedStudents.length) * 100) : 0,
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

    // Initialize all section subjects if section_id is present
    let sectionSubjects = [];
    if (rawData.student.section_id) {
      try {
        sectionSubjects = await this.repository.getSectionSubjects(rawData.student.section_id, teacherId);
      } catch (err) {
        console.warn('Section subjects lookup fallback:', err.message);
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
    let evaluatedCount = 0;

    const subjectResults = Object.values(subjectMap).map((sub) => {
      const isFullyAssessed = sub.totalWeight >= 100;
      const normalizedScore = sub.totalWeight > 0
        ? Math.round((sub.totalScore / sub.totalWeight) * 100 * 10) / 10
        : 0;
      const rawWeightedScore = Math.round(sub.totalScore * 10) / 10;

      let gradeInfo;
      if (sub.totalWeight > 0) {
        gradeInfo = this.mapScoreToGrade(normalizedScore, gradingScales);
        grandTotal += normalizedScore;
        evaluatedCount += 1;
      } else {
        gradeInfo = {
          letter: '—',
          gradePoint: null,
          description: 'Not yet assessed',
        };
      }

      return {
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
        assessments: sub.assessments,
        totalScore: normalizedScore,
        rawWeightedScore,
        totalWeight: sub.totalWeight,
        isFullyAssessed,
        gradeLetter: gradeInfo.letter,
        gradePoint: gradeInfo.gradePoint,
        remark: isFullyAssessed
          ? gradeInfo.description
          : (sub.totalWeight > 0 ? `${gradeInfo.description} (${Math.round(sub.totalWeight)}% evaluated)` : 'Not yet assessed'),
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

    const isAllComplete = subjectResults.length > 0 && evaluatedCount === subjectResults.length && subjectResults.every((s) => s.isFullyAssessed);
    const averageScore =
      evaluatedCount > 0 ? Math.round((grandTotal / evaluatedCount) * 10) / 10 : 0;

    let finalGradeLetter;
    let finalGradePoint;
    let promotionStatus;

    if (evaluatedCount > 0) {
      const finalGrade = this.mapScoreToGrade(averageScore, gradingScales);
      finalGradeLetter = finalGrade.letter;
      finalGradePoint = finalGrade.gradePoint;
      promotionStatus = isAllComplete
        ? (averageScore >= 50 ? 'PASSED / PROMOTED' : 'REQUIRES REMEDIATION')
        : (averageScore >= 50
            ? `IN PROGRESS (Passing - ${evaluatedCount}/${subjectResults.length} Subjects Evaluated)`
            : `IN PROGRESS (Needs Improvement - ${evaluatedCount}/${subjectResults.length} Subjects Evaluated)`);
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
}

module.exports = ResultService;

