const ResultService = require('../src/modules/results/result.service');

describe('ResultService Dynamic Max Marks & 100% Final Grade Engine', () => {
  const mockGradingScales = [
    { grade_letter: 'A+', min_score: 90.00, max_score: 100.00, grade_point: 4.0, description: 'Excellent / Superior' },
    { grade_letter: 'A',  min_score: 85.00, max_score: 89.99,  grade_point: 4.0, description: 'Very Good / Outstanding' },
    { grade_letter: 'B+', min_score: 75.00, max_score: 84.99,  grade_point: 3.5, description: 'Above Average' },
    { grade_letter: 'B',  min_score: 70.00, max_score: 74.99,  grade_point: 3.0, description: 'Average / Satisfactory' },
    { grade_letter: 'C',  min_score: 50.00, max_score: 69.99,  grade_point: 2.0, description: 'Pass' },
    { grade_letter: 'F',  min_score: 0.00,  max_score: 49.99,  grade_point: 0.0, description: 'Fail / Unsatisfactory' },
  ];

  const mockRepository = {
    getGradingScales: async () => mockGradingScales,
    getSectionStudents: async () => [
      { id: 's1', admission_number: 'STD001', first_name: 'Abebe', last_name: 'Kebede', gender: 'male', section_name: '10A', grade_name: 'Grade 10' }
    ],
    getSectionSubjects: async () => [
      { id: 'sub1', name: 'Mathematics', code: 'MATH101' }
    ],
    getSectionMarks: async () => [],
    getStudentReportCardData: async () => null,
  };

  test('1. Partial assessments (< 100 total weight) remain In Progress and do not assign a premature Letter Grade', async () => {
    const repo = {
      ...mockRepository,
      getSectionMarks: async () => [
        // Only Mid Exam (30 max, 30 weight, score 27) entered so far
        { student_id: 's1', subject_id: 'sub1', exam_id: 'e1', score: 27, max_marks: 30, weight_percentage: 30, is_absent: false }
      ]
    };

    const service = new ResultService(repo);
    const res = await service.calculateSectionResults({ sectionId: 'sec1' });

    expect(res.rankings[0].isComplete).toBe(false);
    expect(res.rankings[0].overallGrade).toBe('—');
    expect(res.rankings[0].totalWeightedScore).toBe(27);
    expect(res.rankings[0].subjects.sub1.isFullyAssessed).toBe(false);
    expect(res.rankings[0].subjects.sub1.grade).toBe('—');
    expect(res.rankings[0].subjects.sub1.remark).toContain('In Progress (30/100 assessed)');
  });

  test('2. Dynamic assessments summing to 100 (e.g. 30 mid + 50 final + 20 assignment = 100) finalize Letter Grade', async () => {
    const repo = {
      ...mockRepository,
      getSectionMarks: async () => [
        { student_id: 's1', subject_id: 'sub1', exam_id: 'e1', score: 27, max_marks: 30, weight_percentage: 30, is_absent: false },
        { student_id: 's1', subject_id: 'sub1', exam_id: 'e2', score: 44, max_marks: 50, weight_percentage: 50, is_absent: false },
        { student_id: 's1', subject_id: 'sub1', exam_id: 'e3', score: 18, max_marks: 20, weight_percentage: 20, is_absent: false },
      ]
    };

    const service = new ResultService(repo);
    const res = await service.calculateSectionResults({ sectionId: 'sec1' });

    expect(res.rankings[0].isComplete).toBe(true);
    expect(res.rankings[0].totalWeightedScore).toBe(89);
    expect(res.rankings[0].averageScore).toBe(89);
    expect(res.rankings[0].overallGrade).toBe('A');
    expect(res.rankings[0].status).toBe('PASSED / PROMOTED');
    expect(res.rankings[0].subjects.sub1.isFullyAssessed).toBe(true);
    expect(res.rankings[0].subjects.sub1.grade).toBe('A');
  });

  test('3. Custom non-standard dynamic split (e.g. 15 quiz + 25 project + 60 final = 100)', async () => {
    const repo = {
      ...mockRepository,
      getSectionMarks: async () => [
        { student_id: 's1', subject_id: 'sub1', exam_id: 'e1', score: 14, max_marks: 15, weight_percentage: 15, is_absent: false },
        { student_id: 's1', subject_id: 'sub1', exam_id: 'e2', score: 24, max_marks: 25, weight_percentage: 25, is_absent: false },
        { student_id: 's1', subject_id: 'sub1', exam_id: 'e3', score: 55, max_marks: 60, weight_percentage: 60, is_absent: false },
      ]
    };

    const service = new ResultService(repo);
    const res = await service.calculateSectionResults({ sectionId: 'sec1' });

    expect(res.rankings[0].isComplete).toBe(true);
    expect(res.rankings[0].totalWeightedScore).toBe(93);
    expect(res.rankings[0].overallGrade).toBe('A+');
    expect(res.rankings[0].status).toBe('PASSED / PROMOTED');
  });
});
