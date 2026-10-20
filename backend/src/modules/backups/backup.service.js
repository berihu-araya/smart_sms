const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BackupService {
  constructor(database, auditService = null) {
    this.database = database;
    this.auditService = auditService;
    this.backupDir = path.join(__dirname, '../../../uploads/backups');

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async listBackups(schoolId = null) {
    let query = `
      SELECT
        sb.id,
        sb.school_id,
        sb.file_name,
        sb.file_size_bytes,
        sb.backup_type,
        sb.status,
        sb.checksum_sha256,
        sb.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS initiated_by_name,
        u.email AS initiated_by_email
      FROM system_backups sb
      LEFT JOIN users u ON u.id = sb.initiated_by
    `;
    const params = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` WHERE sb.school_id = $1`;
    }
    query += ` ORDER BY sb.created_at DESC`;

    const result = await this.database.query(query, params);
    return result.rows;
  }

  async triggerBackup({ schoolId = null, userId = null, backupType = 'MANUAL' } = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `smart_sms_snapshot_${timestamp}.json`;
    const filePath = path.join(this.backupDir, fileName);

    // Initial log entry
    const insertRes = await this.database.query(
      `
      INSERT INTO system_backups (
        school_id, file_name, file_size_bytes, backup_type, status, storage_path, initiated_by
      )
      VALUES ($1, $2, 0, $3, 'IN_PROGRESS', $4, $5)
      RETURNING *
      `,
      [schoolId, fileName, backupType, filePath, userId]
    );
    const backupId = insertRes.rows[0].id;

    try {
      // Gather essential database snapshot tables
      const [
        schoolsRes,
        settingsRes,
        academicYearsRes,
        departmentsRes,
        rolesRes,
        rolePermsRes,
        gradesRes,
        sectionsRes,
        subjectsRes,
      ] = await Promise.all([
        this.database.query(`SELECT * FROM schools WHERE deleted_at IS NULL`),
        this.database.query(`SELECT * FROM settings LIMIT 1`),
        this.database.query(`SELECT * FROM academic_years WHERE deleted_at IS NULL`),
        this.database.query(`SELECT * FROM departments WHERE deleted_at IS NULL`),
        this.database.query(`SELECT * FROM roles WHERE deleted_at IS NULL`),
        this.database.query(`SELECT * FROM role_permissions`),
        this.database.query(`SELECT * FROM grades WHERE deleted_at IS NULL`),
        this.database.query(`SELECT * FROM sections WHERE deleted_at IS NULL`),
        this.database.query(`SELECT * FROM subjects WHERE deleted_at IS NULL`),
      ]);

      const manifest = {
        metadata: {
          system: 'SMART SMS Multi-Tenant Platform',
          version: '1.0.0-PROD',
          generated_at: new Date().toISOString(),
          backup_type: backupType,
          database_name: process.env.DATABASE_NAME || 'smart_sms_dev',
        },
        counts: {
          schools: schoolsRes.rows.length,
          academic_years: academicYearsRes.rows.length,
          departments: departmentsRes.rows.length,
          roles: rolesRes.rows.length,
          grades: gradesRes.rows.length,
          sections: sectionsRes.rows.length,
          subjects: subjectsRes.rows.length,
        },
        data: {
          schools: schoolsRes.rows,
          settings: settingsRes.rows[0] || null,
          academic_years: academicYearsRes.rows,
          departments: departmentsRes.rows,
          roles: rolesRes.rows,
          role_permissions: rolePermsRes.rows,
          grades: gradesRes.rows,
          sections: sectionsRes.rows,
          subjects: subjectsRes.rows,
        },
      };

      const fileContent = JSON.stringify(manifest, null, 2);
      fs.writeFileSync(filePath, fileContent, 'utf8');

      const stats = fs.statSync(filePath);
      const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex');

      // Update backup entry as completed
      const updateRes = await this.database.query(
        `
        UPDATE system_backups
        SET file_size_bytes = $1, status = 'COMPLETED', checksum_sha256 = $2
        WHERE id = $3
        RETURNING *
        `,
        [stats.size, sha256, backupId]
      );

      // Write to audit trail
      if (this.auditService) {
        await this.auditService.log({
          schoolId,
          userId,
          action: 'BACKUP_TRIGGERED',
          resourceType: 'SYSTEM_BACKUP',
          resourceId: backupId,
          newValues: { fileName, fileSize: stats.size, checksum: sha256 },
        }).catch(() => null);
      }

      return updateRes.rows[0];
    } catch (err) {
      console.error('[BackupService.triggerBackup] Error creating backup:', err);
      await this.database.query(
        `
        UPDATE system_backups
        SET status = 'FAILED', error_message = $1
        WHERE id = $2
        `,
        [err.message, backupId]
      );
      throw err;
    }
  }

  async getBackupDownloadInfo(id) {
    const result = await this.database.query(
      `SELECT * FROM system_backups WHERE id = $1 LIMIT 1`,
      [id]
    );
    const backup = result.rows[0];
    if (!backup) {
      const error = new Error('Backup snapshot not found');
      error.status = 404;
      throw error;
    }

    if (!fs.existsSync(backup.storage_path)) {
      const error = new Error('Physical backup file missing from storage');
      error.status = 404;
      throw error;
    }

    return {
      filePath: backup.storage_path,
      fileName: backup.file_name,
    };
  }
}

module.exports = BackupService;
