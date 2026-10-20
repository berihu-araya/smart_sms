const { db } = require('../../config/database');
const AuditService = require('../../services/audit.service');

function getGradeSortValue(value) {
  if (value === null || value === undefined) return Number.MAX_SAFE_INTEGER;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return Number.MAX_SAFE_INTEGER;
  if (['kg', 'kindergarten', 'nursery', 'prep'].includes(normalized)) return 0;
  const match = normalized.match(/(?:grade|class|level)\s*(\d+)/i) || normalized.match(/(\d+)/);
  if (match) return Number(match[1]);
  return Number.MAX_SAFE_INTEGER;
}

class StudentPromotionService {
  constructor(database = db) {
    this.db = database;
    this.auditService = new AuditService(database);
  }

  mapScoreToLetter(score, gradingScales = []) {
    const num = Number(score);
    if (isNaN(num)) return null;

    if (gradingScales && gradingScales.length > 0) {
      for (const scale of gradingScales) {
        if (num >= Number(scale.min_score) && num <= Number(scale.max_score)) {
          return scale.grade_letter;
        }
      }
    }

    if (num >= 80) return 'A';
    if (num >= 70) return 'B';
    if (num >= 60) return 'C';
    if (num >= 50) return 'D';
    return 'F';
  }

  async getGradingScales() {
    const res = await this.db.query(
      `SELECT grade_letter, min_score, max_score, grade_point, description 
       FROM grading_scales 
       ORDER BY min_score DESC`
    );
    return res.rows;
  }

