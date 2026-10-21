/**
 * Academic Year Rollover & Lifecycle Service
 * Handles transactional cloning of curriculum, teacher assignments, and active session promotion.
 */
class AcademicYearRolloverService {
  constructor(database) {
    this.database = database;
  }

  /**
   * Preview what records exist in source year and will be migrated to target year
   */
  async getRolloverPreview({ sourceAcademicYearId, targetAcademicYearId }) {
    if (!sourceAcademicYearId || !targetAcademicYearId) {
      throw new Error('Both sourceAcademicYearId and targetAcademicYearId are required');
    }
    if (sourceAcademicYearId === targetAcademicYearId) {
      throw new Error('Source and target academic years cannot be the same');
    }

    const sourceRes = await this.database.query(
      `SELECT id, name, start_date, end_date, is_active, status FROM academic_years WHERE id = $1 AND deleted_at IS NULL`,
      [sourceAcademicYearId]
    );
    const targetRes = await this.database.query(
      `SELECT id, name, start_date, end_date, is_active, status FROM academic_years WHERE id = $1 AND deleted_at IS NULL`,
      [targetAcademicYearId]
    );

    if (sourceRes.rows.length === 0) throw new Error('Source academic year not found');
    if (targetRes.rows.length === 0) throw new Error('Target academic year not found');

    const sourceYear = sourceRes.rows[0];
    const targetYear = targetRes.rows[0];

    // Count source grade subjects
    const gsCountRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM grade_subjects WHERE academic_year_id = $1 AND deleted_at IS NULL`,
      [sourceAcademicYearId]
    );

    // Count target existing grade subjects
    const targetGsCountRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM grade_subjects WHERE academic_year_id = $1 AND deleted_at IS NULL`,
      [targetAcademicYearId]
    );

