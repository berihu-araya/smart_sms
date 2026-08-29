class ResultService {
  constructor(repository) {
    this.repository = repository;
  }

  mapScoreToGrade(score, gradingScales) {
    const numScore = Number(score || 0);
    for (const scale of gradingScales) {
      if (numScore >= Number(scale.min_score) && numScore <= Number(scale.max_score)) {
        return {
          letter: scale.grade_letter,
          gradePoint: Number(scale.grade_point),
          description: scale.description,
        };
      }
    }
    return { letter: 'F', gradePoint: 0.0, description: 'Fail' };
  }

  async calculateSectionResults({ sectionId, academicYearId, term }) {
    const [gradingScales, students, subjects, marks] = await Promise.all([
      this.repository.getGradingScales(),
      this.repository.getSectionStudents(sectionId),
      this.repository.getSectionSubjects(sectionId),
      this.repository.getSectionMarks(sectionId, { academicYearId, term }),
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
      let totalWeightedScore = 0;
      let totalSubjectsEvaluated = 0;
      const subjectBreakdown = {};

      subjects.forEach((sub) => {
        const subMarks = studentMarks[sub.id] || [];
        let subTotalScore = 0;
        let subMaxMarks = 0;

        subMarks.forEach((m) => {
          const score = m.is_absent ? 0 : Number(m.score || 0);
          const max = Number(m.max_marks || 100);
          const weight = Number(m.weight_percentage || 100);
          subTotalScore += (score / (max || 100)) * weight;
          subMaxMarks += weight;
        });

        // Normalize if exams defined
        const normalizedScore = subMaxMarks > 0 ? (subTotalScore / subMaxMarks) * 100 : 0;
        const gradeInfo = this.mapScoreToGrade(normalizedScore, gradingScales);

        if (subMarks.length > 0) {
          totalWeightedScore += normalizedScore;
          totalSubjectsEvaluated += 1;
        }

        subjectBreakdown[sub.id] = {
          subjectName: sub.name,
          subjectCode: sub.code,
          score: Math.round(normalizedScore * 10) / 10,
          grade: gradeInfo.letter,
          gradePoint: gradeInfo.gradePoint,
          isAbsent: subMarks.some((m) => m.is_absent),
        };
      });

      const averageScore =
        totalSubjectsEvaluated > 0
          ? Math.round((totalWeightedScore / totalSubjectsEvaluated) * 10) / 10
          : 0;

      const overallGrade = this.mapScoreToGrade(averageScore, gradingScales);

      return {
        studentId: s.id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        gender: s.gender,
        sectionName: s.section_name,
        gradeName: s.grade_name,
        totalWeightedScore: Math.round(totalWeightedScore * 10) / 10,
        averageScore,
        overallGrade: overallGrade.letter,
        status: averageScore >= 50 ? 'PROMOTED' : 'CONDITIONAL',
        subjects: subjectBreakdown,
      };
    });

    // Compute ranks with standard tie-handling
    studentResults.sort((a, b) => b.averageScore - a.averageScore);
    let currentRank = 1;
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].averageScore < studentResults[i - 1].averageScore) {
        currentRank = i + 1;
      }
      studentResults[i].rank = currentRank;
    }

    // Section overview statistics
    const sectionAverage =
      studentResults.length > 0
        ? Math.round(
            (studentResults.reduce((acc, curr) => acc + curr.averageScore, 0) /
              studentResults.length) *
              10
          ) / 10
        : 0;

    const passCount = studentResults.filter((s) => s.averageScore >= 50).length;
    const failCount = studentResults.length - passCount;

    return {
      sectionId,
      term: term || 'Semester 1',
      totalStudents: studentResults.length,
      sectionAverage,
      passRate: studentResults.length ? Math.round((passCount / studentResults.length) * 100) : 0,
      passCount,
      failCount,
      subjects,
      rankings: studentResults,
    };
  }

  async getReportCard(studentId, { academicYearId = null, term = null } = {}) {
    const rawData = await this.repository.getStudentReportCardData(studentId, {
      academicYearId,
      term,
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
          maxMarks: 0,
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
      subjectMap[m.subject_id].maxMarks += weight;
    }

    const subjectResults = Object.values(subjectMap).map((sub) => {
      const normalizedScore =
        sub.maxMarks > 0 ? Math.round((sub.totalScore / sub.maxMarks) * 1000) / 10 : 0;
      const grade = this.mapScoreToGrade(normalizedScore, gradingScales);

      return {
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
        assessments: sub.assessments,
        totalScore: normalizedScore,
        gradeLetter: grade.letter,
        gradePoint: grade.gradePoint,
        remark: grade.description,
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

    const grandTotal = subjectResults.reduce((acc, curr) => acc + curr.totalScore, 0);
    const averageScore =
      subjectResults.length > 0 ? Math.round((grandTotal / subjectResults.length) * 10) / 10 : 0;
    const finalGrade = this.mapScoreToGrade(averageScore, gradingScales);

    return {
      student: rawData.student,
      school: rawData.school,
      attendance: rawData.attendance,
      academicSummary: {
        term: term || 'Semester 1',
        totalSubjects: subjectResults.length,
        grandTotal: Math.round(grandTotal * 10) / 10,
        averageScore,
        finalGradeLetter: finalGrade.letter,
        finalGradePoint: finalGrade.gradePoint,
        rankInSection: rank,
        totalSectionStudents,
        promotionStatus: averageScore >= 50 ? 'PASSED / PROMOTED' : 'REQUIRES REMEDIATION',
        conduct: 'Excellent',
      },
      subjects: subjectResults,
      gradingScales,
    };
  }
}

module.exports = ResultService;