  async previewPromotions({ schoolId, sourceAcademicYearId, gradeId, sectionId = null }) {
    if (!sourceAcademicYearId) {
      const err = new Error('sourceAcademicYearId is required');
      err.status = 400;
      throw err;
    }
    if (!gradeId) {
      const err = new Error('gradeId is required');
      err.status = 400;
      throw err;
    }

    // 1. Fetch Source Academic Year
    const yearRes = await this.db.query(
      `SELECT id, name, start_date, end_date, is_active FROM academic_years WHERE id = $1 AND deleted_at IS NULL`,
      [sourceAcademicYearId]
    );
    if (yearRes.rows.length === 0) {
      const err = new Error('Source academic year not found');
      err.status = 404;
      throw err;
    }
    const sourceAcademicYear = yearRes.rows[0];

    // 2. Fetch all grades to calculate progression ladder
    const gradesRes = await this.db.query(
      `SELECT id, name, description FROM grades WHERE deleted_at IS NULL ORDER BY name ASC`
    );
    const sortedGrades = [...gradesRes.rows].sort((a, b) => {
      const diff = getGradeSortValue(a.name) - getGradeSortValue(b.name);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

    const currentGradeIndex = sortedGrades.findIndex((g) => g.id === gradeId);
    if (currentGradeIndex === -1) {
      const err = new Error('Current grade not found');
      err.status = 404;
      throw err;
    }
    const currentGrade = sortedGrades[currentGradeIndex];
    const nextGrade = currentGradeIndex < sortedGrades.length - 1 ? sortedGrades[currentGradeIndex + 1] : null;

    // 3. Sections in target (next) grade and current grade
    const targetSectionsRes = nextGrade
      ? await this.db.query(
          `SELECT id, name, room_number, capacity FROM sections WHERE grade_id = $1 AND deleted_at IS NULL ORDER BY name ASC`,
          [nextGrade.id]
        )
      : { rows: [] };
    const nextSections = targetSectionsRes.rows;

    // Auto-create a default Section A for the next grade if none exists yet
    if (nextGrade && nextSections.length === 0) {
      const createdSec = await this.db.query(
        `INSERT INTO sections (name, grade_id, room_number, capacity, created_at, updated_at)
         VALUES ('Section A', $1, '101', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name, room_number, capacity`,
        [nextGrade.id]
      );
      if (createdSec.rows.length > 0) {
        nextSections.push(createdSec.rows[0]);
      }
    }

    const currentSectionsRes = await this.db.query(
      `SELECT id, name, room_number, capacity FROM sections WHERE grade_id = $1 AND deleted_at IS NULL ORDER BY name ASC`,
      [currentGrade.id]
    );
    const currentSections = currentSectionsRes.rows;

    // 4. Fetch students currently in this grade (and section if filtered)
    const studentConditions = [
      `g.id = $1`,
      `s.deleted_at IS NULL`,
      `LOWER(s.status) = 'active'`,
    ];
    const studentParams = [gradeId];

    if (sectionId) {
      studentConditions.push(`s.section_id = $${studentParams.length + 1}`);
      studentParams.push(sectionId);
    }
    if (schoolId) {
      studentConditions.push(`(s.school_id = $${studentParams.length + 1} OR s.school_id IS NULL)`);
      studentParams.push(schoolId);
    }

    const studentsQuery = `
      SELECT 
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        s.photo AS photo_url,
        s.status,
        s.section_id,
        sec.name AS section_name,
        g.id AS grade_id,
        g.name AS grade_name
      FROM students s
      JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
      JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
      WHERE ${studentConditions.join(' AND ')}
      ORDER BY sec.name ASC, s.first_name ASC, s.last_name ASC
    `;
    const studentsRes = await this.db.query(studentsQuery, studentParams);
    const students = studentsRes.rows;

    if (students.length === 0) {
      return {
        sourceAcademicYear,
        currentGrade,
        nextGrade,
        nextSections,
        currentSections,
        allGrades: sortedGrades,
        candidates: [],
        summary: {
          totalStudents: 0,
          passCount: 0,
          remedialCount: 0,
          graduationCount: 0,
        },
      };
    }

    const studentIds = students.map((s) => s.id);

    // 5. Query marks in the source academic year
    const marksRes = await this.db.query(
      `SELECT 
         m.student_id,
         ROUND(AVG(CASE WHEN m.is_absent THEN 0 ELSE (m.score / NULLIF(e.max_marks, 0)) * 100 END), 2) AS calculated_avg,
         COUNT(m.id) AS marks_count
       FROM marks m
       JOIN exams e ON e.id = m.exam_id
       WHERE e.academic_year_id = $1
         AND e.deleted_at IS NULL
         AND m.student_id = ANY($2::uuid[])
       GROUP BY m.student_id`,
      [sourceAcademicYearId, studentIds]
    );

    const marksMap = {};
    for (const row of marksRes.rows) {
      marksMap[row.student_id] = {
        average: Number(row.calculated_avg),
        count: Number(row.marks_count),
      };
    }

    // 6. Query existing promotion history for sourceAcademicYearId
    const historyRes = await this.db.query(
      `SELECT student_id, promotion_status, promoted_to_academic_year_id, promoted_to_grade_id, promoted_to_section_id, promoted_at, remarks
       FROM student_academic_history
       WHERE academic_year_id = $1 AND student_id = ANY($2::uuid[])`,
      [sourceAcademicYearId, studentIds]
    );
    const historyMap = {};
    for (const h of historyRes.rows) {
      historyMap[h.student_id] = h;
    }

    // 7. Grading scales
    const gradingScales = await this.getGradingScales();

    let passCount = 0;
    let remedialCount = 0;
    let graduationCount = 0;

    const candidates = students.map((s) => {
      const markData = marksMap[s.id];
      const hasMarks = markData && markData.count > 0;
      const finalAverage = hasMarks ? markData.average : null;
      const finalGradeLetter = hasMarks ? this.mapScoreToLetter(finalAverage, gradingScales) : null;
      const existingHistory = historyMap[s.id] || null;

      let suggestedAction = 'PROMOTED';
      if (!nextGrade) {
        suggestedAction = 'GRADUATED';
        graduationCount += 1;
      } else if (hasMarks && finalAverage < 50) {
        suggestedAction = 'RETAINED';
        remedialCount += 1;
      } else {
        suggestedAction = 'PROMOTED';
        passCount += 1;
      }

      // Pre-select section: match letter/name if possible or default to first
      let suggestedSectionId = null;
      if (suggestedAction === 'PROMOTED' && nextSections.length > 0) {
        const matchingSec = nextSections.find(
          (ns) => ns.name.trim().toLowerCase() === s.section_name.trim().toLowerCase()
        );
        suggestedSectionId = matchingSec ? matchingSec.id : nextSections[0].id;
      } else if (suggestedAction === 'RETAINED') {
        suggestedSectionId = s.section_id;
      }

      return {
        studentId: s.id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.last_name}`,
        firstName: s.first_name,
        lastName: s.last_name,
        photoUrl: s.photo_url,
        gender: s.gender,
        currentSectionId: s.section_id,
        currentSectionName: s.section_name,
        currentGradeId: s.grade_id,
        currentGradeName: s.grade_name,
        finalAverage,
        finalGradeLetter,
        marksCount: hasMarks ? markData.count : 0,
        suggestedAction,
        suggestedGradeId: suggestedAction === 'PROMOTED' ? (nextGrade ? nextGrade.id : null) : (suggestedAction === 'RETAINED' ? currentGrade.id : null),
        suggestedSectionId,
        alreadyProcessed: Boolean(existingHistory),
        existingHistory,
      };
    });

    return {
      sourceAcademicYear,
      currentGrade,
      nextGrade,
      nextSections,
      currentSections,
      allGrades: sortedGrades,
      candidates,
      summary: {
        totalStudents: students.length,
        passCount,
        remedialCount,
        graduationCount,
      },
    };
  }

  async executeBatchPromotion({ schoolId, userId, sourceAcademicYearId, targetAcademicYearId, promotions }) {
    if (!sourceAcademicYearId || !targetAcademicYearId) {
      const err = new Error('Both sourceAcademicYearId and targetAcademicYearId are required');
      err.status = 400;
      throw err;
    }

    if (!Array.isArray(promotions) || promotions.length === 0) {
      const err = new Error('Promotions array cannot be empty');
      err.status = 400;
      throw err;
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      let promotedCount = 0;
      let retainedCount = 0;
      let graduatedCount = 0;
      let transferredCount = 0;
      let withdrawnCount = 0;

      // Cache auto-resolved/created sections for target grades
      const targetSectionCache = {};

      for (const item of promotions) {
        const {
          studentId,
          currentGradeId,
          currentSectionId,
          rollNumber = null,
          finalAverage = null,
          finalGradeLetter = null,
          action = 'PROMOTED', // 'PROMOTED', 'RETAINED', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'
          targetGradeId = null,
          targetSectionId = null,
          remarks = null,
        } = item;

        if (!studentId) continue;

        let effectiveTargetGradeId = targetGradeId;
        let effectiveTargetSectionId = targetSectionId;

        if (action === 'PROMOTED') {
          // If targetGradeId not provided, look up natural next grade from currentGradeId
          if (!effectiveTargetGradeId && currentGradeId) {
            const gradesRes = await client.query(
              `SELECT id, name FROM grades WHERE deleted_at IS NULL ORDER BY name ASC`
            );
            const sorted = [...gradesRes.rows].sort((a, b) => {
              const diff = getGradeSortValue(a.name) - getGradeSortValue(b.name);
              return diff !== 0 ? diff : a.name.localeCompare(b.name);
            });
            const idx = sorted.findIndex((g) => g.id === currentGradeId);
            if (idx !== -1 && idx < sorted.length - 1) {
              effectiveTargetGradeId = sorted[idx + 1].id;
            }
          }

          if (effectiveTargetGradeId) {
            // Check if provided targetSectionId actually belongs to effectiveTargetGradeId
            let validSection = null;
            if (effectiveTargetSectionId) {
              const checkSec = await client.query(
                `SELECT id FROM sections WHERE id = $1 AND grade_id = $2 AND deleted_at IS NULL LIMIT 1`,
                [effectiveTargetSectionId, effectiveTargetGradeId]
              );
              if (checkSec.rows.length > 0) {
                validSection = checkSec.rows[0].id;
              }
            }

            // If not valid or not provided, find or create section for target grade
            if (!validSection) {
              if (targetSectionCache[effectiveTargetGradeId]) {
                validSection = targetSectionCache[effectiveTargetGradeId];
              } else {
                const secRes = await client.query(
                  `SELECT id FROM sections WHERE grade_id = $1 AND deleted_at IS NULL ORDER BY name ASC LIMIT 1`,
                  [effectiveTargetGradeId]
                );
                if (secRes.rows.length > 0) {
                  validSection = secRes.rows[0].id;
                } else {
                  // Grade has no sections yet! Auto-create a default section for the target grade
                  const newSec = await client.query(
                    `INSERT INTO sections (name, grade_id, room_number, capacity, created_at, updated_at)
                     VALUES ('Section A', $1, '101', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                     RETURNING id`,
                    [effectiveTargetGradeId]
                  );
                  validSection = newSec.rows[0].id;
                }
                targetSectionCache[effectiveTargetGradeId] = validSection;
              }
            }
            effectiveTargetSectionId = validSection;
          }
        } else if (action === 'RETAINED') {
          effectiveTargetGradeId = currentGradeId;
          effectiveTargetSectionId = targetSectionId || currentSectionId;
        } else {
          // GRADUATED, TRANSFERRED, WITHDRAWN
          effectiveTargetGradeId = null;
          effectiveTargetSectionId = null;
        }

        // 1. Snapshot into student_academic_history (Upsert)
        await client.query(
          `
          INSERT INTO student_academic_history (
            school_id, student_id, academic_year_id, grade_id, section_id,
            roll_number, final_average, final_grade_letter, promotion_status,
            promoted_to_academic_year_id, promoted_to_grade_id, promoted_to_section_id,
            promoted_by, promoted_at, remarks, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            grade_id = EXCLUDED.grade_id,
            section_id = EXCLUDED.section_id,
            roll_number = EXCLUDED.roll_number,
            final_average = EXCLUDED.final_average,
            final_grade_letter = EXCLUDED.final_grade_letter,
            promotion_status = EXCLUDED.promotion_status,
            promoted_to_academic_year_id = EXCLUDED.promoted_to_academic_year_id,
            promoted_to_grade_id = EXCLUDED.promoted_to_grade_id,
            promoted_to_section_id = EXCLUDED.promoted_to_section_id,
            promoted_by = EXCLUDED.promoted_by,
            promoted_at = CURRENT_TIMESTAMP,
            remarks = EXCLUDED.remarks,
            updated_at = CURRENT_TIMESTAMP
          `,
          [
            schoolId || null,
            studentId,
            sourceAcademicYearId,
            currentGradeId || null,
            currentSectionId || null,
            rollNumber,
            finalAverage !== null ? Number(finalAverage) : null,
            finalGradeLetter,
            action,
            targetAcademicYearId,
            effectiveTargetGradeId,
            effectiveTargetSectionId,
            userId || null,
            remarks || null,
          ]
        );

        // 2. Update Student master record state
        if (action === 'PROMOTED' || action === 'RETAINED') {
          await client.query(
            `UPDATE students 
             SET section_id = $1, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [effectiveTargetSectionId, studentId]
          );

          if (action === 'PROMOTED') promotedCount += 1;
          else retainedCount += 1;
        } else if (action === 'GRADUATED') {
          await client.query(
            `UPDATE students 
             SET status = 'GRADUATED', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [studentId]
          );
          graduatedCount += 1;
        } else if (action === 'TRANSFERRED') {
          await client.query(
            `UPDATE students 
             SET status = 'TRANSFERRED', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [studentId]
          );
          transferredCount += 1;
        } else if (action === 'WITHDRAWN') {
          await client.query(
            `UPDATE students 
             SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [studentId]
          );
          withdrawnCount += 1;
        }
      }

      await client.query('COMMIT');

      // Audit Log
      try {
        await this.auditService.log({
          schoolId,
          userId,
          action: 'STUDENT_BATCH_PROMOTION',
          resourceType: 'PROMOTIONS',
          resourceId: targetAcademicYearId,
          newValues: {
            sourceAcademicYearId,
            targetAcademicYearId,
            totalProcessed: promotions.length,
            promoted: promotedCount,
            retained: retainedCount,
            graduated: graduatedCount,
            transferred: transferredCount,
            withdrawn: withdrawnCount,
          },
        });
      } catch (auditErr) {
        console.error('Promotion audit log failed non-critically:', auditErr);
      }

      return {
        success: true,
        summary: {
          totalProcessed: promotions.length,
          promoted: promotedCount,
          retained: retainedCount,
          graduated: graduatedCount,
          transferred: transferredCount,
          withdrawn: withdrawnCount,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getStudentAcademicHistory(studentId) {
    if (!studentId) {
      const err = new Error('Student ID is required');
      err.status = 400;
      throw err;
    }

    const query = `
      SELECT
        h.id,
        h.student_id,
        h.academic_year_id,
        ay.name AS academic_year_name,
        ay.start_date AS academic_year_start,
        ay.end_date AS academic_year_end,
        h.grade_id,
        g.name AS grade_name,
        h.section_id,
        sec.name AS section_name,
        h.roll_number,
        h.final_average,
        h.final_grade_letter,
        h.promotion_status,
        h.promoted_to_academic_year_id,
        target_ay.name AS promoted_to_academic_year_name,
        h.promoted_to_grade_id,
        target_g.name AS promoted_to_grade_name,
        h.promoted_to_section_id,
        target_sec.name AS promoted_to_section_name,
        h.promoted_at,
        h.remarks,
        CONCAT_WS(' ', u.first_name, u.last_name) AS promoted_by_name
      FROM student_academic_history h
      JOIN academic_years ay ON ay.id = h.academic_year_id
      LEFT JOIN grades g ON g.id = h.grade_id
      LEFT JOIN sections sec ON sec.id = h.section_id
      LEFT JOIN academic_years target_ay ON target_ay.id = h.promoted_to_academic_year_id
      LEFT JOIN grades target_g ON target_g.id = h.promoted_to_grade_id
      LEFT JOIN sections target_sec ON target_sec.id = h.promoted_to_section_id
      LEFT JOIN users u ON u.id = h.promoted_by
      WHERE h.student_id = $1
      ORDER BY ay.start_date ASC, h.promoted_at ASC
    `;

    const res = await this.db.query(query, [studentId]);
    return res.rows;
  }

  async getStudentCumulativeTranscript(studentId) {
    if (!studentId) {
      const err = new Error('Student ID is required');
      err.status = 400;
      throw err;
    }

    // 1. Fetch Student master details
    const studentRes = await this.db.query(
      `SELECT
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        s.date_of_birth,
        s.admission_date,
        s.photo AS photo_url,
        s.status,
        s.email,
        s.phone,
        s.address,
        sec.name AS current_section_name,
        g.name AS current_grade_name,
        p.full_name AS parent_name,
        p.phone AS parent_phone,
        p.email AS parent_email,
        sch.name AS school_name,
        sch.address AS school_address,
        sch.phone AS school_phone,
        sch.email AS school_email,
        sch.principal_name
      FROM students s
      LEFT JOIN sections sec ON sec.id = s.section_id AND sec.deleted_at IS NULL
      LEFT JOIN grades g ON g.id = sec.grade_id AND g.deleted_at IS NULL
      LEFT JOIN parents p ON p.id = s.parent_id
      LEFT JOIN schools sch ON sch.id = s.school_id AND sch.deleted_at IS NULL
      WHERE s.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      const err = new Error('Student not found');
      err.status = 404;
      throw err;
    }

    const student = studentRes.rows[0];

    // 2. Fetch Multi-Year Academic History Snapshots
    const historyList = await this.getStudentAcademicHistory(studentId);

    // 3. Grading scales for mapping
    const gradingScales = await this.getGradingScales();

    // 4. For each academic year in history, fetch subject breakdown
    const enrichedHistory = await Promise.all(
      historyList.map(async (h) => {
        const subRes = await this.db.query(
          `SELECT
            sub.id AS subject_id,
            sub.subject_name,
            sub.subject_code,
            ROUND(AVG(CASE WHEN m.is_absent THEN 0 ELSE (m.score / NULLIF(e.max_marks, 0)) * 100 END), 2) AS score,
            COUNT(m.id) AS marks_count
          FROM marks m
          JOIN exams e ON e.id = m.exam_id
          JOIN subjects sub ON sub.id = m.subject_id
          WHERE e.academic_year_id = $1
            AND m.student_id = $2
            AND e.deleted_at IS NULL
          GROUP BY sub.id, sub.subject_name, sub.subject_code
          ORDER BY sub.subject_name ASC`,
          [h.academic_year_id, studentId]
        );

        const subjects = subRes.rows.map((row) => ({
          subjectId: row.subject_id,
          subjectName: row.subject_name,
          subjectCode: row.subject_code,
          score: Number(row.score),
          letterGrade: this.mapScoreToLetter(row.score, gradingScales),
        }));

        return {
          ...h,
          is_current: false,
          subjects,
        };
      })
    );

    // 4b. Check if the active/current academic year is not yet archived and append it
    const activeYearRes = await this.db.query(
      `SELECT id, name, start_date, end_date FROM academic_years WHERE (school_id = $1 OR school_id IS NULL) AND is_active = true ORDER BY start_date DESC LIMIT 1`,
      [student.school_id || null]
    );

    if (activeYearRes.rows.length > 0) {
      const activeYear = activeYearRes.rows[0];
      const alreadyRecorded = enrichedHistory.some((h) => h.academic_year_id === activeYear.id);
      if (!alreadyRecorded && (student.current_grade_name || student.status)) {
        const subRes = await this.db.query(
          `SELECT
            sub.id AS subject_id,
            sub.subject_name,
            sub.subject_code,
            ROUND(AVG(CASE WHEN m.is_absent THEN 0 ELSE (m.score / NULLIF(e.max_marks, 0)) * 100 END), 2) AS score,
            COUNT(m.id) AS marks_count
          FROM marks m
          JOIN exams e ON e.id = m.exam_id
          JOIN subjects sub ON sub.id = m.subject_id
          WHERE e.academic_year_id = $1
            AND m.student_id = $2
            AND e.deleted_at IS NULL
          GROUP BY sub.id, sub.subject_name, sub.subject_code
          ORDER BY sub.subject_name ASC`,
          [activeYear.id, studentId]
        );

        const currentSubjects = subRes.rows.map((row) => ({
          subjectId: row.subject_id,
          subjectName: row.subject_name,
          subjectCode: row.subject_code,
          score: Number(row.score),
          letterGrade: this.mapScoreToLetter(row.score, gradingScales),
        }));

        const currentAvg = currentSubjects.length > 0
          ? Math.round((currentSubjects.reduce((acc, s) => acc + s.score, 0) / currentSubjects.length) * 10) / 10
          : null;

        enrichedHistory.push({
          id: 'current-enrollment',
          student_id: studentId,
          academic_year_id: activeYear.id,
          academic_year_name: activeYear.name,
          academic_year_start: activeYear.start_date,
          academic_year_end: activeYear.end_date,
          grade_name: student.current_grade_name || 'Enrolled Grade',
          section_name: student.current_section_name || 'Active',
          roll_number: null,
          final_average: currentAvg,
          final_grade_letter: currentAvg !== null ? this.mapScoreToLetter(currentAvg, gradingScales) : null,
          promotion_status: 'CURRENT_ENROLLED',
          is_current: true,
          subjects: currentSubjects,
        });
      }
    }

    // 5. Calculate overall cumulative stats across the entire school career
    const validAverages = enrichedHistory
      .filter((h) => h.final_average !== null && !isNaN(Number(h.final_average)))
      .map((h) => Number(h.final_average));

    const careerAverage = validAverages.length > 0
      ? Math.round((validAverages.reduce((acc, v) => acc + v, 0) / validAverages.length) * 10) / 10
      : null;

    const careerLetter = careerAverage !== null ? this.mapScoreToLetter(careerAverage, gradingScales) : '—';

    return {
      student,
      careerStats: {
        totalYearsRecorded: enrichedHistory.length,
        careerAverage,
        careerLetter,
        startingGrade: enrichedHistory.length > 0 ? enrichedHistory[0].grade_name : student.current_grade_name,
        latestGrade: enrichedHistory.length > 0 ? enrichedHistory[enrichedHistory.length - 1].grade_name : student.current_grade_name,
        currentStatus: student.status,
      },
      academicHistory: enrichedHistory,
    };
  }
}

module.exports = StudentPromotionService;