    // Count source teacher subjects
    const tsCountRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM teacher_subjects WHERE academic_year_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE'`,
      [sourceAcademicYearId]
    );

    // Count target existing teacher subjects
    const targetTsCountRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM teacher_subjects WHERE academic_year_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE'`,
      [targetAcademicYearId]
    );

    // Count source class teachers
    const ctCountRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM class_teachers WHERE academic_year_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE'`,
      [sourceAcademicYearId]
    );

    // Count target existing class teachers
    const targetCtCountRes = await this.database.query(
      `SELECT COUNT(*)::int AS count FROM class_teachers WHERE academic_year_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE'`,
      [targetAcademicYearId]
    );

    return {
      sourceYear,
      targetYear,
      summary: {
        sourceGradeSubjectsCount: gsCountRes.rows[0].count,
        targetExistingGradeSubjectsCount: targetGsCountRes.rows[0].count,
        sourceTeacherSubjectsCount: tsCountRes.rows[0].count,
        targetExistingTeacherSubjectsCount: targetTsCountRes.rows[0].count,
        sourceClassTeachersCount: ctCountRes.rows[0].count,
        targetExistingClassTeachersCount: targetCtCountRes.rows[0].count,
      },
    };
  }

  /**
   * Execute transactional rollover and cloning
   */
  async executeRollover({
    sourceAcademicYearId,
    targetAcademicYearId,
    cloneGradeSubjects = true,
    cloneTeacherAssignments = true,
    cloneClassTeachers = true,
    activateTargetYear = true,
    closeSourceYear = true,
  }) {
    if (!sourceAcademicYearId || !targetAcademicYearId) {
      throw new Error('Both sourceAcademicYearId and targetAcademicYearId are required');
    }
    if (sourceAcademicYearId === targetAcademicYearId) {
      throw new Error('Source and target academic years cannot be the same');
    }

    const client = await this.database.connect();

    try {
      await client.query('BEGIN');

      // 1. Verify existence of both academic years
      const sRes = await client.query(
        `SELECT id, name, is_active, start_date, end_date FROM academic_years WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [sourceAcademicYearId]
      );
      const tRes = await client.query(
        `SELECT id, name, is_active, start_date, end_date FROM academic_years WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [targetAcademicYearId]
      );

      if (sRes.rows.length === 0) throw new Error('Source academic year does not exist');
      if (tRes.rows.length === 0) throw new Error('Target academic year does not exist');

      const sourceYear = sRes.rows[0];
      const targetYear = tRes.rows[0];

      let clonedGradeSubjectsCount = 0;
      let clonedTeacherSubjectsCount = 0;
      let clonedClassTeachersCount = 0;

      // 2. Clone Grade Subjects
      if (cloneGradeSubjects) {
        const gsInsertRes = await client.query(
          `
          INSERT INTO grade_subjects (
            grade_id,
            subject_id,
            academic_year_id,
            is_compulsory,
            weekly_periods,
            total_marks,
            pass_marks,
            display_order,
            status,
            created_at,
            updated_at
          )
          SELECT
            gs.grade_id,
            gs.subject_id,
            $2::uuid AS academic_year_id,
            gs.is_compulsory,
            gs.weekly_periods,
            gs.total_marks,
            gs.pass_marks,
            gs.display_order,
            'ACTIVE',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          FROM grade_subjects gs
          WHERE gs.academic_year_id = $1
            AND gs.deleted_at IS NULL
          ON CONFLICT (academic_year_id, grade_id, subject_id) DO NOTHING
          RETURNING id
          `,
          [sourceAcademicYearId, targetAcademicYearId]
        );
        clonedGradeSubjectsCount = gsInsertRes?.rows?.length ?? gsInsertRes?.rowCount ?? 0;
      }

      // 3. Clone Teacher Subject Assignments
      if (cloneTeacherAssignments) {
        const tsInsertRes = await client.query(
          `
          INSERT INTO teacher_subjects (
            teacher_id,
            subject_id,
            grade_id,
            section_id,
            academic_year_id,
            start_date,
            end_date,
            status,
            created_at,
            updated_at
          )
          SELECT
            ts.teacher_id,
            ts.subject_id,
            ts.grade_id,
            ts.section_id,
            $2::uuid AS academic_year_id,
            $3::date AS start_date,
            $4::date AS end_date,
            'ACTIVE',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          FROM teacher_subjects ts
          WHERE ts.academic_year_id = $1
            AND ts.deleted_at IS NULL
            AND ts.status = 'ACTIVE'
          ON CONFLICT (teacher_id, subject_id, grade_id, section_id, academic_year_id) DO NOTHING
          RETURNING id
          `,
          [sourceAcademicYearId, targetAcademicYearId, targetYear.start_date, targetYear.end_date]
        );
        clonedTeacherSubjectsCount = tsInsertRes?.rows?.length ?? tsInsertRes?.rowCount ?? 0;
      }

      // 4. Clone Class Teacher Assignments
      if (cloneClassTeachers) {
        const ctRows = await client.query(
          `
          SELECT ct.teacher_id, ct.section_id
          FROM class_teachers ct
          WHERE ct.academic_year_id = $1
            AND ct.deleted_at IS NULL
            AND ct.status = 'ACTIVE'
          `,
          [sourceAcademicYearId]
        );

        for (const row of ctRows.rows) {
          // Check if section or teacher already has an active class teacher assignment in target year
          const existing = await client.query(
            `
            SELECT 1 FROM class_teachers
            WHERE academic_year_id = $1
              AND (section_id = $2 OR teacher_id = $3)
              AND status = 'ACTIVE'
              AND deleted_at IS NULL
            LIMIT 1
            `,
            [targetAcademicYearId, row.section_id, row.teacher_id]
          );

          if (existing.rows.length === 0) {
            await client.query(
              `
              INSERT INTO class_teachers (
                teacher_id,
                section_id,
                academic_year_id,
                start_date,
                end_date,
                status,
                created_at,
                updated_at
              )
              VALUES ($1, $2, $3, $4, $5, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `,
              [row.teacher_id, row.section_id, targetAcademicYearId, targetYear.start_date, targetYear.end_date]
            );
            clonedClassTeachersCount++;
          }
        }
      }

      // 5. Close Source Year if requested
      if (closeSourceYear) {
        await client.query(
          `
          UPDATE academic_years
          SET is_active = false,
              status = 'INACTIVE',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [sourceAcademicYearId]
        );
      }

      // 6. Activate Target Year if requested
      if (activateTargetYear) {
        await client.query(
          `
          UPDATE academic_years
          SET is_active = (id = $1),
              status = CASE WHEN id = $1 THEN 'ACTIVE' ELSE 'INACTIVE' END,
              updated_at = CURRENT_TIMESTAMP
          WHERE deleted_at IS NULL
          `,
          [targetAcademicYearId]
        );

        // Update settings table
        await client.query(
          `
          UPDATE settings
          SET active_academic_year_id = $1,
              updated_at = CURRENT_TIMESTAMP
          `,
          [targetAcademicYearId]
        ).catch(() => {});
      }

      await client.query('COMMIT');

      return {
        success: true,
        sourceYear: sourceYear.name,
        targetYear: targetYear.name,
        targetActivated: Boolean(activateTargetYear),
        sourceClosed: Boolean(closeSourceYear),
        stats: {
          clonedGradeSubjects: clonedGradeSubjectsCount,
          clonedTeacherAssignments: clonedTeacherSubjectsCount,
          clonedClassTeachers: clonedClassTeachersCount,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AcademicYearRolloverService;
