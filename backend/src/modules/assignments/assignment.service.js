class AssignmentService {
  constructor(assignmentRepository) {
    this.repository = assignmentRepository;
  }

  async resolveUserScope(user) {
    const role = (user?.role || '').toLowerCase().trim();
    const isTeacher = role.includes('teacher') && !role.includes('admin');
    const isStudent = role.includes('student');
    const isParent = role.includes('parent');
    const isAdminOrStaff = role.includes('admin') || role.includes('staff');

    let teacherId = null;
    let studentId = null;
    let childStudentIds = [];

    if (isTeacher) {
      teacherId = await this.repository.findTeacherIdByUserId(user.sub);
    } else if (isStudent) {
      const studentRecord = await this.repository.findStudentIdByUserId(user.sub);
      studentId = studentRecord?.id || null;
    } else if (isParent) {
      const children = await this.repository.findChildStudentIdsByParentUserId(user.sub);
      childStudentIds = children.map((c) => c.id);
    }

    return {
      role,
      isTeacher,
      isStudent,
      isParent,
      isAdminOrStaff,
      teacherId,
      studentId,
      childStudentIds,
    };
  }

  async listAssignments(options = {}) {
    return this.repository.findAll(options);
  }

  async getAssignmentById(id, studentId = null) {
    const assignment = await this.repository.findById(id, studentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }
    return assignment;
  }

  async createAssignment(payload, user, teacherId = null) {
    const data = {
      ...payload,
      schoolId: user.school_id || null,
      createdBy: user.sub,
      teacherId: payload.teacherId || teacherId,
    };

    return this.repository.create(data);
  }

  async updateAssignment(id, payload) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Assignment not found');
    }

    return this.repository.update(id, payload);
  }

  async toggleStatus(id, status) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Assignment not found');
    }

    return this.repository.toggleStatus(id, status);
  }

  async deleteAssignment(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Assignment not found');
    }

    return this.repository.softDelete(id);
  }

  async listSubmissions(assignmentId, filters = {}) {
    const assignment = await this.repository.findById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const submissions = await this.repository.findSubmissionsByAssignment(assignmentId, filters);
    return {
      assignment,
      submissions,
      totalCount: submissions.length,
      submittedCount: submissions.filter((s) => s.submission_status !== 'NOT_SUBMITTED').length,
      gradedCount: submissions.filter((s) => s.submission_status === 'GRADED').length,
    };
  }

  async getMySubmission(assignmentId, studentId) {
    if (!studentId) {
      throw new Error('Student profile not found for this account');
    }

    const assignment = await this.repository.findById(assignmentId, studentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const submission = await this.repository.findStudentSubmission(assignmentId, studentId);
    return {
      assignment,
      submission,
    };
  }

  async submitAssignment(assignmentId, payload, studentId, schoolId = null) {
    if (!studentId) {
      throw new Error('Student profile not found for this account');
    }

    const assignment = await this.repository.findById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (assignment.status === 'CLOSED' || assignment.status === 'ARCHIVED') {
      throw new Error('This assignment is closed and no longer accepting submissions');
    }

    // Check due date
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isPastDue = now > dueDate;

    if (isPastDue && !assignment.allow_late_submissions) {
      throw new Error('Due date has passed and late submissions are not allowed for this assignment');
    }

    const status = payload.isDraft
      ? 'DRAFT'
      : isPastDue
      ? 'LATE'
      : 'SUBMITTED';

    return this.repository.upsertSubmission({
      assignmentId,
      studentId,
      schoolId,
      submissionText: payload.submissionText,
      attachmentUrls: payload.attachmentUrls,
      status,
    });
  }

  async gradeSubmission(submissionId, gradePayload, graderTeacherId = null) {
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const maxMarks = Number(submission.max_marks || 100);
    if (gradePayload.obtainedMarks > maxMarks) {
      throw new Error(`Score cannot exceed maximum marks (${maxMarks})`);
    }

    return this.repository.gradeSubmission(submissionId, {
      obtainedMarks: gradePayload.obtainedMarks,
      feedback: gradePayload.feedback,
      status: gradePayload.status,
      gradedBy: graderTeacherId,
    });
  }

  async getStats(options = {}) {
    return this.repository.getStats(options);
  }
}

module.exports = AssignmentService;
