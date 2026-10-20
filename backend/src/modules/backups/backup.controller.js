class BackupController {
  constructor(backupService) {
    this.backupService = backupService;
  }

  async listBackups(req, res, next) {
    try {
      const schoolId = req.user?.school_id;
      const data = await this.backupService.listBackups(schoolId);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async triggerBackup(req, res, next) {
    try {
      const schoolId = req.user?.school_id;
      const userId = req.user?.id;
      const { backupType = 'MANUAL' } = req.body;

      const backup = await this.backupService.triggerBackup({ schoolId, userId, backupType });
      res.status(201).json({
        success: true,
        message: 'Database backup snapshot created successfully',
        data: backup,
      });
    } catch (err) {
      next(err);
    }
  }

  async downloadBackup(req, res, next) {
    try {
      const { id } = req.params;
      const { filePath, fileName } = await this.backupService.getBackupDownloadInfo(id);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.download(filePath, fileName);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = BackupController;
